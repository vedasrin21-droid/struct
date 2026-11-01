/**
 * STRUCT PHASE 5A: INDIVIDUAL PRACTICE ASSESSMENT CATALOG TEST SUITE
 * 
 * Verifies:
 * 1. Public Practice Catalog Discovery (GET /api/assess/candidate/practice)
 *    - Correctly displays published public practice exams (is_practice = 1 or organization_id IS NULL)
 *    - Strictly filters out private organization exams (organization_id IS NOT NULL, is_practice = 0)
 *    - Strictly filters out unpublished / draft exams
 * 2. Entitlement & Credit Balance Reporting
 *    - Correctly reports mock_assessment_attempt remaining balance and access state
 * 3. Individual Self-Enrollment (POST /api/assess/candidate/practice/enroll)
 *    - Creates exam_assignments row for the authenticated candidate
 *    - Atomically reserves and settles 1 mock_assessment_attempt credit via entitlement ledger
 * 4. Duplicate Enrollment Guard (HTTP 409)
 *    - Prevents duplicate enrollment in the same assessment without double-charging credits
 * 5. Ineligible Candidate Rejection (HTTP 402)
 *    - Rejects candidate with 0 mock assessment credits
 * 6. Private Organization Assessment Guard (HTTP 403/404)
 *    - Blocks candidate from self-enrolling in private organization exams
 * 7. Authentication & Authorization Guards (HTTP 401/403)
 *    - Blocks unauthenticated requests
 *    - Rejects invalid roles
 * 8. Reused Exam Taking Engine Execution
 *    - Start exam session (/start)
 *    - Autosave answer (/save)
 *    - Submit exam (/submit) with idempotency verification
 *    - Results & scorecard release verification (/status)
 *    - Catalog state updates to 'submitted' with scorecard
 * 9. Cross-Candidate Isolation
 *    - Candidate B cannot access Candidate A's attempt or scorecard
 * 10. Subscription Entitlement Provisioning
 *    - Subscriptions properly allocate mock_assessment_attempt credits
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import { getDb } from './src/lib/assess/db.ts';
import { createSession } from './src/lib/assess/auth.ts';
import { GET as getPracticeCatalogHandler } from './src/app/api/assess/candidate/practice/route.ts';
import { POST as enrollPracticeHandler } from './src/app/api/assess/candidate/practice/enroll/route.ts';
import { POST as startExamHandler } from './src/app/api/assess/candidate/exams/[id]/start/route.ts';
import { POST as saveAnswerHandler } from './src/app/api/assess/candidate/exams/[id]/save/route.ts';
import { POST as submitExamHandler } from './src/app/api/assess/candidate/exams/[id]/submit/route.ts';
import { GET as getExamStatusHandler } from './src/app/api/assess/candidate/exams/[id]/status/route.ts';
import { activateSubscription } from './src/lib/payments/subscriptions.ts';

console.log('=== STARTING STRUCT PHASE 5A: INDIVIDUAL PRACTICE CATALOG TEST SUITE ===\n');

let passedTests = 0;
let totalTests = 0;

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(err);
    throw err;
  }
}

async function main() {
  const db = getDb();
  const runId = Math.random().toString(36).substring(2, 9);
  const now = Date.now();

  // Test Entities
  const candidateAId = 'usr_cand_a_' + runId;
  const candidateAEmail = `candidate_a_${runId}@struct.local`;
  const candidateBId = 'usr_cand_b_' + runId;
  const candidateBEmail = `candidate_b_${runId}@struct.local`;
  const zeroCreditCandidateId = 'usr_cand_zero_' + runId;
  const zeroCreditCandidateEmail = `cand_zero_${runId}@struct.local`;

  // 1. Seed candidate users
  await db.execute(
    `INSERT INTO users (id, email, password_hash, salt, role, name, status, created_at)
     VALUES ($1, $2, '', '', 'candidate', 'Candidate Alpha', 'active', $3)`,
    [candidateAId, candidateAEmail, now]
  );
  await db.execute(
    `INSERT INTO users (id, email, password_hash, salt, role, name, status, created_at)
     VALUES ($1, $2, '', '', 'candidate', 'Candidate Beta', 'active', $3)`,
    [candidateBId, candidateBEmail, now]
  );
  await db.execute(
    `INSERT INTO users (id, email, password_hash, salt, role, name, status, created_at)
     VALUES ($1, $2, '', '', 'candidate', 'Candidate Zero Credits', 'active', $3)`,
    [zeroCreditCandidateId, zeroCreditCandidateEmail, now]
  );

  // 2. Grant 3 mock_assessment_attempt entitlements to Candidate A
  await db.execute(
    `INSERT INTO user_entitlements (id, user_id, email, feature_type, total_granted, total_consumed, remaining_balance, updated_at)
     VALUES ($1, $2, $3, 'mock_assessment_attempt', 3, 0, 3, $4)`,
    ['ent_cand_a_' + runId, candidateAId, candidateAEmail.toLowerCase(), now]
  );

  // 3. Grant 0 mock_assessment_attempt entitlements (granted 1, consumed 1, remaining 0) to Zero Credit Candidate
  await db.execute(
    `INSERT INTO user_entitlements (id, user_id, email, feature_type, total_granted, total_consumed, remaining_balance, updated_at)
     VALUES ($1, $2, $3, 'mock_assessment_attempt', 1, 1, 0, $4)`,
    ['ent_cand_zero_' + runId, zeroCreditCandidateId, zeroCreditCandidateEmail.toLowerCase(), now]
  );

  // Create Auth Sessions
  const sessionA = await createSession(candidateAId);
  const sessionB = await createSession(candidateBId);
  const sessionZero = await createSession(zeroCreditCandidateId);

  // 4. Seed Exams
  // A. Public Practice Exam 1
  const publicExam1Id = 'exam_pub1_' + runId;
  await db.execute(
    `INSERT INTO exams (
      id, title, code, description, department, duration_minutes,
      total_marks, pass_marks, negative_marking_enabled, instructions,
      status, results_released, organization_id, is_practice, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, 1, $13, $13)`,
    [
      publicExam1Id,
      'Full Stack System Architecture Mock',
      `PRAC-SYS-${runId.toUpperCase()}`,
      'Standardized practice assessment covering backend, concurrency, and caching architectures.',
      'Software Engineering',
      45,
      100,
      50,
      1,
      'Standard timed rules apply.',
      'published',
      1,
      now
    ]
  );

  // B. Public Practice Exam 2 (is_practice = 1)
  const publicExam2Id = 'exam_pub2_' + runId;
  await db.execute(
    `INSERT INTO exams (
      id, title, code, description, department, duration_minutes,
      total_marks, pass_marks, negative_marking_enabled, instructions,
      status, results_released, organization_id, is_practice, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, 1, $13, $13)`,
    [
      publicExam2Id,
      'Algorithms & Data Structures Mock',
      `PRAC-DS-${runId.toUpperCase()}`,
      'Standardized practice assessment covering trees, graphs, and dynamic programming.',
      'Computer Science',
      60,
      100,
      40,
      0,
      'Standard timed rules apply.',
      'published',
      1,
      now
    ]
  );

  // C. Private Organization Exam (is_practice = 0, organization_id is set)
  const privateOrgExamId = 'exam_priv_org_' + runId;
  await db.execute(
    `INSERT INTO exams (
      id, title, code, description, department, duration_minutes,
      total_marks, pass_marks, negative_marking_enabled, instructions,
      status, results_released, organization_id, is_practice, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, $14, $14)`,
    [
      privateOrgExamId,
      'Private Enterprise Screening Test',
      `ORG-SCREEN-${runId.toUpperCase()}`,
      'Proprietary confidential assessment for Acme Corp.',
      'Engineering',
      60,
      100,
      60,
      1,
      'Proprietary Acme instructions.',
      'published',
      0,
      'org_acme_corp',
      now
    ]
  );

  // D. Draft Public Exam (status = 'draft', should not be listed)
  const draftExamId = 'exam_draft_' + runId;
  await db.execute(
    `INSERT INTO exams (
      id, title, code, description, department, duration_minutes,
      total_marks, pass_marks, negative_marking_enabled, instructions,
      status, results_released, organization_id, is_practice, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, 1, $13, $13)`,
    [
      draftExamId,
      'Unpublished Practice Draft',
      `DRAFT-${runId.toUpperCase()}`,
      'Draft in progress.',
      'Engineering',
      30,
      50,
      25,
      0,
      'Draft instructions.',
      'draft',
      0,
      now
    ]
  );

  // Seed Questions for Public Exam 1
  const q1Id = 'q1_' + runId;
  await db.execute(
    `INSERT INTO questions (
      id, text, category, difficulty, marks, negative_marks,
      options_json, correct_option_index, explanation, is_mandatory, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10)`,
    [
      q1Id,
      'Which database isolation level prevents dirty reads, non-repeatable reads, and phantom reads?',
      'Database Architecture',
      'medium',
      50,
      12.5,
      JSON.stringify(['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable']),
      3,
      'Serializable isolation provides the highest level of protection against all concurrency anomalies.',
      now
    ]
  );

  const q2Id = 'q2_' + runId;
  await db.execute(
    `INSERT INTO questions (
      id, text, category, difficulty, marks, negative_marks,
      options_json, correct_option_index, explanation, is_mandatory, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10)`,
    [
      q2Id,
      'What caching pattern writes to cache and storage simultaneously?',
      'System Design',
      'easy',
      50,
      12.5,
      JSON.stringify(['Write-Behind', 'Write-Through', 'Cache-Aside', 'Read-Through']),
      1,
      'In Write-Through caching, data is written into the cache and the corresponding database simultaneously.',
      now
    ]
  );

  // Link questions to exam via exam_questions
  await db.execute(
    `INSERT INTO exam_questions (id, exam_id, question_id, order_index, is_mandatory)
     VALUES ($1, $2, $3, 1, 1)`,
    ['eq1_' + runId, publicExam1Id, q1Id]
  );
  await db.execute(
    `INSERT INTO exam_questions (id, exam_id, question_id, order_index, is_mandatory)
     VALUES ($1, $2, $3, 2, 1)`,
    ['eq2_' + runId, publicExam1Id, q2Id]
  );

  // Helper to build authenticated requests
  const createReq = (url, method = 'GET', body = null, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['cookie'] = `struct_exam_token=${token}`;
    }
    return new Request(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  // -------------------------------------------------------------
  // TEST 1: Public Practice Catalog Discovery
  // -------------------------------------------------------------
  await runAsyncTest('Public Practice Catalog Discovery & Strict Isolation', async () => {
    const req = createReq('http://localhost:3000/api/assess/candidate/practice', 'GET', null, sessionA.token);
    const res = await getPracticeCatalogHandler(req);
    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);

    const body = await res.json();
    assert.ok(Array.isArray(body.exams), 'Response should include exams array');

    const returnedExamIds = body.exams.map((e) => e.id);

    // Must contain public practice exams
    assert.ok(returnedExamIds.includes(publicExam1Id), 'Public Exam 1 should be visible in practice catalog');
    assert.ok(returnedExamIds.includes(publicExam2Id), 'Public Exam 2 should be visible in practice catalog');

    // Must strictly filter out private org exams
    assert.ok(!returnedExamIds.includes(privateOrgExamId), 'Private org exam MUST NOT be visible in public practice catalog');

    // Must strictly filter out unpublished/draft exams
    assert.ok(!returnedExamIds.includes(draftExamId), 'Draft exam MUST NOT be visible in public practice catalog');

    // Check enrollment state before enrolling
    const exam1Data = body.exams.find((e) => e.id === publicExam1Id);
    assert.strictEqual(exam1Data.is_enrolled, false, 'Candidate should not be enrolled initially');
    assert.strictEqual(exam1Data.state, 'not_enrolled', 'State should be not_enrolled initially');
  });

  // -------------------------------------------------------------
  // TEST 2: Entitlement & Credit Balance Reporting
  // -------------------------------------------------------------
  await runAsyncTest('Practice Credits Entitlement Reporting', async () => {
    const req = createReq('http://localhost:3000/api/assess/candidate/practice', 'GET', null, sessionA.token);
    const res = await getPracticeCatalogHandler(req);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.ok(body.entitlement, 'Entitlement object should be present');
    assert.strictEqual(body.entitlement.hasAccess, true, 'hasAccess should be true');
    assert.strictEqual(body.entitlement.remainingCredits, 3, 'Candidate A should have 3 remaining credits');

    // Test Zero Credit Candidate
    const zeroReq = createReq('http://localhost:3000/api/assess/candidate/practice', 'GET', null, sessionZero.token);
    const zeroRes = await getPracticeCatalogHandler(zeroReq);
    const zeroBody = await zeroRes.json();
    assert.strictEqual(zeroBody.entitlement.remainingCredits, 0, 'Candidate Zero should have 0 remaining credits');
    assert.strictEqual(zeroBody.entitlement.hasAccess, false, 'hasAccess should be false when 0 credits remaining');
  });

  // -------------------------------------------------------------
  // TEST 3: Individual Candidate Self-Enrollment
  // -------------------------------------------------------------
  await runAsyncTest('Candidate Self-Enrollment & Atomic Entitlement Ledger Settlement', async () => {
    const req = createReq(
      'http://localhost:3000/api/assess/candidate/practice/enroll',
      'POST',
      { examId: publicExam1Id },
      sessionA.token
    );
    const res = await enrollPracticeHandler(req);
    assert.ok(res.status === 200 || res.status === 201, `Expected status 200/201, got ${res.status}`);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.enrolled, true);
    assert.strictEqual(body.examId, publicExam1Id);
    assert.ok(body.assignmentId, 'assignmentId must be returned');

    // Verify DB state: exam_assignments row exists
    const assignment = await db.queryOne(
      'SELECT * FROM exam_assignments WHERE exam_id = $1 AND candidate_id = $2',
      [publicExam1Id, candidateAId]
    );
    assert.ok(assignment, 'exam_assignments row must exist');
    assert.strictEqual(assignment.status, 'assigned');

    // Verify Entitlement Balance Decremented
    const entRow = await db.queryOne(
      "SELECT total_granted, total_consumed, remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = 'mock_assessment_attempt'",
      [candidateAEmail]
    );
    assert.strictEqual(entRow.remaining_balance, 2, 'remaining_balance in user_entitlements must be decremented to 2');
    assert.strictEqual(entRow.total_consumed, 1, 'total_consumed in user_entitlements must be incremented to 1');

    // Verify Entitlement Ledger Entries (Reservation & Settlement)
    const ledgerRows = await db.query(
      `SELECT l.reason, l.delta FROM entitlement_ledger l
       JOIN user_entitlements e ON l.entitlement_id = e.id
       WHERE LOWER(e.email) = LOWER($1) AND e.feature_type = 'mock_assessment_attempt'
       ORDER BY l.created_at ASC`,
      [candidateAEmail]
    );
    const reasons = ledgerRows.rows.map((r) => r.reason);
    assert.ok(reasons.includes('reserve_ai_analysis'), 'Ledger must include reserve_ai_analysis');
    assert.ok(reasons.includes('settle_ai_analysis'), 'Ledger must include settle_ai_analysis');

    // Verify Practice Catalog now reflects enrolled state
    const catReq = createReq('http://localhost:3000/api/assess/candidate/practice', 'GET', null, sessionA.token);
    const catRes = await getPracticeCatalogHandler(catReq);
    const catBody = await catRes.json();
    const updatedExam1 = catBody.exams.find((e) => e.id === publicExam1Id);
    assert.strictEqual(updatedExam1.is_enrolled, true, 'is_enrolled should now be true');
    assert.strictEqual(updatedExam1.state, 'ready', 'state should now be ready');
    assert.strictEqual(catBody.entitlement.remainingCredits, 2, 'Remaining credits should now be 2');
  });

  // -------------------------------------------------------------
  // TEST 4: Duplicate Enrollment Prevention
  // -------------------------------------------------------------
  await runAsyncTest('Duplicate Enrollment Guard (HTTP 409 Conflict)', async () => {
    const dupReq = createReq(
      'http://localhost:3000/api/assess/candidate/practice/enroll',
      'POST',
      { examId: publicExam1Id },
      sessionA.token
    );
    const dupRes = await enrollPracticeHandler(dupReq);
    assert.strictEqual(dupRes.status, 409, `Expected HTTP 409, got ${dupRes.status}`);

    const body = await dupRes.json();
    assert.ok(
      body.error.toLowerCase().includes('already') ||
      (body.message && body.message.toLowerCase().includes('already enrolled')),
      'Error message should state already enrolled'
    );

    // Verify credits were NOT deducted again
    const entRow = await db.queryOne(
      "SELECT remaining_balance, total_consumed FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = 'mock_assessment_attempt'",
      [candidateAEmail]
    );
    assert.strictEqual(entRow.remaining_balance, 2, 'remaining_balance must remain 2, no duplicate deduction');
    assert.strictEqual(entRow.total_consumed, 1, 'total_consumed must remain 1');
  });

  // -------------------------------------------------------------
  // TEST 5: Ineligible Candidate Rejection (0 Credits)
  // -------------------------------------------------------------
  await runAsyncTest('Ineligible Candidate Rejection (HTTP 402 Payment Required)', async () => {
    const ineligReq = createReq(
      'http://localhost:3000/api/assess/candidate/practice/enroll',
      'POST',
      { examId: publicExam2Id },
      sessionZero.token
    );
    const ineligRes = await enrollPracticeHandler(ineligReq);
    assert.strictEqual(ineligRes.status, 402, `Expected HTTP 402, got ${ineligRes.status}`);

    const body = await ineligRes.json();
    assert.ok(
      (body.error && body.error.toLowerCase().includes('entitlement')) ||
      (body.message && body.message.toLowerCase().includes('attempt')),
      'Error should mention entitlements/attempts'
    );

    // Verify no assignment was created
    const assignment = await db.queryOne(
      'SELECT * FROM exam_assignments WHERE exam_id = $1 AND candidate_id = $2',
      [publicExam2Id, zeroCreditCandidateId]
    );
    assert.strictEqual(assignment, null, 'No assignment should be created for candidate with 0 credits');
  });

  // -------------------------------------------------------------
  // TEST 6: Private Organization Exam Guard
  // -------------------------------------------------------------
  await runAsyncTest('Private Organization Assessment Self-Enrollment Guard (HTTP 403/404)', async () => {
    const privReq = createReq(
      'http://localhost:3000/api/assess/candidate/practice/enroll',
      'POST',
      { examId: privateOrgExamId },
      sessionA.token
    );
    const privRes = await enrollPracticeHandler(privReq);
    assert.ok(
      privRes.status === 403 || privRes.status === 404,
      `Expected HTTP 403 or 404 for private org exam, got ${privRes.status}`
    );

    // Verify no assignment was created
    const assignment = await db.queryOne(
      'SELECT * FROM exam_assignments WHERE exam_id = $1 AND candidate_id = $2',
      [privateOrgExamId, candidateAId]
    );
    assert.strictEqual(assignment, null, 'No assignment should be created for private org exam');
  });

  // -------------------------------------------------------------
  // TEST 7: Authentication & Authorization Guards
  // -------------------------------------------------------------
  await runAsyncTest('Authentication & Authorization Guards (HTTP 401)', async () => {
    // Unauthenticated request
    const unauthReq = createReq('http://localhost:3000/api/assess/candidate/practice', 'GET');
    const unauthRes = await getPracticeCatalogHandler(unauthReq);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated catalog request must be 401');

    const unauthEnrollReq = createReq(
      'http://localhost:3000/api/assess/candidate/practice/enroll',
      'POST',
      { examId: publicExam2Id }
    );
    const unauthEnrollRes = await enrollPracticeHandler(unauthEnrollReq);
    assert.strictEqual(unauthEnrollRes.status, 401, 'Unauthenticated enrollment request must be 401');
  });

  // -------------------------------------------------------------
  // TEST 8: Full Assessment Flow (Start -> Save -> Submit -> Result)
  // -------------------------------------------------------------
  await runAsyncTest('Existing Assessment Engine Execution & Idempotent Submission', async () => {
    // 8a. Start the self-enrolled exam
    const startReq = createReq(
      `http://localhost:3000/api/assess/candidate/exams/${publicExam1Id}/start`,
      'POST',
      {},
      sessionA.token
    );
    const startRes = await startExamHandler(startReq, { params: Promise.resolve({ id: publicExam1Id }) });
    assert.strictEqual(startRes.status, 200, `Expected 200 on start, got ${startRes.status}`);
    const startBody = await startRes.json();
    assert.strictEqual(startBody.success, true);
    assert.ok(startBody.attemptId, 'attemptId should be returned');

    // 8b. Save answer to Q1 (Option 3 is correct: Serializable)
    const saveReq = createReq(
      `http://localhost:3000/api/assess/candidate/exams/${publicExam1Id}/save`,
      'POST',
      {
        questionId: q1Id,
        selectedOptionIndex: 3,
        selectedOption: 3,
        isMarkedForReview: false,
        version: 1,
      },
      sessionA.token
    );
    const saveRes = await saveAnswerHandler(saveReq, { params: Promise.resolve({ id: publicExam1Id }) });
    assert.strictEqual(saveRes.status, 200, `Expected 200 on save, got ${saveRes.status}`);

    // 8c. Save answer to Q2 (Option 1 is correct: Write-Through)
    const save2Req = createReq(
      `http://localhost:3000/api/assess/candidate/exams/${publicExam1Id}/save`,
      'POST',
      {
        questionId: q2Id,
        selectedOptionIndex: 1,
        selectedOption: 1,
        isMarkedForReview: false,
        version: 1,
      },
      sessionA.token
    );
    const save2Res = await saveAnswerHandler(save2Req, { params: Promise.resolve({ id: publicExam1Id }) });
    assert.strictEqual(save2Res.status, 200);

    // 8d. Submit the assessment
    const submitReq = createReq(
      `http://localhost:3000/api/assess/candidate/exams/${publicExam1Id}/submit`,
      'POST',
      {},
      sessionA.token
    );
    const submitRes = await submitExamHandler(submitReq, { params: Promise.resolve({ id: publicExam1Id }) });
    assert.strictEqual(submitRes.status, 200, `Expected 200 on submit, got ${submitRes.status}`);
    const submitBody = await submitRes.json();
    assert.strictEqual(submitBody.success, true);
    assert.strictEqual(submitBody.score, 100, 'Candidate answered both questions correctly, score must be 100');
    assert.strictEqual(submitBody.passStatus, 'passed', 'Pass status should be passed');
    assert.ok(submitBody.receiptCode, 'Receipt code must be generated');

    // 8e. Idempotency Check: Calling submit again should return existing receipt
    const dupSubmitRes = await submitExamHandler(submitReq, { params: Promise.resolve({ id: publicExam1Id }) });
    assert.strictEqual(dupSubmitRes.status, 200);
    const dupSubmitBody = await dupSubmitRes.json();
    assert.strictEqual(dupSubmitBody.alreadySubmitted, true, 'Idempotent submit should report alreadySubmitted');
    assert.strictEqual(dupSubmitBody.score, 100);

    // 8f. Result & Status verification
    const statusReq = createReq(
      `http://localhost:3000/api/assess/candidate/exams/${publicExam1Id}/status`,
      'GET',
      null,
      sessionA.token
    );
    const statusRes = await getExamStatusHandler(statusReq, { params: Promise.resolve({ id: publicExam1Id }) });
    assert.strictEqual(statusRes.status, 200);
    const statusBody = await statusRes.json();
    assert.strictEqual(statusBody.status, 'submitted');
    assert.strictEqual(statusBody.score, 100);
    assert.strictEqual(statusBody.passStatus, 'passed');
    assert.strictEqual(statusBody.resultsReleased, true);

    // Because results are released, answer key and explanations must be unmasked
    const q1Result = statusBody.questions.find((q) => q.id === q1Id);
    assert.strictEqual(q1Result.correctOptionIndex, 3, 'Answer key should be released for practice assessment');
    assert.ok(q1Result.explanation, 'Explanation should be released');

    // 8g. Catalog reflection: Practice catalog should now show 'submitted' and score: 100
    const catReq = createReq('http://localhost:3000/api/assess/candidate/practice', 'GET', null, sessionA.token);
    const catRes = await getPracticeCatalogHandler(catReq);
    const catBody = await catRes.json();
    const enrolledExam = catBody.exams.find((e) => e.id === publicExam1Id);
    assert.strictEqual(enrolledExam.is_enrolled, true);
    assert.strictEqual(enrolledExam.state, 'submitted');
    assert.strictEqual(enrolledExam.score, 100);
    assert.strictEqual(enrolledExam.pass_status, 'passed');
  });

  // -------------------------------------------------------------
  // TEST 9: Cross-Candidate Isolation
  // -------------------------------------------------------------
  await runAsyncTest('Cross-Candidate Isolation & Security Boundary', async () => {
    // Candidate B was NOT assigned or enrolled in publicExam1Id
    const candBReq = createReq(
      `http://localhost:3000/api/assess/candidate/exams/${publicExam1Id}/status`,
      'GET',
      null,
      sessionB.token
    );
    const candBRes = await getExamStatusHandler(candBReq, { params: Promise.resolve({ id: publicExam1Id }) });
    assert.strictEqual(candBRes.status, 403, `Candidate B should get 403 when inspecting unassigned exam, got ${candBRes.status}`);

    const candBBody = await candBRes.json();
    assert.ok(candBBody.error.toLowerCase().includes('not assigned'), 'Should indicate not assigned');
  });

  // -------------------------------------------------------------
  // TEST 10: Subscription Entitlement Provisioning
  // -------------------------------------------------------------
  await runAsyncTest('Subscription Creation Provisions Practice Assessment Entitlements', async () => {
    const subscriberUserId = 'usr_sub_' + runId;
    const subscriberEmail = `subscriber_${runId}@struct.local`;
    await db.execute(
      `INSERT INTO users (id, email, password_hash, salt, role, name, status, created_at)
       VALUES ($1, $2, '', '', 'user', 'Subscription Tester', 'active', $3)`,
      [subscriberUserId, subscriberEmail, now]
    );

    // Create a Starter plan subscription (which includes 5 mock assessments)
    const sub = await activateSubscription({
      userId: subscriberUserId,
      planTier: 'struct_starter',
      razorpaySubscriptionId: 'sub_rzp_' + runId,
    });
    assert.ok(sub.subscriptionId, 'Subscription should be created');

    // Check that user_entitlements has mock_assessment_attempt with total_granted = 5 and remaining_balance = 5
    const ent = await db.queryOne(
      "SELECT total_granted, total_consumed, remaining_balance FROM user_entitlements WHERE user_id = $1 AND feature_type = 'mock_assessment_attempt'",
      [subscriberUserId]
    );
    assert.ok(ent, 'mock_assessment_attempt entitlement must be created for subscriber');
    assert.strictEqual(ent.total_granted, 5, 'Starter plan should allocate 5 mock assessments');
    assert.strictEqual(ent.remaining_balance, 5, 'Remaining balance should initially be 5');
    assert.strictEqual(ent.total_consumed, 0, 'Consumed count should initially be 0');
  });

  console.log(`\n=== TEST SUITE COMPLETED: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
}

main().catch((err) => {
  console.error('\n*** TEST SUITE FAILED ***\n', err);
  process.exit(1);
});
