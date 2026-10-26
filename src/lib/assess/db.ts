import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'talvyn_assess.db');

// Database singleton pattern for Next.js App Router / server environment
let globalDb: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (globalDb) return globalDb;

  const db = new DatabaseSync(DB_PATH);
  
  // Performance and safety pragmas
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);

  initSchema(db);
  runMigrations(db);
  seedInitialData(db);

  globalDb = db;
  return db;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    -- Users table for both Admins and Candidates
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'candidate')),
      name TEXT NOT NULL,
      department TEXT DEFAULT 'General',
      college TEXT DEFAULT '',
      must_change_password INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
      created_at INTEGER NOT NULL
    );

    -- Session tokens
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Question Bank
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
      marks REAL DEFAULT 1.0,
      negative_marks REAL DEFAULT 0.25,
      explanation TEXT DEFAULT '',
      options_json TEXT NOT NULL, -- JSON array of 4 strings
      correct_option_index INTEGER NOT NULL CHECK(correct_option_index BETWEEN 0 AND 3),
      is_mandatory INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    -- Examination configurations
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

    -- Exam to Question Mappings (Preserves frozen exam question set)
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

    -- Candidate Attempt Frozen Questions (Guarantees mandatory + random selection per attempt)
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

    -- Candidate Exam Assignments
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

    -- Examination Attempts
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

    -- Candidate Saved Answers with Versioning
    CREATE TABLE IF NOT EXISTS attempt_answers (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      selected_option_index INTEGER, -- NULL means cleared response
      is_marked_for_review INTEGER NOT NULL DEFAULT 0,
      saved_at INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE(attempt_id, question_id)
    );

    -- Security Proctoring Events
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

    -- Administrative Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    -- Indexes for query performance and integrity
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
    CREATE INDEX IF NOT EXISTS idx_exam_assignments_user ON exam_assignments(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_candidate_exam ON attempts(candidate_id, exam_id);
    CREATE INDEX IF NOT EXISTS idx_security_events_attempt ON security_events(attempt_id);
    CREATE INDEX IF NOT EXISTS idx_attempt_questions_attempt ON attempt_questions(attempt_id);
  `);
}

function runMigrations(db: DatabaseSync) {
  const safeAlter = (sql: string) => {
    try {
      db.exec(sql);
    } catch {
      // Column or table might already exist
    }
  };

  safeAlter('ALTER TABLE exams ADD COLUMN allow_back_navigation INTEGER NOT NULL DEFAULT 1');
  safeAlter('ALTER TABLE exams ADD COLUMN show_answer_key INTEGER NOT NULL DEFAULT 1');
  safeAlter('ALTER TABLE exams ADD COLUMN random_question_count INTEGER DEFAULT 0');
  safeAlter('ALTER TABLE exams ADD COLUMN enable_fullscreen INTEGER NOT NULL DEFAULT 1');
  safeAlter('ALTER TABLE exams ADD COLUMN enable_ai_defense INTEGER NOT NULL DEFAULT 1');
  safeAlter('ALTER TABLE exams ADD COLUMN enable_anti_google INTEGER NOT NULL DEFAULT 1');

  safeAlter('ALTER TABLE questions ADD COLUMN is_mandatory INTEGER NOT NULL DEFAULT 0');
  safeAlter('ALTER TABLE exam_questions ADD COLUMN is_mandatory INTEGER NOT NULL DEFAULT 0');

  safeAlter(`
    CREATE TABLE IF NOT EXISTS attempt_questions (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      is_mandatory INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE(attempt_id, question_id)
    )
  `);
}

// Password hashing utility using Node.js scrypt with cryptographic salt
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

function seedInitialData(db: DatabaseSync) {
  // Check if admin exists
  const checkAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (checkAdmin) return;

  const now = Date.now();

  // 1. Seed Root Admin
  const adminId = 'usr_admin_root';
  const adminPw = hashPassword('TalvynAdmin2026!');
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, role, name, department, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(adminId, 'admin@talvyn.com', adminPw.hash, adminPw.salt, 'admin', 'System Administrator', 'Administration', now);

  // 2. Seed Default Sample Candidate
  const candidateId = 'usr_cand_demo';
  const candPw = hashPassword('CandidatePass123!');
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, role, name, department, college, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(candidateId, 'candidate@talvyn.com', candPw.hash, candPw.salt, 'candidate', 'Rohan Sharma', 'Technical', 'California Institute of Technology', now);

  // 3. Seed Sample High-Quality Question Bank (10 Questions for Technical Assessment)
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
    const isMandatory = i < 4 ? 1 : 0; // First 4 are mandatory technical benchmarks
    insertQ.run(q.id, q.text, q.category, q.difficulty, q.marks, q.negative_marks, q.explanation, JSON.stringify(q.options), q.correct, isMandatory, now);
  }

  // 4. Seed Standard Sample Exam: "TALVYN Technical Assessment 2026"
  const examId = 'exam_tech_2026';
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
    1, // allow_back_navigation
    1, // show_answer_key
    0, // random_question_count (0 = all questions in exam)
    1, // enable_fullscreen
    1, // enable_ai_defense
    'published', // Published so candidates can take it immediately
    0, // Results withheld until admin clicks release
    '1. The examination duration is exactly 15 minutes.\n2. Each question carries +1.0 mark; incorrect answers incur -0.25 negative mark.\n3. Switching tabs or exiting fullscreen will be logged as security telemetry.\n4. Answers autosave automatically after every selection.\n5. You may review and change your answers anytime before final submission or time expiration.',
    now,
    now
  );

  // Link questions to this exam
  const linkQ = db.prepare(`
    INSERT INTO exam_questions (id, exam_id, question_id, order_index, is_mandatory)
    VALUES (?, ?, ?, ?, ?)
  `);
  sampleQuestions.forEach((q, idx) => {
    const isMandatory = idx < 4 ? 1 : 0;
    linkQ.run(`eq_${examId}_${idx}`, examId, q.id, idx + 1, isMandatory);
  });

  // Assign exam to demo candidate
  db.prepare(`
    INSERT INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(`asg_${examId}_${candidateId}`, examId, candidateId, now, 'assigned');
}
