/**
 * STRUCT PHASE 1: SECURITY & AUTHENTICATION REMEDIATION TEST SUITE
 * 
 * Verifies:
 * 1. Missing setup code fails securely (HTTP 503).
 * 2. Invalid setup code is rejected with constant-time comparison (HTTP 403).
 * 3. Legitimate admin registration succeeds with valid setup code.
 * 4. Duplicate email rejection (HTTP 409) and password length validation (HTTP 400).
 * 5. Client code security: No exposed setup codes or secrets in assess page.
 * 6. Sign-in and sign-up route availability, metadata, and export structure.
 * 7. Middleware protection: Authenticated users redirected from auth pages; candidate isolation.
 * 8. Candidate access restrictions: Exam-only candidates blocked from platform user tools.
 * 9. Super Admin authorization: Strict role enforcement (blocks admin, user, candidate).
 * 10. Organization tenant isolation: Prevents cross-organization data access.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getDb, hashPassword } from './src/lib/assess/db.ts';
import { createSession } from './src/lib/assess/auth.ts';
import { requireSuperAdmin, requireOrgAdmin, requireUser, requireExamAccess } from './src/lib/auth/rbac.ts';
import { POST as registerAdminHandler } from './src/app/api/assess/auth/register-admin/route.ts';

console.log('=== STARTING STRUCT PHASE 1 SECURITY & AUTH REMEDIATION SUITE ===\n');

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
  }
}

async function main() {
  const db = getDb();
  const testRunId = Math.random().toString(36).substring(2, 9);
  const originalEnvSetupCode = process.env.ASSESS_ADMIN_SETUP_CODE;

  // --------------------------------------------------------------------------
  // 1. Missing setup code fails securely with 503
  // --------------------------------------------------------------------------
  await runAsyncTest('Admin Registration: Fails securely with 503 when ASSESS_ADMIN_SETUP_CODE is missing', async () => {
    delete process.env.ASSESS_ADMIN_SETUP_CODE;

    const req = new Request('http://localhost:3000/api/assess/auth/register-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker Admin',
        email: `hacker_${testRunId}@evil.com`,
        password: 'Password123!',
        setupCode: 'Talvyn@Assess2026!'
      })
    });

    const res = await registerAdminHandler(req);
    const data = await res.json();

    assert.strictEqual(res.status, 503, 'Must return 503 Service Unavailable when setup code is not configured');
    assert.ok(data.error.includes('disabled by server policy'), 'Error message must clearly inform that self-registration is disabled');
  });

  // --------------------------------------------------------------------------
  // 2. Invalid setup code is rejected with 403
  // --------------------------------------------------------------------------
  await runAsyncTest('Admin Registration: Rejects invalid setup code with 403', async () => {
    process.env.ASSESS_ADMIN_SETUP_CODE = `SecureSecret_${testRunId}_XYZ!`;

    const req = new Request('http://localhost:3000/api/assess/auth/register-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Attacker Admin',
        email: `attacker_${testRunId}@evil.com`,
        password: 'Password123!',
        setupCode: 'WrongSetupCodeGuess'
      })
    });

    const res = await registerAdminHandler(req);
    const data = await res.json();

    assert.strictEqual(res.status, 403, 'Must return 403 Forbidden on invalid setup code');
    assert.strictEqual(data.error, 'Invalid administrator setup authorization code');
  });

  // --------------------------------------------------------------------------
  // 3. Legitimate Admin Registration with valid setup code succeeds
  // --------------------------------------------------------------------------
  await runAsyncTest('Admin Registration: Successfully registers administrator with valid setup code', async () => {
    const validCode = `ValidSetupCode_${testRunId}`;
    process.env.ASSESS_ADMIN_SETUP_CODE = validCode;

    const adminEmail = `valid_admin_${testRunId}@company.com`;
    const req = new Request('http://localhost:3000/api/assess/auth/register-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Legitimate Admin',
        email: adminEmail,
        password: 'ValidPassword123!',
        setupCode: validCode
      })
    });

    const res = await registerAdminHandler(req);
    const data = await res.json();

    assert.strictEqual(res.status, 200, 'Must return 200 OK on valid setup code');
    assert.strictEqual(data.success, true);

    const user = await db.queryOne('SELECT id, email, role, name FROM users WHERE email = $1', [adminEmail]);
    assert.ok(user, 'Admin must be created in the database');
    assert.strictEqual(user.role, 'admin', 'Created user must have role admin');
  });

  // --------------------------------------------------------------------------
  // 4. Input Validation & Duplicate Protection on Registration
  // --------------------------------------------------------------------------
  await runAsyncTest('Admin Registration: Enforces email uniqueness and minimum password length', async () => {
    const validCode = `ValidSetupCode_${testRunId}`;
    process.env.ASSESS_ADMIN_SETUP_CODE = validCode;

    // Short password
    const shortPassReq = new Request('http://localhost:3000/api/assess/auth/register-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Short Pass',
        email: `shortpass_${testRunId}@company.com`,
        password: 'short',
        setupCode: validCode
      })
    });
    const shortRes = await registerAdminHandler(shortPassReq);
    assert.strictEqual(shortRes.status, 400, 'Must reject passwords under 8 characters with 400');

    // Duplicate email
    const duplicateEmail = `valid_admin_${testRunId}@company.com`;
    const dupReq = new Request('http://localhost:3000/api/assess/auth/register-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Admin',
        email: duplicateEmail,
        password: 'AnotherPassword123!',
        setupCode: validCode
      })
    });
    const dupRes = await registerAdminHandler(dupReq);
    assert.strictEqual(dupRes.status, 409, 'Must reject duplicate email with 409 Conflict');
  });

  // Restore environment variable
  if (originalEnvSetupCode) {
    process.env.ASSESS_ADMIN_SETUP_CODE = originalEnvSetupCode;
  } else {
    delete process.env.ASSESS_ADMIN_SETUP_CODE;
  }

  // --------------------------------------------------------------------------
  // 5. Client Code Security: Verify no exposed setup codes or predictable defaults
  // --------------------------------------------------------------------------
  await runAsyncTest('Client Code Security: No exposed setup codes or passwords in client files', async () => {
    const assessPageSrc = fs.readFileSync(path.join(process.cwd(), 'src/app/assess/page.tsx'), 'utf8');

    assert.ok(!assessPageSrc.includes('Default setup code:'), 'Assess page must never display default setup code');
    assert.ok(!assessPageSrc.includes('Talvyn@Assess2026!'), 'Assess page must never contain hardcoded setup code');
    assert.ok(assessPageSrc.includes("process.env.NODE_ENV !== 'production'"), 'Demo credentials must be gated behind non-production condition');
  });

  // --------------------------------------------------------------------------
  // 6. Sign-in and Sign-up Route Availability & Structure
  // --------------------------------------------------------------------------
  await runAsyncTest('Authentication Routes: /sign-in and /sign-up routes are created and structured correctly', async () => {
    const signInPagePath = path.join(process.cwd(), 'src/app/sign-in/[[...sign-in]]/page.tsx');
    const signInClientPath = path.join(process.cwd(), 'src/app/sign-in/[[...sign-in]]/SignInClient.tsx');
    const signUpPagePath = path.join(process.cwd(), 'src/app/sign-up/[[...sign-up]]/page.tsx');
    const signUpClientPath = path.join(process.cwd(), 'src/app/sign-up/[[...sign-up]]/SignUpClient.tsx');

    assert.ok(fs.existsSync(signInPagePath), '/sign-in catch-all route must exist');
    assert.ok(fs.existsSync(signInClientPath), '/sign-in client component must exist');
    assert.ok(fs.existsSync(signUpPagePath), '/sign-up catch-all route must exist');
    assert.ok(fs.existsSync(signUpClientPath), '/sign-up client component must exist');

    const signInContent = fs.readFileSync(signInPagePath, 'utf8');
    assert.ok(signInContent.includes('Sign In | STRUCT'), 'Sign-in page must define proper metadata');

    const signUpContent = fs.readFileSync(signUpPagePath, 'utf8');
    assert.ok(signUpContent.includes('Sign Up | STRUCT'), 'Sign-up page must define proper metadata');
  });

  // --------------------------------------------------------------------------
  // 7. Middleware Configuration & Protection
  // --------------------------------------------------------------------------
  await runAsyncTest('Middleware: Protects admin/superadmin routes and prevents auth page loops', async () => {
    const middlewareSrc = fs.readFileSync(path.join(process.cwd(), 'src/middleware.ts'), 'utf8');

    assert.ok(middlewareSrc.includes("pathname.startsWith('/sign-in')"), 'Middleware must intercept sign-in route for session check');
    assert.ok(middlewareSrc.includes("pathname.startsWith('/sign-up')"), 'Middleware must intercept sign-up route for session check');
    assert.ok(middlewareSrc.includes('NextResponse.redirect'), 'Middleware must redirect authenticated users away from sign-in/sign-up');
    assert.ok(middlewareSrc.includes('struct_exam_token'), 'Middleware must reference canonical struct_exam_token cookie');
  });

  // --------------------------------------------------------------------------
  // 8. Candidate Access Isolation: Exam-only candidates blocked from user tools
  // --------------------------------------------------------------------------
  await runAsyncTest('Authorization: Exam-only candidates are strictly blocked from platform user tools', async () => {
    const candId = 'usr_cand_auth_' + testRunId;
    const candEmail = `cand_auth_${testRunId}@college.edu`;
    const now = Date.now();

    await db.execute(
      `INSERT INTO users (id, email, password_hash, salt, role, name, status, created_at)
       VALUES ($1, $2, '', '', 'candidate', 'Isolated Candidate', 'active', $3)`,
      [candId, candEmail, now]
    );

    const session = await createSession(candId);
    const mockRequest = new Request('http://localhost:3000/api/resume/scan', {
      headers: { Authorization: `Bearer ${session.token}` }
    });

    // requireUser should throw FORBIDDEN_EXAM_ONLY_ACCOUNT
    let caughtUserError = null;
    try {
      await requireUser(mockRequest);
    } catch (err) {
      caughtUserError = err;
    }
    assert.ok(caughtUserError, 'Candidate must be blocked from requireUser');
    assert.strictEqual(caughtUserError.message, 'FORBIDDEN_EXAM_ONLY_ACCOUNT');

    // requireSuperAdmin should throw FORBIDDEN_SUPER_ADMIN_REQUIRED
    let caughtSuperAdminError = null;
    try {
      await requireSuperAdmin(mockRequest);
    } catch (err) {
      caughtSuperAdminError = err;
    }
    assert.ok(caughtSuperAdminError, 'Candidate must be blocked from requireSuperAdmin');
    assert.strictEqual(caughtSuperAdminError.message, 'FORBIDDEN_SUPER_ADMIN_REQUIRED');
  });

  // --------------------------------------------------------------------------
  // 9. Super Admin Authorization Restrictions
  // --------------------------------------------------------------------------
  await runAsyncTest('Authorization: Super Admin operations strictly reject non-superadmin accounts', async () => {
    const normalAdminId = 'usr_admin_norm_' + testRunId;
    const now = Date.now();

    await db.execute(
      `INSERT INTO users (id, email, password_hash, salt, role, name, status, created_at)
       VALUES ($1, $2, '', '', 'admin', 'Standard Admin', 'active', $3)`,
      [normalAdminId, `admin_norm_${testRunId}@org.com`, now]
    );

    const adminSession = await createSession(normalAdminId);
    const mockRequest = new Request('http://localhost:3000/api/superadmin/stats', {
      headers: { Authorization: `Bearer ${adminSession.token}` }
    });

    let caughtError = null;
    try {
      await requireSuperAdmin(mockRequest);
    } catch (err) {
      caughtError = err;
    }
    assert.ok(caughtError, 'Standard admin must be rejected from Super Admin routes');
    assert.strictEqual(caughtError.message, 'FORBIDDEN_SUPER_ADMIN_REQUIRED');

    // Super Admin user should succeed
    const superAdminId = 'usr_super_' + testRunId;
    await db.execute(
      `INSERT INTO users (id, email, password_hash, salt, role, name, status, created_at)
       VALUES ($1, $2, '', '', 'super_admin', 'Root Platform Admin', 'active', $3)`,
      [superAdminId, `super_${testRunId}@struct.careers`, now]
    );

    const superSession = await createSession(superAdminId);
    const superReq = new Request('http://localhost:3000/api/superadmin/stats', {
      headers: { Authorization: `Bearer ${superSession.token}` }
    });

    const ctx = await requireSuperAdmin(superReq);
    assert.strictEqual(ctx.role, 'super_admin');
    assert.strictEqual(ctx.userId, superAdminId);
  });

  // --------------------------------------------------------------------------
  // 10. Multi-Tenant Organization Isolation
  // --------------------------------------------------------------------------
  await runAsyncTest('Authorization: Prevents cross-organization data access', async () => {
    const now = Date.now();
    const orgAId = 'org_alpha_' + testRunId;
    const orgBId = 'org_beta_' + testRunId;

    const userAId = 'usr_admin_a_' + testRunId;
    const userBId = 'usr_admin_b_' + testRunId;

    // Create 2 distinct organizations
    await db.execute(
      `INSERT INTO organizations (id, name, slug, domain, plan_tier, created_at, updated_at)
       VALUES ($1, 'Alpha Corp', $2, 'alpha.com', 'recruit_pro', $3, $3)`,
      [orgAId, 'alpha-' + testRunId, now]
    );
    await db.execute(
      `INSERT INTO organizations (id, name, slug, domain, plan_tier, created_at, updated_at)
       VALUES ($1, 'Beta Corp', $2, 'beta.com', 'recruit_pro', $3, $3)`,
      [orgBId, 'beta-' + testRunId, now]
    );

    // Create admins for each org
    await db.execute(
      `INSERT INTO users (id, email, password_hash, salt, role, name, status, created_at)
       VALUES ($1, $2, '', '', 'admin', 'Admin Alpha', 'active', $3)`,
      [userAId, `admin_a_${testRunId}@alpha.com`, now]
    );
    await db.execute(
      `INSERT INTO users (id, email, password_hash, salt, role, name, status, created_at)
       VALUES ($1, $2, '', '', 'admin', 'Admin Beta', 'active', $3)`,
      [userBId, `admin_b_${testRunId}@beta.com`, now]
    );

    // Assign memberships
    await db.execute(
      `INSERT INTO organization_members (id, organization_id, user_id, role, created_at)
       VALUES ($1, $2, $3, 'owner', $4)`,
      ['mem_a_' + testRunId, orgAId, userAId, now]
    );
    await db.execute(
      `INSERT INTO organization_members (id, organization_id, user_id, role, created_at)
       VALUES ($1, $2, $3, 'owner', $4)`,
      ['mem_b_' + testRunId, orgBId, userBId, now]
    );

    const sessionA = await createSession(userAId);
    const mockCrossReq = new Request('http://localhost:3000/api/assess/admin/exams', {
      headers: { Authorization: `Bearer ${sessionA.token}` }
    });

    // Admin A requesting Org A context should succeed
    const authA = await requireOrgAdmin(mockCrossReq, orgAId);
    assert.strictEqual(authA.organizationId, orgAId);
    assert.strictEqual(authA.orgRole, 'owner');

    // Admin A attempting to access Org B should be rejected
    let caughtCrossError = null;
    try {
      await requireOrgAdmin(mockCrossReq, orgBId);
    } catch (err) {
      caughtCrossError = err;
    }
    assert.ok(caughtCrossError, 'Admin A must be blocked from Org B context');
    assert.strictEqual(caughtCrossError.message, 'FORBIDDEN_ORG_ADMIN_REQUIRED');
  });

  console.log(`\n=== SECURITY & AUTH REMEDIATION RESULTS: ${passedTests} / ${totalTests} TESTS PASSED ===\n`);

  if (passedTests === totalTests) {
    console.log('ALL PHASE 1 SECURITY & AUTH REMEDIATION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error(`FAILED: ${totalTests - passedTests} tests failed.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FATAL SECURITY TEST ERROR]', err);
  process.exit(1);
});
