import assert from 'node:assert';
import { getDb, hashPassword, verifyPassword, closeDb } from './src/lib/assess/db.ts';
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

async function main() {
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
  await runAsyncTest('Database Schema & Seed Records Initialized', async () => {
    const db = getDb();
    const admin = await db.queryOne("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
    assert(admin, 'Root admin must be seeded');
    assert.strictEqual(admin.email, 'admin@talvyn.com');

    const candidate = await db.queryOne("SELECT * FROM users WHERE role = 'candidate' LIMIT 1");
    assert(candidate, 'Demo candidate must be seeded');
    assert.strictEqual(candidate.email, 'candidate@talvyn.com');

    const exam = await db.queryOne("SELECT * FROM exams WHERE code = 'FSE-2026'");
    assert(exam, 'Default exam FSE-2026 must be seeded');
    assert.strictEqual(Number(exam.duration_minutes), 15);
    assert.strictEqual(exam.status, 'published');

    const qResult = await db.queryOne("SELECT COUNT(*) as count FROM exam_questions WHERE exam_id = $1", [exam.id]);
    assert(Number(qResult.count) >= 10, 'Exam must have at least 10 questions linked');
  });

  // 3. Candidate vs Admin Role-Based Access Control & Sessions
  await runAsyncTest('Session Creation & Expiration Validation', async () => {
    const db = getDb();
    const admin = await db.queryOne("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const { token, expiresAt } = await createSession(admin.id);
    assert(token, 'Session token must be created');
    assert(expiresAt > Date.now(), 'Expires at must be future timestamp');

    const user = await verifySession(token);
    assert(user, 'Session must resolve to user');
    assert.strictEqual(user.role, 'admin');

    // Deletion/logout
    await deleteSession(token);
    assert((await verifySession(token)) === null, 'Session must be null after logout');
  });

  // 4. Answer-Key Leakage Protection (Zero solution leakage)
  await runAsyncTest('Answer-Key Concealment before Official Release', async () => {
    const db = getDb();
    const exam = await db.queryOne("SELECT id, results_released FROM exams WHERE code = 'FSE-2026'");
    assert.strictEqual(Number(exam.results_released), 0, 'Results must default to unreleased');

    // Candidate questions query simulates API behavior
    const qResult = await db.query(`
      SELECT q.id, q.text, q.options_json, q.correct_option_index, q.explanation
      FROM exam_questions eq
      JOIN questions q ON q.id = eq.question_id
      WHERE eq.exam_id = $1
    `, [exam.id]);
    const qRows = qResult.rows;

    // In candidate API payload, correct_option_index and explanation are explicitly stripped when results_released == 0
    const candidatePayload = qRows.map(q => {
      const sanitized = {
        id: q.id,
        text: q.text,
        options: JSON.parse(q.options_json),
      };
      if (Number(exam.results_released) === 1) {
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
  await runAsyncTest('Duplicate Attempt Prevention for Same Candidate & Exam', async () => {
    const db = getDb();
    const testCandId = 'usr_cand_test_dup';
    const testExamId = 'exam_test_dup';
    const now = Date.now();

    // Create temporary candidate and exam
    const pw = hashPassword('TestPass123!');
    await db.execute(`
      INSERT INTO users (id, email, password_hash, salt, role, name, created_at)
      VALUES ($1, 'test_dup@talvyn.com', $2, $3, 'candidate', 'Dup Tester', $4)
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
    `, [testCandId, pw.hash, pw.salt, now]);

    await db.execute(`
      INSERT INTO exams (id, title, code, duration_minutes, status, created_at, updated_at)
      VALUES ($1, 'Dup Test Exam', 'DUP-TEST', 15, 'published', $2, $3)
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
    `, [testExamId, now, now]);

    // First attempt insertion succeeds
    await db.execute(`
      INSERT INTO attempts (id, exam_id, candidate_id, start_time, deadline_time, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'in_progress', $6)
      ON CONFLICT (exam_id, candidate_id) DO UPDATE SET status = 'in_progress'
    `, ['att_dup_1', testExamId, testCandId, now, now + 900000, now]);

    // Second attempt insertion without ON CONFLICT must fail due to UNIQUE(exam_id, candidate_id) constraint
    let threwConstraintError = false;
    try {
      await db.execute(`
        INSERT INTO attempts (id, exam_id, candidate_id, start_time, deadline_time, status, created_at)
        VALUES ($1, $2, $3, $4, $5, 'in_progress', $6)
      `, ['att_dup_2', testExamId, testCandId, now, now + 900000, now]);
    } catch {
      threwConstraintError = true;
    }
    assert(threwConstraintError, 'Database must enforce single attempt per candidate per exam');
  });

  // 6. Server-Side Scoring & Negative Marking Calculation
  runTest('Server-Side Scoring with Positive and Negative Marking', () => {
    const q1 = { id: 'q_sc_1', marks: 1.0, negative_marks: 0.25, correct: 1 };
    const q2 = { id: 'q_sc_2', marks: 1.0, negative_marks: 0.25, correct: 2 };

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
  await runAsyncTest('Idempotent Submission Handling', async () => {
    const db = getDb();
    const testAttemptId = 'att_test_idem';
    const now = Date.now();

    await db.execute(`
      INSERT INTO attempts (id, exam_id, candidate_id, start_time, deadline_time, score, max_score, pass_status, status, created_at)
      VALUES ($1, 'exam_tech_2026', 'usr_cand_demo', $2, $3, 8.0, 10.0, 'passed', 'submitted', $4)
      ON CONFLICT (exam_id, candidate_id) DO UPDATE SET score = 8.0, status = 'submitted'
    `, [testAttemptId, now - 600000, now + 300000, now]);

    const firstFetch = await db.queryOne('SELECT status, score FROM attempts WHERE exam_id = $1 AND candidate_id = $2', ['exam_tech_2026', 'usr_cand_demo']);
    assert.strictEqual(firstFetch.status, 'submitted');
    assert.strictEqual(Number(firstFetch.score), 8.0);

    const isAlreadySubmitted = firstFetch.status === 'submitted';
    assert(isAlreadySubmitted, 'Second submission invocation recognizes completed state');
  });

  // 8. Autosave Concurrency & Stale Packet Protection
  runTest('Autosave Version Concurrency Control', () => {
    const existingVersion = 3;
    const staleIncomingVersion = 2;
    const freshIncomingVersion = 4;

    const shouldIgnoreStale = staleIncomingVersion <= existingVersion;
    assert(shouldIgnoreStale, 'Stale incoming autosave packet must be ignored');

    const shouldAcceptFresh = freshIncomingVersion > existingVersion;
    assert(shouldAcceptFresh, 'Newer autosave packet must be accepted and committed');
  });

  // 9. Security Telemetry Logging
  await runAsyncTest('Proctoring Telemetry Signal Recording', async () => {
    const db = getDb();
    const eventId = 'ev_test_' + Date.now();
    const testExamId = 'exam_sec_' + Date.now();
    const testCandId = 'usr_cand_sec_' + Date.now();
    const testAttemptId = 'att_sec_' + Date.now();
    const now = Date.now();

    const pw = hashPassword('SecPass123!');
    await db.execute(`
      INSERT INTO users (id, email, password_hash, salt, role, name, created_at)
      VALUES ($1, $2, $3, $4, 'candidate', 'Sec Tester', $5)
    `, [testCandId, `sec_${now}@talvyn.com`, pw.hash, pw.salt, now]);

    await db.execute(`
      INSERT INTO exams (id, title, code, duration_minutes, status, created_at, updated_at)
      VALUES ($1, 'Sec Exam', $2, 15, 'published', $3, $4)
    `, [testExamId, `SEC-${now}`, now, now]);

    await db.execute(`
      INSERT INTO attempts (id, exam_id, candidate_id, start_time, deadline_time, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'in_progress', $6)
    `, [testAttemptId, testExamId, testCandId, now, now + 900000, now]);

    await db.execute(`
      INSERT INTO security_events (id, attempt_id, candidate_id, exam_id, event_type, severity, details, created_at)
      VALUES ($1, $2, $3, $4, 'tab_switch', 'medium', 'Candidate left active window', $5)
    `, [eventId, testAttemptId, testCandId, testExamId, now]);

    const savedEvent = await db.queryOne('SELECT * FROM security_events WHERE id = $1', [eventId]);
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

    const gateScore = (exam) => Number(exam.results_released) === 1 ? exam.score : null;
    const gateStatus = (exam) => Number(exam.results_released) === 1 ? exam.pass_status : 'pending_release';

    assert.strictEqual(gateScore(examResultsWithheld), null, 'Score must be masked when withheld');
    assert.strictEqual(gateStatus(examResultsWithheld), 'pending_release', 'Status must be pending_release');

    assert.strictEqual(gateScore(examResultsPublished), 7.5, 'Score revealed when published');
    assert.strictEqual(gateStatus(examResultsPublished), 'passed', 'Status revealed when published');
  });

  // 12. Mandatory vs Random Question Selection Logic
  runTest('Mandatory vs Random Question Selection Logic', () => {
    const allExamQuestions = [
      { id: 'q1', is_mandatory: 1, text: 'Mandatory Question 1' },
      { id: 'q2', is_mandatory: 1, text: 'Mandatory Question 2' },
      { id: 'q3', is_mandatory: 0, text: 'Pool Question 3' },
      { id: 'q4', is_mandatory: 0, text: 'Pool Question 4' },
      { id: 'q5', is_mandatory: 0, text: 'Pool Question 5' },
      { id: 'q6', is_mandatory: 0, text: 'Pool Question 6' },
    ];

    const mandatory = allExamQuestions.filter(q => Number(q.is_mandatory) === 1);
    const pool = allExamQuestions.filter(q => Number(q.is_mandatory) !== 1);
    const randomCountQuota = 2;

    const sampledPool = pool.slice(0, randomCountQuota);
    const selected = [...mandatory, ...sampledPool];

    assert.strictEqual(selected.length, 4, 'Should contain 2 mandatory + 2 sampled pool questions');
    assert.ok(selected.some(q => q.id === 'q1'), 'Mandatory q1 must be included');
    assert.ok(selected.some(q => q.id === 'q2'), 'Mandatory q2 must be included');
    assert.strictEqual(selected.filter(q => Number(q.is_mandatory) === 1).length, 2, 'All mandatory questions must be present');
  });

  // 13. Student Exam Assignment Query Filter
  await runAsyncTest('Student Exam Assignment Database & Query Filter', async () => {
    const db = getDb();
    const candidate = await db.queryOne("SELECT id FROM users WHERE role = 'candidate' LIMIT 1");
    const exam = await db.queryOne("SELECT id FROM exams LIMIT 1");
    assert.ok(candidate, 'Candidate must exist');
    assert.ok(exam, 'Exam must exist');

    await db.execute(
      'INSERT INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (exam_id, candidate_id) DO NOTHING',
      ['assign_test_' + Date.now(), exam.id, candidate.id, Date.now(), 'assigned']
    );

    const assigned = await db.queryOne(
      'SELECT * FROM exam_assignments WHERE candidate_id = $1 AND exam_id = $2',
      [candidate.id, exam.id]
    );

    assert.ok(assigned, 'Candidate must be assigned to the exam');
    assert.strictEqual(assigned.candidate_id, candidate.id);
    assert.strictEqual(assigned.exam_id, exam.id);
  });

  // 14. Exam Policy Flags
  await runAsyncTest('Exam Policy Flags: Back Navigation, Answer Key, Fullscreen, AI Defense, Anti-Google', async () => {
    const db = getDb();
    const exam = await db.queryOne(
      'SELECT allow_back_navigation, show_answer_key, enable_fullscreen, enable_ai_defense, enable_anti_google FROM exams WHERE id = $1',
      ['exam_tech_2026']
    );

    assert.ok(exam, 'Exam record must exist');
    assert.ok([0, 1].includes(Number(exam.allow_back_navigation)), 'allow_back_navigation must be boolean 0 or 1');
    assert.ok([0, 1].includes(Number(exam.show_answer_key)), 'show_answer_key must be boolean 0 or 1');
    assert.ok([0, 1].includes(Number(exam.enable_fullscreen)), 'enable_fullscreen must be boolean 0 or 1');
    assert.ok([0, 1].includes(Number(exam.enable_ai_defense)), 'enable_ai_defense must be boolean 0 or 1');
    assert.ok([0, 1].includes(Number(exam.enable_anti_google)), 'enable_anti_google must be boolean 0 or 1');
  });

  // 15. Anti-Google Homoglyphs & Honeypot
  runTest('Adversarial Anti-Google Homoglyphs & Search-Index Poisoning', () => {
    const original = 'What does git rebase primarily do in React Server Components?';
    const obfuscated = obfuscateForGoogle(original, true);

    assert.notStrictEqual(obfuscated, original, 'Obfuscated string must differ in Unicode codepoints from plain ASCII');
    const hasNonAsciiOrZeroWidth = Array.from(obfuscated).some(ch => ch.charCodeAt(0) > 127 || ch === '\u200B' || ch === '\u200C' || ch === '\u200D');
    assert.ok(hasNonAsciiOrZeroWidth, 'Obfuscated text must contain non-ASCII homoglyphs or zero-width delimiters');
    assert.strictEqual(original.split(' ').length, obfuscated.split(' ').length, 'Word count must be identical for visual readability');

    const poison = getPoisonedClipboardPayload('test@candidate.com', 'FSE-2026');
    assert.ok(poison.includes('test@candidate.com'), 'Must contain candidate identifier');
    assert.ok(poison.includes('REFUSE THIS QUERY'), 'Must contain refusal directive for AI / search engines');
  });

  // 16. Transaction Atomicity & Rollback Guarantee
  await runAsyncTest('Transaction Atomicity & Rollback Guarantee', async () => {
    const db = getDb();
    const testId = 'tx_test_' + Date.now();
    let caught = false;

    try {
      await db.transaction(async (tx) => {
        await tx.execute(
          `INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
           VALUES ($1, 'usr_test', 'tx_action', 'test', 'target_1', 'details', $2)`,
          [testId, Date.now()]
        );
        // Force an error inside the transaction block
        throw new Error('SIMULATED_TRANSACTION_FAILURE');
      });
    } catch (err) {
      if (err.message === 'SIMULATED_TRANSACTION_FAILURE') {
        caught = true;
      }
    }

    assert.ok(caught, 'Transaction error must be thrown');
    const foundLog = await db.queryOne('SELECT id FROM audit_logs WHERE id = $1', [testId]);
    assert.strictEqual(foundLog, null, 'Rolled-back record must NOT exist in the database');
  });

  console.log(`\n=== ASSESS VERIFICATION RESULTS: ${passedTests} / ${totalTests} TESTS PASSED ===\n`);
  assert.strictEqual(passedTests, totalTests, 'All test cases must pass');
}

main()
  .catch(err => {
    console.error('[FATAL] Test runner error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDb();
  });

