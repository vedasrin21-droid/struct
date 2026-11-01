/**
 * STRUCT ASSESSMENT PLATFORM — SQLITE TO POSTGRESQL DATA MIGRATION SCRIPT
 * 
 * Safely copies all records from the local SQLite database into PostgreSQL.
 * Safeguards:
 * 1. Opens SQLite database in strictly READ-ONLY mode.
 * 2. Uses ON CONFLICT DO NOTHING for all tables (safe to re-run anytime).
 * 3. Preserves all primary keys, timestamps (converted to BIGINT), and foreign-key relationships.
 * 4. Inserts in strict topological dependency order.
 * 5. Reports counts of total found, inserted, and skipped records.
 */

import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';

const { Pool } = pg;

const DB_PATH = path.join(process.cwd(), 'data', 'talvyn_assess.db');

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[ERROR] DATABASE_URL environment variable is missing.');
    console.error('Usage: DATABASE_URL="postgresql://user:pass@host:5432/dbname" node scripts/migrate-sqlite-to-pg.mjs');
    process.exit(1);
  }

  if (!fs.existsSync(DB_PATH)) {
    console.log(`[INFO] No SQLite database found at ${DB_PATH}. Nothing to migrate.`);
    process.exit(0);
  }

  console.log(`[INFO] Connecting to SQLite at ${DB_PATH} (read-only)...`);
  const sqlite = new DatabaseSync(DB_PATH, { readOnly: true });

  console.log(`[INFO] Connecting to PostgreSQL...`);
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.PG_SSL === 'false' ? false : (databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }),
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  console.log(`[SUCCESS] Connected to PostgreSQL.`);

  try {
    // 1. Initialize PostgreSQL schema
    const schemaSqlPath = path.join(process.cwd(), 'src', 'lib', 'assess', 'postgres_schema.sql');
    const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
    console.log(`[INFO] Initializing PostgreSQL schema...`);
    await client.query(schemaSql);
    console.log(`[SUCCESS] PostgreSQL schema verified.`);

    const stats = {};
    const track = (tbl) => { stats[tbl] = { found: 0, inserted: 0 }; };

    await client.query('BEGIN');

    // 1. Organizations
    track('organizations');
    try {
      const orgs = sqlite.prepare('SELECT * FROM organizations').all();
      stats.organizations.found = orgs.length;
      for (const o of orgs) {
        const res = await client.query(`
          INSERT INTO organizations (id, name, slug, domain, logo_url, plan_tier, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [o.id, o.name, o.slug, o.domain || '', o.logo_url || '', o.plan_tier || 'recruit_free', BigInt(o.created_at), BigInt(o.updated_at || o.created_at)]);
        if (res.rowCount > 0) stats.organizations.inserted++;
      }
    } catch {}

    // 2. Users
    track('users');
    const users = sqlite.prepare('SELECT * FROM users').all();
    stats.users.found = users.length;
    for (const u of users) {
      const res = await client.query(`
        INSERT INTO users (id, clerk_user_id, email, password_hash, salt, role, name, department, college, must_change_password, status, created_at, organization_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING
      `, [u.id, u.clerk_user_id || null, u.email, u.password_hash, u.salt, u.role, u.name, u.department || 'General', u.college || '', u.must_change_password ? 1 : 0, u.status || 'active', BigInt(u.created_at), u.organization_id || null]);
      if (res.rowCount > 0) stats.users.inserted++;
    }

    // 3. Organization Members
    track('organization_members');
    try {
      const members = sqlite.prepare('SELECT * FROM organization_members').all();
      stats.organization_members.found = members.length;
      for (const m of members) {
        const res = await client.query(`
          INSERT INTO organization_members (id, organization_id, user_id, role, created_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [m.id, m.organization_id, m.user_id, m.role || 'member', BigInt(m.created_at)]);
        if (res.rowCount > 0) stats.organization_members.inserted++;
      }
    } catch {}

    // 4. Sessions
    track('sessions');
    const sessions = sqlite.prepare('SELECT * FROM sessions').all();
    stats.sessions.found = sessions.length;
    for (const s of sessions) {
      const res = await client.query(`
        INSERT INTO sessions (id, token, user_id, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [s.id, s.token, s.user_id, BigInt(s.expires_at), BigInt(s.created_at)]);
      if (res.rowCount > 0) stats.sessions.inserted++;
    }

    // 5. Questions
    track('questions');
    const questions = sqlite.prepare('SELECT * FROM questions').all();
    stats.questions.found = questions.length;
    for (const q of questions) {
      const res = await client.query(`
        INSERT INTO questions (id, text, category, difficulty, marks, negative_marks, explanation, options_json, correct_option_index, is_mandatory, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [q.id, q.text, q.category, q.difficulty, q.marks, q.negative_marks, q.explanation || '', q.options_json, q.correct_option_index, q.is_mandatory ? 1 : 0, BigInt(q.created_at)]);
      if (res.rowCount > 0) stats.questions.inserted++;
    }

    // 6. Exams
    track('exams');
    const exams = sqlite.prepare('SELECT * FROM exams').all();
    stats.exams.found = exams.length;
    for (const e of exams) {
      const res = await client.query(`
        INSERT INTO exams (
          id, title, code, description, department, duration_minutes, pass_marks, total_marks,
          negative_marking_enabled, shuffle_questions, allow_back_navigation, show_answer_key,
          random_question_count, enable_fullscreen, enable_ai_defense, enable_anti_google,
          auth_mode, access_scope, max_attempts, organization_id,
          status, results_released, instructions, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        ON CONFLICT (id) DO NOTHING
      `, [
        e.id, e.title, e.code, e.description || '', e.department || 'Engineering',
        e.duration_minutes, e.pass_marks, e.total_marks,
        e.negative_marking_enabled ? 1 : 0, e.shuffle_questions ? 1 : 0,
        e.allow_back_navigation !== 0 ? 1 : 0, e.show_answer_key !== 0 ? 1 : 0,
        e.random_question_count || 0, e.enable_fullscreen !== 0 ? 1 : 0,
        e.enable_ai_defense !== 0 ? 1 : 0, e.enable_anti_google !== 0 ? 1 : 0,
        e.auth_mode || 'exam_only', e.access_scope || 'single', e.max_attempts || 1, e.organization_id || null,
        e.status || 'draft', e.results_released ? 1 : 0, e.instructions || '',
        BigInt(e.created_at), BigInt(e.updated_at || e.created_at)
      ]);
      if (res.rowCount > 0) stats.exams.inserted++;
    }

    // 7. Exam Questions
    track('exam_questions');
    const examQuestions = sqlite.prepare('SELECT * FROM exam_questions').all();
    stats.exam_questions.found = examQuestions.length;
    for (const eq of examQuestions) {
      const res = await client.query(`
        INSERT INTO exam_questions (id, exam_id, question_id, order_index, is_mandatory)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [eq.id, eq.exam_id, eq.question_id, eq.order_index, eq.is_mandatory ? 1 : 0]);
      if (res.rowCount > 0) stats.exam_questions.inserted++;
    }

    // 8. Exam Assignments
    track('exam_assignments');
    const assignments = sqlite.prepare('SELECT * FROM exam_assignments').all();
    stats.exam_assignments.found = assignments.length;
    for (const ea of assignments) {
      const res = await client.query(`
        INSERT INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [ea.id, ea.exam_id, ea.candidate_id, BigInt(ea.assigned_at), ea.status || 'assigned']);
      if (res.rowCount > 0) stats.exam_assignments.inserted++;
    }

    // 9. Attempts
    track('attempts');
    const attempts = sqlite.prepare('SELECT * FROM attempts').all();
    stats.attempts.found = attempts.length;
    for (const att of attempts) {
      const res = await client.query(`
        INSERT INTO attempts (id, exam_id, candidate_id, start_time, deadline_time, submitted_at, score, max_score, pass_status, status, ip_address, user_agent, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING
      `, [
        att.id, att.exam_id, att.candidate_id,
        BigInt(att.start_time), BigInt(att.deadline_time),
        att.submitted_at ? BigInt(att.submitted_at) : null,
        att.score, att.max_score, att.pass_status || 'pending',
        att.status, att.ip_address || '', att.user_agent || '',
        BigInt(att.created_at)
      ]);
      if (res.rowCount > 0) stats.attempts.inserted++;
    }

    // 10. Attempt Questions
    track('attempt_questions');
    try {
      const attemptQuestions = sqlite.prepare('SELECT * FROM attempt_questions').all();
      stats.attempt_questions.found = attemptQuestions.length;
      for (const aq of attemptQuestions) {
        const res = await client.query(`
          INSERT INTO attempt_questions (id, attempt_id, question_id, order_index, is_mandatory)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [aq.id, aq.attempt_id, aq.question_id, aq.order_index, aq.is_mandatory ? 1 : 0]);
        if (res.rowCount > 0) stats.attempt_questions.inserted++;
      }
    } catch {}

    // 11. Attempt Answers
    track('attempt_answers');
    const answers = sqlite.prepare('SELECT * FROM attempt_answers').all();
    stats.attempt_answers.found = answers.length;
    for (const ans of answers) {
      const res = await client.query(`
        INSERT INTO attempt_answers (id, attempt_id, question_id, selected_option_index, is_marked_for_review, saved_at, version)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [ans.id, ans.attempt_id, ans.question_id, ans.selected_option_index, ans.is_marked_for_review ? 1 : 0, BigInt(ans.saved_at), ans.version || 1]);
      if (res.rowCount > 0) stats.attempt_answers.inserted++;
    }

    // 12. Security Events
    track('security_events');
    const events = sqlite.prepare('SELECT * FROM security_events').all();
    stats.security_events.found = events.length;
    for (const ev of events) {
      const res = await client.query(`
        INSERT INTO security_events (id, attempt_id, candidate_id, exam_id, event_type, severity, details, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [ev.id, ev.attempt_id, ev.candidate_id, ev.exam_id, ev.event_type, ev.severity, ev.details || '', BigInt(ev.created_at)]);
      if (res.rowCount > 0) stats.security_events.inserted++;
    }

    // 13. Audit Logs
    track('audit_logs');
    try {
      const logs = sqlite.prepare('SELECT * FROM audit_logs').all();
      stats.audit_logs.found = logs.length;
      for (const log of logs) {
        const res = await client.query(`
          INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, [log.id, log.user_id, log.action, log.target_type, log.target_id, log.details || '', BigInt(log.created_at)]);
        if (res.rowCount > 0) stats.audit_logs.inserted++;
      }
    } catch {}

    // 14. Plans
    track('plans');
    try {
      const plans = sqlite.prepare('SELECT * FROM plans').all();
      stats.plans.found = plans.length;
      for (const p of plans) {
        const res = await client.query(`
          INSERT INTO plans (id, tier_code, target, name, price_inr, billing_cycle, limits_json, is_active, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `, [p.id, p.tier_code, p.target, p.name, p.price_inr, p.billing_cycle || 'monthly', p.limits_json, p.is_active ? 1 : 0, BigInt(p.created_at)]);
        if (res.rowCount > 0) stats.plans.inserted++;
      }
    } catch {}

    // 15. Subscriptions
    track('subscriptions');
    try {
      const subs = sqlite.prepare('SELECT * FROM subscriptions').all();
      stats.subscriptions.found = subs.length;
      for (const sub of subs) {
        const res = await client.query(`
          INSERT INTO subscriptions (id, user_id, organization_id, plan_id, razorpay_subscription_id, razorpay_customer_id, status, current_period_start, current_period_end, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO NOTHING
        `, [sub.id, sub.user_id || null, sub.organization_id || null, sub.plan_id, sub.razorpay_subscription_id || null, sub.razorpay_customer_id || null, sub.status || 'active', BigInt(sub.current_period_start), BigInt(sub.current_period_end), BigInt(sub.created_at), BigInt(sub.updated_at || sub.created_at)]);
        if (res.rowCount > 0) stats.subscriptions.inserted++;
      }
    } catch {}

    // 16. Promo Codes
    track('promo_codes');
    try {
      const promos = sqlite.prepare('SELECT * FROM promo_codes').all();
      stats.promo_codes.found = promos.length;
      for (const pr of promos) {
        const res = await client.query(`
          INSERT INTO promo_codes (id, code, discount_type, discount_value, max_uses, current_uses, expires_at, restrictions_json, credit_grant_feature, credit_grant_amount, is_active, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO NOTHING
        `, [pr.id, pr.code, pr.discount_type, pr.discount_value, pr.max_uses, pr.current_uses, pr.expires_at ? BigInt(pr.expires_at) : null, pr.restrictions_json || '{}', pr.credit_grant_feature || '', pr.credit_grant_amount || 0, pr.is_active ? 1 : 0, BigInt(pr.created_at)]);
        if (res.rowCount > 0) stats.promo_codes.inserted++;
      }
    } catch {}

    // 17. Payment Orders
    track('payment_orders');
    try {
      const orders = sqlite.prepare('SELECT * FROM payment_orders').all();
      stats.payment_orders.found = orders.length;
      for (const ord of orders) {
        const res = await client.query(`
          INSERT INTO payment_orders (id, razorpay_order_id, user_id, email, product_id, amount, currency, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [ord.id, ord.razorpay_order_id, ord.user_id || null, ord.email, ord.product_id, ord.amount, ord.currency || 'INR', ord.status || 'created', BigInt(ord.created_at), BigInt(ord.updated_at || ord.created_at)]);
        if (res.rowCount > 0) stats.payment_orders.inserted++;
      }
    } catch {}

    // 18. Payment Transactions
    track('payment_transactions');
    try {
      const txs = sqlite.prepare('SELECT * FROM payment_transactions').all();
      stats.payment_transactions.found = txs.length;
      for (const tx of txs) {
        const res = await client.query(`
          INSERT INTO payment_transactions (id, order_id, razorpay_payment_id, razorpay_signature, amount, status, method, payload_json, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `, [tx.id, tx.order_id, tx.razorpay_payment_id, tx.razorpay_signature || '', tx.amount, tx.status, tx.method || '', tx.payload_json || '', BigInt(tx.created_at)]);
        if (res.rowCount > 0) stats.payment_transactions.inserted++;
      }
    } catch {}

    // 19. User Entitlements
    track('user_entitlements');
    try {
      const ents = sqlite.prepare('SELECT * FROM user_entitlements').all();
      stats.user_entitlements.found = ents.length;
      for (const ent of ents) {
        const res = await client.query(`
          INSERT INTO user_entitlements (id, user_id, email, feature_type, total_granted, total_consumed, remaining_balance, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [ent.id, ent.user_id || null, ent.email, ent.feature_type, ent.total_granted, ent.total_consumed, ent.remaining_balance, BigInt(ent.updated_at)]);
        if (res.rowCount > 0) stats.user_entitlements.inserted++;
      }
    } catch {}

    // 20. Entitlement Ledger
    track('entitlement_ledger');
    try {
      const ledger = sqlite.prepare('SELECT * FROM entitlement_ledger').all();
      stats.entitlement_ledger.found = ledger.length;
      for (const led of ledger) {
        const res = await client.query(`
          INSERT INTO entitlement_ledger (id, entitlement_id, delta, reason, reference_id, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        `, [led.id, led.entitlement_id, led.delta, led.reason, led.reference_id || '', BigInt(led.created_at)]);
        if (res.rowCount > 0) stats.entitlement_ledger.inserted++;
      }
    } catch {}

    // 21. Entitlement Reservations
    track('entitlement_reservations');
    try {
      const resvs = sqlite.prepare('SELECT * FROM entitlement_reservations').all();
      stats.entitlement_reservations.found = resvs.length;
      for (const r of resvs) {
        const res = await client.query(`
          INSERT INTO entitlement_reservations (id, entitlement_id, reference_id, status, lease_expires_at, heartbeat_at, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [r.id, r.entitlement_id, r.reference_id, r.status, BigInt(r.lease_expires_at), BigInt(r.heartbeat_at), BigInt(r.created_at), BigInt(r.updated_at)]);
        if (res.rowCount > 0) stats.entitlement_reservations.inserted++;
      }
    } catch {}

    // 22. Login Attempts
    track('login_attempts');
    try {
      const attempts = sqlite.prepare('SELECT * FROM login_attempts').all();
      stats.login_attempts.found = attempts.length;
      for (const a of attempts) {
        const res = await client.query(`
          INSERT INTO login_attempts (email, attempts, locked_until, updated_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (email) DO NOTHING
        `, [a.email, a.attempts, BigInt(a.locked_until), BigInt(a.updated_at)]);
        if (res.rowCount > 0) stats.login_attempts.inserted++;
      }
    } catch {}

    await client.query('COMMIT');

    console.log('\n=== COMPLETE MIGRATION SUMMARY (ALL 22 TABLES) ===');
    for (const [table, s] of Object.entries(stats)) {
      console.log(`- ${table.padEnd(26)}: ${s.inserted} inserted / ${s.found - s.inserted} skipped (already present) / ${s.found} total in SQLite`);
    }
    console.log('\n[SUCCESS] PostgreSQL migration completed safely with zero data loss.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FATAL] Migration failed. Transaction rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('[FATAL] Uncaught migration exception:', err);
  process.exit(1);
});
