import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const { Pool } = pg;

// Types
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ rowCount: number }>;
  transaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T>;
  isPostgres(): boolean;
  // Raw handles if needed
  getPgPool(): pg.Pool | null;
  getSqliteDb(): DatabaseSync | null;
}

// Global singletons across Next.js App Router and hot-reloads
interface GlobalDbHolder {
  _pgPool?: pg.Pool | null;
  _sqliteDb?: DatabaseSync | null;
  _pgInitialized?: boolean;
}

const g = global as unknown as GlobalDbHolder;

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'talvyn_assess.db');

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// ----------------------------------------------------
// PostgreSQL Pool Initializer (Singleton)
// ----------------------------------------------------
function getPgPool(): pg.Pool {
  if (g._pgPool) return g._pgPool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: DATABASE_URL environment variable is mandatory in production. SQLite fallback is strictly prohibited in production.'
      );
    }
    throw new Error('DATABASE_URL is not set.');
  }

  const poolMax = parseInt(process.env.PG_POOL_MAX || '20', 10);

  const pool = new Pool({
    connectionString: databaseUrl,
    max: poolMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl:
      process.env.PG_SSL === 'false'
        ? false
        : databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL Pool Error]', err);
  });

  g._pgPool = pool;
  return pool;
}

// ----------------------------------------------------
// SQLite Initializer (Offline / Local Dev Fallback)
// ----------------------------------------------------
function getSqliteDb(): DatabaseSync {
  if (g._sqliteDb) return g._sqliteDb;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL: Attempted to initialize SQLite in production. DATABASE_URL must be configured.'
    );
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);

  initSqliteSchema(db);
  seedSqliteInitialData(db);

  g._sqliteDb = db;
  return db;
}

// ----------------------------------------------------
// Unified Database Client Implementation
// ----------------------------------------------------
class PostgresClient implements DbClient {
  private pool: pg.Pool;

  constructor(pool: pg.Pool) {
    this.pool = pool;
  }

  isPostgres(): boolean {
    return true;
  }

  getPgPool(): pg.Pool {
    return this.pool;
  }

  getSqliteDb(): DatabaseSync | null {
    return null;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const res = await this.pool.query(sql, params);
    return {
      rows: res.rows as T[],
      rowCount: res.rowCount || 0,
    };
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const res = await this.query<T>(sql, params);
    return res.rows.length > 0 ? res.rows[0] : null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ rowCount: number }> {
    const res = await this.pool.query(sql, params);
    return { rowCount: res.rowCount || 0 };
  }

  async transaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txClient: DbClient = {
        isPostgres: () => true,
        getPgPool: () => this.pool,
        getSqliteDb: () => null,
        query: async <R = any>(sql: string, params: any[] = []) => {
          const res = await client.query(sql, params);
          return { rows: res.rows as R[], rowCount: res.rowCount || 0 };
        },
        queryOne: async <R = any>(sql: string, params: any[] = []) => {
          const res = await client.query(sql, params);
          return res.rows.length > 0 ? (res.rows[0] as R) : null;
        },
        execute: async (sql: string, params: any[] = []) => {
          const res = await client.query(sql, params);
          return { rowCount: res.rowCount || 0 };
        },
        transaction: async () => {
          throw new Error('Nested transactions are not supported.');
        },
      };

      const result = await fn(txClient);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

class SqliteClient implements DbClient {
  private db: DatabaseSync;
  private txLock: Promise<void> = Promise.resolve();

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  isPostgres(): boolean {
    return false;
  }

  getPgPool(): pg.Pool | null {
    return null;
  }

  getSqliteDb(): DatabaseSync {
    return this.db;
  }

  // Translates $1, $2, $3 to ? positional syntax for SQLite compatibility,
  // correctly mapping repeated or non-sequential parameter references.
  private translateSql(sql: string, params: any[]): { sql: string; params: any[] } {
    if (!/\$\d+/.test(sql)) {
      return { sql, params: [...params] };
    }

    const outParams: any[] = [];
    const outSql = sql.replace(/\$(\d+)/g, (_, num) => {
      const idx = parseInt(num, 10) - 1;
      outParams.push(params[idx]);
      return '?';
    });

    return { sql: outSql, params: outParams };
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const { sql: translatedSql, params: translatedParams } = this.translateSql(sql, params);
    const stmt = this.db.prepare(translatedSql);
    const rows = (stmt.all(...translatedParams) as unknown) as T[];
    return {
      rows,
      rowCount: rows.length,
    };
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const { sql: translatedSql, params: translatedParams } = this.translateSql(sql, params);
    const stmt = this.db.prepare(translatedSql);
    const row = (stmt.get(...translatedParams) as unknown) as T | undefined;
    return row !== undefined ? row : null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ rowCount: number }> {
    const { sql: translatedSql, params: translatedParams } = this.translateSql(sql, params);
    const stmt = this.db.prepare(translatedSql);
    const info = stmt.run(...translatedParams) as { changes?: number };
    return { rowCount: Number(info.changes || 0) };
  }

  private inTransaction: boolean = false;

  async transaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
    if (this.inTransaction) {
      return await fn(this);
    }

    const acquireLock = this.txLock;
    let releaseLock: () => void = () => {};
    this.txLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    await acquireLock;
    this.inTransaction = true;
    try {
      this.db.exec('BEGIN TRANSACTION');
      try {
        const result = await fn(this);
        this.db.exec('COMMIT');
        return result;
      } catch (err) {
        this.db.exec('ROLLBACK');
        throw err;
      }
    } finally {
      this.inTransaction = false;
      releaseLock();
    }
  }
}

// ----------------------------------------------------
// Public Database Singleton Accessor
// ----------------------------------------------------
let dbClientInstance: DbClient | null = null;

async function initPgSchema(pool: pg.Pool): Promise<void> {
  try {
    const schemaSqlPath = path.join(process.cwd(), 'src', 'lib', 'assess', 'postgres_schema.sql');
    if (fs.existsSync(schemaSqlPath)) {
      const sql = fs.readFileSync(schemaSqlPath, 'utf8');
      await pool.query(sql);
      console.log('[PostgreSQL] Database schema auto-bootstrap verified.');
    }
  } catch (err) {
    console.error('[PostgreSQL Schema Bootstrap Error]', err);
  }
}

export function getDb(): DbClient {
  if (dbClientInstance) return dbClientInstance;

  if (isPostgresConfigured()) {
    const pool = getPgPool();
    dbClientInstance = new PostgresClient(pool);
    if (!g._pgInitialized) {
      g._pgInitialized = true;
      initPgSchema(pool).catch((err) => {
        console.error('[PostgreSQL Schema Bootstrap Failed]', err);
      });
    }
  } else {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: DATABASE_URL is required in production environment. SQLite fallback prohibited.'
      );
    }
    const sqlite = getSqliteDb();
    dbClientInstance = new SqliteClient(sqlite);
  }

  return dbClientInstance;
}

export async function closeDb(): Promise<void> {
  if (g._pgPool) {
    await g._pgPool.end();
    g._pgPool = null;
  }
  if (g._sqliteDb) {
    try {
      g._sqliteDb.close();
    } catch {
      // Ignore if already closed
    }
    g._sqliteDb = null;
  }
  dbClientInstance = null;
}


// ----------------------------------------------------
// Password Hashing & Verification Utilities
// ----------------------------------------------------
export function hashPassword(password: string, providedSalt?: string): { hash: string; salt: string } {
  const salt = providedSalt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');
    return crypto.timingSafeEqual(keyBuffer, hashBuffer);
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// SQLite Schema & Seeding (Used strictly in offline dev mode)
// ----------------------------------------------------
function initSqliteSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'user', 'candidate')),
      name TEXT NOT NULL,
      department TEXT DEFAULT 'General',
      college TEXT DEFAULT '',
      must_change_password INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
      marks REAL DEFAULT 1.0,
      negative_marks REAL DEFAULT 0.25,
      explanation TEXT DEFAULT '',
      options_json TEXT NOT NULL,
      correct_option_index INTEGER NOT NULL CHECK(correct_option_index BETWEEN 0 AND 3),
      is_mandatory INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL COLLATE NOCASE,
      description TEXT DEFAULT '',
      department TEXT DEFAULT 'Engineering',
      duration_minutes INTEGER NOT NULL DEFAULT 15,
      pass_marks REAL NOT NULL DEFAULT 6.0,
      total_marks REAL NOT NULL DEFAULT 10.0,
      negative_marking_enabled INTEGER NOT NULL DEFAULT 1,
      shuffle_questions INTEGER NOT NULL DEFAULT 1,
      allow_back_navigation INTEGER NOT NULL DEFAULT 1,
      show_answer_key INTEGER NOT NULL DEFAULT 1,
      random_question_count INTEGER DEFAULT 0,
      enable_fullscreen INTEGER NOT NULL DEFAULT 1,
      enable_ai_defense INTEGER NOT NULL DEFAULT 1,
      enable_anti_google INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'closed')),
      results_released INTEGER NOT NULL DEFAULT 0,
      instructions TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exam_questions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      is_mandatory INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE(exam_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS attempt_questions (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      is_mandatory INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE(attempt_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS exam_assignments (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      assigned_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned', 'in_progress', 'submitted', 'expired')),
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(exam_id, candidate_id)
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      deadline_time INTEGER NOT NULL,
      submitted_at INTEGER,
      score REAL DEFAULT 0.0,
      max_score REAL DEFAULT 0.0,
      pass_status TEXT DEFAULT 'pending' CHECK(pass_status IN ('pending', 'passed', 'failed')),
      status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'submitted', 'expired', 'terminated')),
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(exam_id, candidate_id)
    );

    CREATE TABLE IF NOT EXISTS attempt_answers (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      selected_option_index INTEGER,
      is_marked_for_review INTEGER NOT NULL DEFAULT 0,
      saved_at INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE(attempt_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS security_events (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      exam_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high')),
      details TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
    CREATE INDEX IF NOT EXISTS idx_exam_assignments_user ON exam_assignments(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_candidate_exam ON attempts(candidate_id, exam_id);
    CREATE INDEX IF NOT EXISTS idx_security_events_attempt ON security_events(attempt_id);
    CREATE INDEX IF NOT EXISTS idx_attempt_questions_attempt ON attempt_questions(attempt_id);

    CREATE TABLE IF NOT EXISTS payment_orders (
      id TEXT PRIMARY KEY,
      razorpay_order_id TEXT UNIQUE NOT NULL,
      user_id TEXT,
      email TEXT NOT NULL COLLATE NOCASE,
      product_id TEXT NOT NULL,
      amount INTEGER NOT NULL CHECK (amount > 0),
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed', 'refunded')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_payment_orders_email ON payment_orders(email);
    CREATE INDEX IF NOT EXISTS idx_payment_orders_rzp_order ON payment_orders(razorpay_order_id);

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      razorpay_payment_id TEXT UNIQUE NOT NULL,
      razorpay_signature TEXT,
      amount INTEGER NOT NULL CHECK (amount > 0),
      status TEXT NOT NULL CHECK (status IN ('authorized', 'captured', 'refunded', 'failed')),
      method TEXT DEFAULT '',
      payload_json TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES payment_orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_payment_transactions_rzp_pay ON payment_transactions(razorpay_payment_id);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions(order_id);

    CREATE TABLE IF NOT EXISTS user_entitlements (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT NOT NULL COLLATE NOCASE,
      feature_type TEXT NOT NULL CHECK (feature_type IN ('resume_ai_usage', 'mock_interview_attempt', 'mock_assessment_attempt')),
      total_granted INTEGER NOT NULL DEFAULT 0 CHECK (total_granted >= 0),
      total_consumed INTEGER NOT NULL DEFAULT 0 CHECK (total_consumed >= 0),
      remaining_balance INTEGER NOT NULL DEFAULT 0 CHECK (remaining_balance >= 0),
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(email, feature_type)
    );

    CREATE INDEX IF NOT EXISTS idx_user_entitlements_lookup ON user_entitlements(email, feature_type);

    CREATE TABLE IF NOT EXISTS entitlement_ledger (
      id TEXT PRIMARY KEY,
      entitlement_id TEXT NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL CHECK (reason IN ('purchase', 'consume_ai_analysis', 'failed_ai_reversal', 'refund', 'admin_adjustment', 'account_claim_merge', 'reserve_ai_analysis', 'settle_ai_analysis', 'release_ai_reservation', 'plan_grant', 'promo_grant', 'subscription_renewal')),
      reference_id TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (entitlement_id) REFERENCES user_entitlements(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_entitlement_ledger_entitlement ON entitlement_ledger(entitlement_id);
    CREATE INDEX IF NOT EXISTS idx_entitlement_ledger_ref ON entitlement_ledger(reference_id);

    CREATE TABLE IF NOT EXISTS entitlement_reservations (
      id TEXT PRIMARY KEY,
      entitlement_id TEXT NOT NULL,
      reference_id TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('reserved', 'settled', 'released')),
      lease_expires_at INTEGER NOT NULL,
      heartbeat_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (entitlement_id) REFERENCES user_entitlements(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_entitlement_reservations_ref ON entitlement_reservations(reference_id);
    CREATE INDEX IF NOT EXISTS idx_entitlement_reservations_status_lease ON entitlement_reservations(status, lease_expires_at);

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL COLLATE NOCASE,
      domain TEXT DEFAULT '',
      logo_url TEXT DEFAULT '',
      plan_tier TEXT NOT NULL DEFAULT 'recruit_free',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organization_members (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
      created_at INTEGER NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(organization_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      tier_code TEXT UNIQUE NOT NULL COLLATE NOCASE,
      target TEXT NOT NULL CHECK(target IN ('individual', 'organization')),
      name TEXT NOT NULL,
      price_inr INTEGER NOT NULL,
      billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      limits_json TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      organization_id TEXT,
      plan_id TEXT NOT NULL,
      razorpay_subscription_id TEXT,
      razorpay_customer_id TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'past_due', 'canceled', 'trialing')),
      current_period_start INTEGER NOT NULL,
      current_period_end INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    );

    CREATE TABLE IF NOT EXISTS promo_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL COLLATE NOCASE,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('percent', 'fixed')),
      discount_value INTEGER NOT NULL CHECK(discount_value > 0),
      max_uses INTEGER NOT NULL DEFAULT 100,
      current_uses INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER,
      restrictions_json TEXT DEFAULT '{}',
      credit_grant_feature TEXT DEFAULT '',
      credit_grant_amount INTEGER DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      email TEXT PRIMARY KEY COLLATE NOCASE,
      attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);

  // Safe non-destructive column additions
  try {
    db.exec(`ALTER TABLE users ADD COLUMN clerk_user_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN organization_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE exams ADD COLUMN organization_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE exams ADD COLUMN auth_mode TEXT DEFAULT 'exam_only';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE exams ADD COLUMN access_scope TEXT DEFAULT 'single';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE exams ADD COLUMN max_attempts INTEGER DEFAULT 1;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE exams ADD COLUMN is_practice INTEGER DEFAULT 0;`);
  } catch {}

  // Auto-migrate SQLite tables if existing database file has older CHECK constraints
  try {
    const entSql = (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'user_entitlements'").get() as any)?.sql || '';
    if (entSql && !entSql.includes('mock_assessment_attempt')) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE IF NOT EXISTS user_entitlements_new (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          email TEXT NOT NULL COLLATE NOCASE,
          feature_type TEXT NOT NULL CHECK (feature_type IN ('resume_ai_usage', 'mock_interview_attempt', 'mock_assessment_attempt')),
          total_granted INTEGER NOT NULL DEFAULT 0 CHECK (total_granted >= 0),
          total_consumed INTEGER NOT NULL DEFAULT 0 CHECK (total_consumed >= 0),
          remaining_balance INTEGER NOT NULL DEFAULT 0 CHECK (remaining_balance >= 0),
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
          UNIQUE(email, feature_type)
        );
        INSERT OR IGNORE INTO user_entitlements_new SELECT * FROM user_entitlements;
        DROP TABLE user_entitlements;
        ALTER TABLE user_entitlements_new RENAME TO user_entitlements;
        CREATE INDEX IF NOT EXISTS idx_user_entitlements_lookup ON user_entitlements(email, feature_type);
        PRAGMA foreign_keys = ON;
      `);
    }

    const userSql = (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get() as any)?.sql || '';
    if (userSql && !userSql.includes('super_admin')) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE IF NOT EXISTS users_new (
          id TEXT PRIMARY KEY,
          clerk_user_id TEXT,
          email TEXT UNIQUE NOT NULL COLLATE NOCASE,
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'user', 'candidate')),
          name TEXT NOT NULL,
          department TEXT DEFAULT 'General',
          college TEXT DEFAULT '',
          must_change_password INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
          created_at INTEGER NOT NULL
        );
        INSERT OR IGNORE INTO users_new (id, email, password_hash, salt, role, name, department, college, must_change_password, status, created_at)
        SELECT id, email, password_hash, salt, role, name, department, college, must_change_password, status, created_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(email);
        PRAGMA foreign_keys = ON;
      `);
    }

    const ledgerSql = (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'entitlement_ledger'").get() as any)?.sql || '';
    if (ledgerSql && !ledgerSql.includes('reserve_ai_analysis')) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE IF NOT EXISTS entitlement_ledger_new (
          id TEXT PRIMARY KEY,
          entitlement_id TEXT NOT NULL,
          delta INTEGER NOT NULL,
          reason TEXT NOT NULL CHECK (reason IN ('purchase', 'consume_ai_analysis', 'failed_ai_reversal', 'refund', 'admin_adjustment', 'account_claim_merge', 'reserve_ai_analysis', 'settle_ai_analysis', 'release_ai_reservation', 'plan_grant', 'promo_grant')),
          reference_id TEXT DEFAULT '',
          created_at INTEGER NOT NULL,
          FOREIGN KEY (entitlement_id) REFERENCES user_entitlements(id) ON DELETE CASCADE
        );
        INSERT OR IGNORE INTO entitlement_ledger_new SELECT * FROM entitlement_ledger;
        DROP TABLE entitlement_ledger;
        ALTER TABLE entitlement_ledger_new RENAME TO entitlement_ledger;
        CREATE INDEX IF NOT EXISTS idx_entitlement_ledger_entitlement ON entitlement_ledger(entitlement_id);
        CREATE INDEX IF NOT EXISTS idx_entitlement_ledger_ref ON entitlement_ledger(reference_id);
        PRAGMA foreign_keys = ON;
      `);
    }

    const txSql = (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'payment_transactions'").get() as any)?.sql || '';
    if (txSql && !txSql.includes('authorized')) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE IF NOT EXISTS payment_transactions_new (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          razorpay_payment_id TEXT UNIQUE NOT NULL,
          razorpay_signature TEXT,
          amount INTEGER NOT NULL CHECK (amount > 0),
          status TEXT NOT NULL CHECK (status IN ('authorized', 'captured', 'refunded', 'failed')),
          method TEXT DEFAULT '',
          payload_json TEXT DEFAULT '',
          created_at INTEGER NOT NULL,
          FOREIGN KEY (order_id) REFERENCES payment_orders(id) ON DELETE CASCADE
        );
        INSERT OR IGNORE INTO payment_transactions_new SELECT * FROM payment_transactions;
        DROP TABLE payment_transactions;
        ALTER TABLE payment_transactions_new RENAME TO payment_transactions;
        CREATE INDEX IF NOT EXISTS idx_payment_transactions_rzp_pay ON payment_transactions(razorpay_payment_id);
        CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions(order_id);
        PRAGMA foreign_keys = ON;
      `);
    }
  } catch (migErr) {
    console.warn('[SQLite Schema Migration]', migErr);
  }
}

function seedSqliteInitialData(db: DatabaseSync) {
  const now = Date.now();
  const adminId = 'usr_admin_root';
  const examId = 'exam_tech_2026';
  const checkAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!checkAdmin) {
    const adminPw = hashPassword('TalvynAdmin2026!');
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, role, name, department, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(adminId, 'admin@talvyn.com', adminPw.hash, adminPw.salt, 'admin', 'System Administrator', 'Administration', now);

  const candidateId = 'usr_cand_demo';
  const candPw = hashPassword('CandidatePass123!');
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, role, name, department, college, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(candidateId, 'candidate@talvyn.com', candPw.hash, candPw.salt, 'candidate', 'Rohan Sharma', 'Technical', 'California Institute of Technology', now);

  const sampleQuestions = [
    {
      id: 'q_ts_1',
      text: 'In TypeScript, what is the key difference between "unknown" and "any"?',
      category: 'TypeScript',
      difficulty: 'medium',
      marks: 1.0,
      negative_marks: 0.25,
      explanation: '"unknown" is the type-safe counterpart of "any". Anything is assignable to unknown, but unknown is not assignable to anything without a type assertion or control flow type narrowing.',
      options: [
        'unknown allows arbitrary property access without type narrowing, whereas any does not',
        'unknown requires type narrowing or assertion before operations can be performed, whereas any disables all type checking',
        'any cannot be assigned to Object, whereas unknown can',
        'There is no operational difference; unknown is simply deprecated syntax for any'
      ],
      correct: 1
    },
    {
      id: 'q_react_1',
      text: 'In React 19 / Server Components architecture, which of the following is true regarding Server Actions?',
      category: 'React',
      difficulty: 'medium',
      marks: 1.0,
      negative_marks: 0.25,
      explanation: 'Server Actions are asynchronous functions that run securely on the server and can be invoked from both Server and Client Components to handle mutations without manual API endpoint setup.',
      options: [
        'Server Actions can only execute inside client-side event handlers with "use client"',
        'Server Actions are asynchronous functions that run on the server and handle form submissions or RPC mutations',
        'Server Actions run entirely inside Web Workers in the browser',
        'Server Actions replace Redux and Zustand for client-side ephemeral state'
      ],
      correct: 1
    },
    {
      id: 'q_next_1',
      text: 'What does the "stale-while-revalidate" caching header directive instruct the browser or CDN cache to do?',
      category: 'Web Architecture',
      difficulty: 'easy',
      marks: 1.0,
      negative_marks: 0.25,
      explanation: 'stale-while-revalidate allows the cache to immediately serve a stale response while asynchronously fetching a fresh version in the background.',
      options: [
        'Immediately serve stale cache content while fetching a fresh response in the background',
        'Reject any request if the cache has expired and return HTTP 412 Precondition Failed',
        'Delete all cache assets every 60 seconds regardless of hit rates',
        'Require a client WebSocket handshake before returning cached data'
      ],
      correct: 0
    },
    {
      id: 'q_sql_1',
      text: 'Which SQLite journal mode provides concurrent read transactions alongside an active write transaction?',
      category: 'Databases',
      difficulty: 'medium',
      marks: 1.0,
      negative_marks: 0.25,
      explanation: 'WAL (Write-Ahead Logging) allows readers to proceed without blocking writers, and a writer does not block readers.',
      options: [
        'DELETE',
        'TRUNCATE',
        'WAL (Write-Ahead Logging)',
        'MEMORY'
      ],
      correct: 2
    },
    {
      id: 'q_sys_1',
      text: 'When designing an idempotent API endpoint, what HTTP header is standardly used by clients to guard against duplicate mutations on retry?',
      category: 'System Design',
      difficulty: 'medium',
      marks: 1.0,
      negative_marks: 0.25,
      explanation: 'An Idempotency-Key header is transmitted by clients so that duplicate requests caused by retries return the original cached response without re-executing.',
      options: [
        'X-Cache-Buster',
        'Idempotency-Key',
        'Accept-Encoding',
        'If-Modified-Since'
      ],
      correct: 1
    },
    {
      id: 'q_perf_1',
      text: 'What does the Core Web Vital metric "Interaction to Next Paint" (INP) evaluate?',
      category: 'Performance',
      difficulty: 'medium',
      marks: 1.0,
      negative_marks: 0.25,
      explanation: 'INP measures overall page responsiveness to user interactions (clicks, taps, key presses) by observing the latency of all qualified interactions throughout the page lifecycle.',
      options: [
        'The time from page navigation start until the largest visual image renders',
        'The overall responsiveness of a page to user interactions throughout the entire visit',
        'The time required to establish a TLS handshake with the origin server',
        'The total cumulative layout shift caused by dynamic advertisements'
      ],
      correct: 1
    },
    {
      id: 'q_sec_1',
      text: 'Why should sensitive authentication session cookies always have the "HttpOnly" and "SameSite=Strict" (or Lax) flags enabled?',
      category: 'Security',
      difficulty: 'easy',
      marks: 1.0,
      negative_marks: 0.25,
      explanation: 'HttpOnly prevents client-side scripts (XSS) from accessing document.cookie, while SameSite restricts sending cookies across cross-site requests to mitigate Cross-Site Request Forgery (CSRF).',
      options: [
        'To speed up TCP packet routing by skipping HTTP encryption headers',
        'To mitigate XSS cookie theft via JavaScript and defend against Cross-Site Request Forgery (CSRF)',
        'To compress cookie payloads with gzip before storage in LocalStorage',
        'To automatically refresh the session every 5 minutes'
      ],
      correct: 1
    },
    {
      id: 'q_ts_2',
      text: 'In TypeScript, what does the "Omit<T, K>" utility type do?',
      category: 'TypeScript',
      difficulty: 'easy',
      marks: 1.0,
      negative_marks: 0.25,
      explanation: 'Omit<T, K> constructs a type by picking all properties from T and then removing keys K.',
      options: [
        'Makes all properties in T optional',
        'Constructs a type with all properties of T except for those specified in K',
        'Converts all methods in T to asynchronous Promises',
        'Removes undefined and null from the union type T'
      ],
      correct: 1
    },
    {
      id: 'q_alg_1',
      text: 'What is the time complexity of searching for an element in a balanced Binary Search Tree (AVL or Red-Black Tree) with N nodes?',
      category: 'Data Structures',
      difficulty: 'easy',
      marks: 1.0,
      negative_marks: 0.25,
      explanation: 'Balanced BSTs maintain a height of O(log N), guaranteeing O(log N) lookup, insertion, and deletion.',
      options: [
        'O(1)',
        'O(log N)',
        'O(N)',
        'O(N log N)'
      ],
      correct: 1
    },
    {
      id: 'q_net_1',
      text: 'What primary protocol optimization does HTTP/2 introduce over HTTP/1.1 to prevent Head-of-Line blocking at the application layer?',
      category: 'Networking',
      difficulty: 'hard',
      marks: 1.0,
      negative_marks: 0.25,
      explanation: 'HTTP/2 introduces binary framing and stream multiplexing over a single TCP connection, allowing concurrent interleaved requests and responses.',
      options: [
        'Binary framing and stream multiplexing over a single TCP connection',
        'Replacing TCP entirely with UDP datagrams without flow control',
        'Requiring mandatory gzip compression on all media types',
        'Restricting connections to exactly 1 request per socket'
      ],
      correct: 0
    }
  ];

  const insertQ = db.prepare(`
    INSERT INTO questions (id, text, category, difficulty, marks, negative_marks, explanation, options_json, correct_option_index, is_mandatory, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < sampleQuestions.length; i++) {
    const q = sampleQuestions[i];
    const isMandatory = i < 4 ? 1 : 0;
    insertQ.run(q.id, q.text, q.category, q.difficulty, q.marks, q.negative_marks, q.explanation, JSON.stringify(q.options), q.correct, isMandatory, now);
  }

  db.prepare(`
    INSERT INTO exams (
      id, title, code, description, department, duration_minutes, pass_marks, total_marks,
      negative_marking_enabled, shuffle_questions, allow_back_navigation, show_answer_key,
      random_question_count, enable_fullscreen, enable_ai_defense,
      status, results_released, instructions, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    examId,
    'Full Stack Engineering Assessment 2026',
    'FSE-2026',
    'Standard technical benchmark covering TypeScript, React, Next.js, Database concurrency, Security, and System Design.',
    'Technical',
    15,
    6.0,
    10.0,
    1,
    1,
    1,
    1,
    0,
    1,
    1,
    'published',
    0,
    '1. The examination duration is exactly 15 minutes.\n2. Each question carries +1.0 mark; incorrect answers incur -0.25 negative mark.\n3. Switching tabs or exiting fullscreen will be logged as security telemetry.\n4. Answers autosave automatically after every selection.\n5. You may review and change your answers anytime before final submission or time expiration.',
    now,
    now
  );

  const linkQ = db.prepare(`
    INSERT INTO exam_questions (id, exam_id, question_id, order_index, is_mandatory)
    VALUES (?, ?, ?, ?, ?)
  `);
  sampleQuestions.forEach((q, idx) => {
    const isMandatory = idx < 4 ? 1 : 0;
    linkQ.run(`eq_${examId}_${idx}`, examId, q.id, idx + 1, isMandatory);
  });

  db.prepare(`
    INSERT INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(`asg_${examId}_${candidateId}`, examId, candidateId, now, 'assigned');
  }

  // Ensure benchmark exam has unreleased results initially as required by assess test suite
  try {
    db.prepare("UPDATE exams SET results_released = 0 WHERE id = 'exam_tech_2026'").run();
  } catch {}

  // Seed default public practice exam if it doesn't exist
  const checkPractice = db.prepare("SELECT id FROM exams WHERE id = 'exam_public_practice_2026'").get();
  if (!checkPractice) {
    try {
      db.prepare(`
        INSERT INTO exams (
          id, title, code, description, department, duration_minutes, pass_marks, total_marks,
          negative_marking_enabled, shuffle_questions, allow_back_navigation, show_answer_key,
          random_question_count, enable_fullscreen, enable_ai_defense,
          status, results_released, organization_id, is_practice, instructions, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, ?, ?, ?)
      `).run(
        'exam_public_practice_2026',
        'Full Stack Software Engineering Practice Benchmark',
        'PRACTICE-FSE-2026',
        'Open public practice assessment covering modern full-stack development, algorithms, system design, and security.',
        'Software Engineering',
        30,
        15.0,
        25.0,
        1,
        1,
        1,
        1,
        0,
        1,
        1,
        'published',
        1,
        'Standard timed practice assessment rules apply. Results and answer explanations are released upon completion.',
        now,
        now
      );

      const existingQs = db.prepare('SELECT id FROM questions LIMIT 10').all() as Array<{ id: string }>;
      const linkPracticeQ = db.prepare(`
        INSERT OR IGNORE INTO exam_questions (id, exam_id, question_id, order_index, is_mandatory)
        VALUES (?, ?, ?, ?, ?)
      `);
      existingQs.forEach((q, idx) => {
        linkPracticeQ.run(`eq_prac_${idx}`, 'exam_public_practice_2026', q.id, idx + 1, 1);
      });
    } catch {}
  }

  // Seed default plans if none exist
  const checkPlans = db.prepare('SELECT id FROM plans LIMIT 1').get();
  if (!checkPlans) {
    const insertPlan = db.prepare(`
      INSERT INTO plans (id, tier_code, target, name, price_inr, billing_cycle, limits_json, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Individual Plans
    insertPlan.run(
      'plan_starter',
      'struct_starter',
      'individual',
      'STRUCT Starter',
      99,
      'monthly',
      JSON.stringify({
        mockAssessmentsPerMonth: 5,
        aiInterviewCreditsPerMonth: 2,
        resumeAiCredits: 3,
        historyDays: 30,
        skillGapAnalysis: true,
      }),
      1,
      now
    );

    insertPlan.run(
      'plan_pro',
      'struct_pro',
      'individual',
      'STRUCT Pro',
      249,
      'monthly',
      JSON.stringify({
        mockAssessmentsPerMonth: 20,
        aiInterviewCreditsPerMonth: 8,
        resumeAiCredits: 10,
        historyDays: 90,
        advancedAts: true,
        personalizedPlan: true,
      }),
      1,
      now
    );

    insertPlan.run(
      'plan_elite',
      'struct_elite',
      'individual',
      'STRUCT Elite',
      499,
      'monthly',
      JSON.stringify({
        mockAssessmentsPerMonth: 50,
        aiInterviewCreditsPerMonth: 20,
        resumeAiCredits: 25,
        historyDays: 180,
        companySpecificPrep: true,
        careerRoadmap: true,
      }),
      1,
      now
    );

    // Organization Plans
    insertPlan.run(
      'plan_recruit_free',
      'recruit_free',
      'organization',
      'Recruit Free',
      0,
      'monthly',
      JSON.stringify({
        candidatesPerMonth: 0,
        maxDurationMinutes: 30,
        maxQuestionsPerExam: 20,
        campaignsPerMonth: 0,
        adminSeats: 1,
        publicExamsOnly: true,
      }),
      1,
      now
    );

    insertPlan.run(
      'plan_recruit_pro',
      'recruit_pro',
      'organization',
      'Recruit Pro',
      1499,
      'monthly',
      JSON.stringify({
        candidatesPerMonth: 100,
        maxDurationMinutes: 60,
        campaignsPerMonth: 5,
        adminSeats: 3,
        proctoringSignals: true,
        csvExport: true,
      }),
      1,
      now
    );

    insertPlan.run(
      'plan_recruit_business',
      'recruit_business',
      'organization',
      'Recruit Business',
      4999,
      'monthly',
      JSON.stringify({
        candidatesPerMonth: 500,
        maxDurationMinutes: 120,
        campaignsPerMonth: 20,
        adminSeats: 10,
        advancedAnalytics: true,
      }),
      1,
      now
    );

    insertPlan.run(
      'plan_recruit_enterprise',
      'recruit_enterprise',
      'organization',
      'Recruit Enterprise',
      14999,
      'monthly',
      JSON.stringify({
        candidatesPerMonth: 2000,
        maxDurationMinutes: 180,
        campaignsPerMonth: 100,
        adminSeats: 25,
        enterpriseReporting: true,
        prioritySupport: true,
      }),
      1,
      now
    );
  }

  // Seed default demo organization
  const checkOrg = db.prepare('SELECT id FROM organizations LIMIT 1').get();
  if (!checkOrg) {
    const demoOrgId = 'org_talvyn_corp';
    db.prepare(`
      INSERT INTO organizations (id, name, slug, domain, plan_tier, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(demoOrgId, 'STRUCT Technologies Inc.', 'struct-corp', 'struct.careers', 'recruit_pro', now, now);

    // Link root admin to this demo org
    db.prepare(`
      INSERT OR IGNORE INTO organization_members (id, organization_id, user_id, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(`mem_${demoOrgId}_admin`, demoOrgId, adminId, 'owner', now);

    // Link sample exam to this organization
    db.prepare(`UPDATE exams SET organization_id = ? WHERE id = ?`).run(demoOrgId, examId);
  }

  // Seed platform super admin
  const checkSuper = db.prepare("SELECT id FROM users WHERE role = 'super_admin' LIMIT 1").get();
  if (!checkSuper) {
    const superAdminId = 'usr_super_admin_root';
    const superPw = hashPassword('StructSuperAdmin2026!');
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, role, name, department, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(superAdminId, 'admin@struct.careers', superPw.hash, superPw.salt, 'super_admin', 'STRUCT Platform Administrator', 'Platform Ops', now);
  }
}
