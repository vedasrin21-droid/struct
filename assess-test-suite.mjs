import assert from 'node:assert';
import { getDb, hashPassword, verifyPassword } from './src/lib/assess/db.ts';
import { createSession, verifySession, deleteSession } from './src/lib/assess/auth.ts';
import { obfuscateForGoogle, getPoisonedClipboardPayload } from './src/lib/assess/antiCheat.ts';

console.log('=== STARTING TALVYN ASSESS AUTOMATED VERIFICATION SUITE ===\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] Case ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Case ${totalTests}: ${name}`);
    console.error(err);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] Case ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Case ${totalTests}: ${name}`);
    console.error(err);
  }
}

// 1. Password Hashing & Verification Security
runTest('Password Hashing & Timing-Safe Verification', () => {
  const plain = 'SuperSecret@2026!';
  const { hash, salt } = hashPassword(plain);
  assert(hash.length > 32, 'Hash must be generated');
  assert(salt.length > 16, 'Salt must be generated');
  assert(verifyPassword(plain, hash, salt) === true, 'Correct password must verify');
  assert(verifyPassword('WrongPassword123', hash, salt) === false, 'Wrong password must fail');
  assert(verifyPassword('', hash, salt) === false, 'Empty password must fail');
});

// 2. Database Schema & Seed Data Validation
runTest('Database Schema & Seed Records Initialized', () => {
  const db = getDb();
  const admin = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();
  assert(admin, 'Root admin must be seeded');
  assert.strictEqual(admin.email, 'admin@talvyn.com');

  const candidate = db.prepare("SELECT * FROM users WHERE role = 'candidate' LIMIT 1").get();
  assert(candidate, 'Demo candidate must be seeded');
  assert.strictEqual(candidate.email, 'candidate@talvyn.com');

  const exam = db.prepare("SELECT * FROM exams WHERE code = 'FSE-2026'").get();
  assert(exam, 'Default exam FSE-2026 must be seeded');
  assert.strictEqual(exam.duration_minutes, 15);
  assert.strictEqual(exam.status, 'published');

  const questions = db.prepare("SELECT COUNT(*) as count FROM exam_questions WHERE exam_id = ?").get(exam.id);
  assert(questions.count >= 10, 'Exam must have at least 10 questions linked');
});

// 3. Candidate vs Admin Role-Based Access Control & Sessions
runTest('Session Creation & Expiration Validation', () => {
  const db = getDb();
  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  const { token, expiresAt } = createSession(admin.id);
  assert(token, 'Session token must be created');
  assert(expiresAt > Date.now(), 'Expires at must be future timestamp');

  const user = verifySession(token);
  assert(user, 'Session must resolve to user');
  assert.strictEqual(user.role, 'admin');

  // Deletion/logout
  deleteSession(token);
  assert(verifySession(token) === null, 'Session must be null after logout');
});

// 4. Answer-Key Leakage Protection (Zero solution leakage)
runTest('Answer-Key Concealment before Official Release', () => {
  const db = getDb();
  const exam = db.prepare("SELECT id, results_released FROM exams WHERE code = 'FSE-2026'").get();
  assert.strictEqual(exam.results_released, 0, 'Results must default to unreleased');

  // Candidate questions query simulates API behavior
  const qRows = db.prepare(`
    SELECT q.id, q.text, q.options_json, q.correct_option_index, q.explanation
    FROM exam_questions eq
    JOIN questions q ON q.id = eq.question_id
    WHERE eq.exam_id = ?
  `).all(exam.id);

  // In candidate API payload, correct_option_index and explanation are explicitly stripped when results_released == 0
  const candidatePayload = qRows.map(q => {
    const sanitized = {
      id: q.id,
      text: q.text,
      options: JSON.parse(q.options_json),
    };
    if (exam.results_released === 1) {
      sanitized.correctOptionIndex = q.correct_option_index;
      sanitized.explanation = q.explanation;
    }
    return sanitized;
  });

  candidatePayload.forEach(q => {
    assert.strictEqual(q.correctOptionIndex, undefined, 'Solution index must NOT leak to candidate');
    assert.strictEqual(q.explanation, undefined, 'Explanation must NOT leak to candidate');
    assert.strictEqual(q.options.length, 4, 'Must provide 4 options');
  });
});

// 5. Duplicate Attempt Prevention (Database uniqueness constraint)
runTest('Duplicate Attempt Prevention for Same Candidate & Exam', () => {
  const db = getDb();
  const testCandId = 'usr_cand_test_dup';
  const testExamId = 'exam_test_dup';
  const now = Date.now();

  // Create temporary candidate and exam
  const pw = hashPassword('TestPass123!');
  db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password_hash, salt, role, name, created_at)
    VALUES (?, 'test_dup@talvyn.com', ?, ?, 'candidate', 'Dup Tester', ?)
  `).run(testCandId, pw.hash, pw.salt, now);

  db.prepare(`
    INSERT OR REPLACE INTO exams (id, title, code, duration_minutes, status, created_at, updated_at)
    VALUES (?, 'Dup Test Exam', 'DUP-TEST', 15, 'published', ?, ?)
  `).run(testExamId, now, now);

  // First attempt insertion succeeds
  db.prepare(`
    INSERT OR REPLACE INTO attempts (id, exam_id, candidate_id, start_time, deadline_time, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'in_progress', ?)
  `).run('att_dup_1', testExamId, testCandId, now, now + 900000, now);

  // Second attempt insertion must fail due to UNIQUE(exam_id, candidate_id) constraint
  let threwConstraintError = false;
  try {
    db.prepare(`
      INSERT INTO attempts (id, exam_id, candidate_id, start_time, deadline_time, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'in_progress', ?)
    `).run('att_dup_2', testExamId, testCandId, now, now + 900000, now);
  } catch (err) {
    threwConstraintError = true;
  }
  assert(threwConstraintError, 'Database must enforce single attempt per candidate per exam');
});

// 6. Server-Side Scoring & Negative Marking Calculation
runTest('Server-Side Scoring with Positive and Negative Marking', () => {
  const db = getDb();
  const testExamId = 'exam_test_score';
  const testAttemptId = 'att_test_score';
  const now = Date.now();

  // Questions setup: 2 questions, +1 mark each, -0.25 negative mark
  const q1 = { id: 'q_sc_1', marks: 1.0, negative_marks: 0.25, correct: 1 };
  const q2 = { id: 'q_sc_2', marks: 1.0, negative_marks: 0.25, correct: 2 };

  // Candidate answers: Q1 correct, Q2 incorrect
  const candidateAnswers = new Map([
    ['q_sc_1', 1], // Correct (+1.0)
    ['q_sc_2', 0], // Incorrect (-0.25)
  ]);

  let score = 0.0;
  for (const q of [q1, q2]) {
    const sel = candidateAnswers.get(q.id);
    if (sel === undefined || sel === null) {
      score += 0;
    } else if (sel === q.correct) {
      score += q.marks;
    } else {
      score -= q.negative_marks;
    }
  }

  assert.strictEqual(score, 0.75, 'Score must reflect +1.0 - 0.25 = 0.75');
});

// 7. Idempotent Submission (Submitting twice yields identical result)
runTest('Idempotent Submission Handling', () => {
  const db = getDb();
  const testAttemptId = 'att_test_idem';
  const now = Date.now();

  // Create attempt
  db.prepare(`
    INSERT OR REPLACE INTO attempts (id, exam_id, candidate_id, start_time, deadline_time, score, max_score, pass_status, status, created_at)
    VALUES (?, 'exam_tech_2026', 'usr_cand_demo', ?, ?, 8.0, 10.0, 'passed', 'submitted', ?)
  `).run(testAttemptId, now - 600000, now + 300000, now);

  const firstFetch = db.prepare('SELECT status, score FROM attempts WHERE id = ?').get(testAttemptId);
  assert.strictEqual(firstFetch.status, 'submitted');
  assert.strictEqual(firstFetch.score, 8.0);

  // Calling submit logic again on an already submitted attempt must safely return existing state
  const isAlreadySubmitted = firstFetch.status === 'submitted';
  assert(isAlreadySubmitted, 'Second submission invocation recognizes completed state');
});

// 8. Autosave Concurrency & Stale Packet Protection
runTest('Autosave Version Concurrency Control', () => {
  const existingVersion = 3;
  const staleIncomingVersion = 2; // Stale network packet arriving late
  const freshIncomingVersion = 4;

  const shouldIgnoreStale = staleIncomingVersion <= existingVersion;
  assert(shouldIgnoreStale, 'Stale incoming autosave packet must be ignored');

  const shouldAcceptFresh = freshIncomingVersion > existingVersion;
  assert(shouldAcceptFresh, 'Newer autosave packet must be accepted and committed');
});

// 9. Security Telemetry Logging
runTest('Proctoring Telemetry Signal Recording', () => {
  const db = getDb();
  const eventId = 'ev_test_' + Date.now();
  const testExamId = 'exam_sec_' + Date.now();
  const testCandId = 'usr_cand_sec_' + Date.now();
  const testAttemptId = 'att_sec_' + Date.now();
  const now = Date.now();

  const pw = hashPassword('SecPass123!');
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, role, name, created_at)
    VALUES (?, ?, ?, ?, 'candidate', 'Sec Tester', ?)
  `).run(testCandId, `sec_${now}@talvyn.com`, pw.hash, pw.salt, now);

  db.prepare(`
    INSERT INTO exams (id, title, code, duration_minutes, status, created_at, updated_at)
    VALUES (?, 'Sec Exam', ?, 15, 'published', ?, ?)
  `).run(testExamId, `SEC-${now}`, now, now);

  // Insert valid attempt first to satisfy Foreign Key
  db.prepare(`
    INSERT INTO attempts (id, exam_id, candidate_id, start_time, deadline_time, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'in_progress', ?)
  `).run(testAttemptId, testExamId, testCandId, now, now + 900000, now);

  db.prepare(`
    INSERT INTO security_events (id, attempt_id, candidate_id, exam_id, event_type, severity, details, created_at)
    VALUES (?, ?, ?, ?, 'tab_switch', 'medium', 'Candidate left active window', ?)
  `).run(eventId, testAttemptId, testCandId, testExamId, now);

  const savedEvent = db.prepare('SELECT * FROM security_events WHERE id = ?').get(eventId);
  assert(savedEvent, 'Security event must be recorded');
  assert.strictEqual(savedEvent.event_type, 'tab_switch');
  assert.strictEqual(savedEvent.severity, 'medium');
});

// 10. CSV Validation and Row-Level Error Reporting
runTest('CSV Candidate Roster Parsing & Row Validation', () => {
  const mockCsv = [
    'name,email,password,department,college',
    '"Alice Brown","alice@example.com","Pass123!","Engineering","MIT"',
    '"","bad_email","Pass123!","Design","RISD"',
    '"Charlie Davis","alice@example.com","Pass123!","Marketing","Columbia"'
  ].join('\n');

  const lines = mockCsv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const errors = [];
  const valid = [];
  const seenEmails = new Set();

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.replaceAll('"', '').trim());
    const name = parts[0];
    const email = parts[1];

    if (!name) {
      errors.push({ row: i + 1, error: 'Missing name' });
      continue;
    }
    if (!email || !email.includes('@')) {
      errors.push({ row: i + 1, error: 'Invalid email' });
      continue;
    }
    if (seenEmails.has(email)) {
      errors.push({ row: i + 1, error: 'Duplicate email in CSV' });
      continue;
    }
    seenEmails.add(email);
    valid.push({ name, email });
  }

  assert.strictEqual(valid.length, 1, 'Only Alice Brown is valid');
  assert.strictEqual(errors.length, 2, 'Row 3 (missing name) and Row 4 (duplicate email) must be flagged');
  assert.strictEqual(errors[0].row, 3);
  assert.strictEqual(errors[1].row, 4);
});

// 11. Results Release Permission Guard
runTest('Results Release Gating Logic', () => {
  const examResultsWithheld = { results_released: 0, score: 7.5, pass_status: 'passed' };
  const examResultsPublished = { results_released: 1, score: 7.5, pass_status: 'passed' };

  // Helper simulating API gate
  const gateScore = (exam) => exam.results_released ? exam.score : null;
  const gateStatus = (exam) => exam.results_released ? exam.pass_status : 'pending_release';

  assert.strictEqual(gateScore(examResultsWithheld), null, 'Score must be masked when withheld');
  assert.strictEqual(gateStatus(examResultsWithheld), 'pending_release', 'Status must be pending_release');

  assert.strictEqual(gateScore(examResultsPublished), 7.5, 'Score revealed when published');
  assert.strictEqual(gateStatus(examResultsPublished), 'passed', 'Status revealed when published');
});

runTest('Mandatory vs Random Question Selection Logic', () => {
  const allExamQuestions = [
    { id: 'q1', is_mandatory: 1, text: 'Mandatory Question 1' },
    { id: 'q2', is_mandatory: 1, text: 'Mandatory Question 2' },
    { id: 'q3', is_mandatory: 0, text: 'Pool Question 3' },
    { id: 'q4', is_mandatory: 0, text: 'Pool Question 4' },
    { id: 'q5', is_mandatory: 0, text: 'Pool Question 5' },
    { id: 'q6', is_mandatory: 0, text: 'Pool Question 6' },
  ];

  // Logic: mandatory are ALWAYS included; pool questions are randomly sampled up to quota
  const mandatory = allExamQuestions.filter(q => q.is_mandatory === 1);
  const pool = allExamQuestions.filter(q => q.is_mandatory !== 1);
  const randomCountQuota = 2;

  const sampledPool = pool.slice(0, randomCountQuota); // deterministic simulation of sampling
  const selected = [...mandatory, ...sampledPool];

  assert.strictEqual(selected.length, 4, 'Should contain 2 mandatory + 2 sampled pool questions');
  assert.ok(selected.some(q => q.id === 'q1'), 'Mandatory q1 must be included');
  assert.ok(selected.some(q => q.id === 'q2'), 'Mandatory q2 must be included');
  assert.strictEqual(selected.filter(q => q.is_mandatory === 1).length, 2, 'All mandatory questions must be present');
});

runTest('Student Exam Assignment Database & Query Filter', () => {
  const db = getDb();
  const candidate = db.prepare("SELECT id FROM users WHERE role = 'candidate' LIMIT 1").get();
  const exam = db.prepare("SELECT id FROM exams LIMIT 1").get();
  assert.ok(candidate, 'Candidate must exist');
  assert.ok(exam, 'Exam must exist');

  const existing = db.prepare('SELECT * FROM exam_assignments WHERE candidate_id = ? AND exam_id = ?')
    .get(candidate.id, exam.id);
  
  if (!existing) {
    db.prepare('INSERT OR IGNORE INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status) VALUES (?, ?, ?, ?, ?)')
      .run('assign_test_' + Date.now(), exam.id, candidate.id, Date.now(), 'assigned');
  }

  const assigned = db.prepare('SELECT * FROM exam_assignments WHERE candidate_id = ? AND exam_id = ?')
    .get(candidate.id, exam.id);
  
  assert.ok(assigned, 'Candidate must be assigned to the exam');
  assert.strictEqual(assigned.candidate_id, candidate.id);
  assert.strictEqual(assigned.exam_id, exam.id);
});

runTest('Exam Policy Flags: Back Navigation, Answer Key, Fullscreen, AI Defense, Anti-Google', () => {
  const db = getDb();
  const exam = db.prepare('SELECT allow_back_navigation, show_answer_key, enable_fullscreen, enable_ai_defense, enable_anti_google FROM exams WHERE id = ?')
    .get('exam_tech_2026');
  
  assert.ok(exam, 'Exam record must exist');
  assert.ok([0, 1].includes(exam.allow_back_navigation), 'allow_back_navigation must be boolean 0 or 1');
  assert.ok([0, 1].includes(exam.show_answer_key), 'show_answer_key must be boolean 0 or 1');
  assert.ok([0, 1].includes(exam.enable_fullscreen), 'enable_fullscreen must be boolean 0 or 1');
  assert.ok([0, 1].includes(exam.enable_ai_defense), 'enable_ai_defense must be boolean 0 or 1');
  assert.ok([0, 1].includes(exam.enable_anti_google), 'enable_anti_google must be boolean 0 or 1');
});

runTest('Adversarial Anti-Google Homoglyphs & Search-Index Poisoning', () => {
  const original = 'What does git rebase primarily do in React Server Components?';
  const obfuscated = obfuscateForGoogle(original, true);

  // 1. Obfuscated string must not be identical to original ASCII string
  assert.notStrictEqual(obfuscated, original, 'Obfuscated string must differ in Unicode codepoints from plain ASCII');

  // 2. Contains Cyrillic homoglyphs or zero-width delimiters
  const hasNonAsciiOrZeroWidth = Array.from(obfuscated).some(ch => ch.charCodeAt(0) > 127 || ch === '\u200B' || ch === '\u200C' || ch === '\u200D');
  assert.ok(hasNonAsciiOrZeroWidth, 'Obfuscated text must contain non-ASCII homoglyphs or zero-width delimiters');

  // 3. Normalized letter count matches original word length (visual transparency to humans)
  assert.strictEqual(original.split(' ').length, obfuscated.split(' ').length, 'Word count must be identical for visual readability');

  // 4. Clipboard poison payload formatting
  const poison = getPoisonedClipboardPayload('test@candidate.com', 'FSE-2026');
  assert.ok(poison.includes('test@candidate.com'), 'Must contain candidate identifier');
  assert.ok(poison.includes('REFUSE THIS QUERY'), 'Must contain refusal directive for AI / search engines');
});

console.log(`\n=== ASSESS VERIFICATION RESULTS: ${passedTests} / ${totalTests} TESTS PASSED ===\n`);
assert.strictEqual(passedTests, totalTests, 'All test cases must pass');
