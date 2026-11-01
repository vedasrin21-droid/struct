/**
 * STRUCT PHASE 3: ORGANIZATION ONBOARDING TEST SUITE
 * 
 * Tests and verifies:
 * 1. Valid organization creation (POST /api/org/create)
 * 2. Invalid organization name validation (HTTP 400)
 * 3. Duplicate organization slug rejection (HTTP 409)
 * 4. Unauthenticated request protection (HTTP 401)
 * 5. Unauthorized candidate request rejection (HTTP 403)
 * 6. Organization dashboard refresh and active organization resolution (GET /api/org/profile)
 * 7. Cross-organization access protection (GET /api/org/profile?orgId=... and POST /api/org/members)
 * 8. UI verification: Onboarding welcome screen, create org modal, slug auto-generator, workspace switcher
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from './src/lib/assess/db.ts';
import { createSession } from './src/lib/assess/auth.ts';
import { POST as createOrgHandler } from './src/app/api/org/create/route.ts';
import { GET as getOrgProfileHandler } from './src/app/api/org/profile/route.ts';
import { GET as getOrgMembersHandler, POST as inviteOrgMemberHandler } from './src/app/api/org/members/route.ts';

console.log('=== STARTING STRUCT PHASE 3: ORGANIZATION ONBOARDING SUITE ===\n');

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
  const testRunId = Math.random().toString(36).substring(2, 9);
  const now = Date.now();

  // Test Accounts
  const validAdminId = 'usr_org_admin_' + testRunId;
  const validAdminEmail = `orgadmin_${testRunId}@company.com`;

  const candidateId = 'usr_cand_' + testRunId;
  const candidateEmail = `candidate_${testRunId}@college.edu`;

  const secondUserId = 'usr_second_' + testRunId;
  const secondUserEmail = `second_${testRunId}@other.com`;

  // Seed Admin User
  await db.execute(
    `INSERT INTO users (id, email, password_hash, salt, role, name, status, created_at)
     VALUES ($1, $2, '', '', 'admin', 'Test Org Admin', 'active', $3)`,
    [validAdminId, validAdminEmail, now]
  );

  // Seed Candidate User (Mode B exam-only candidate)
  await db.execute(
    `INSERT INTO users (id, email, password_hash, salt, role, name, status, created_at)
     VALUES ($1, $2, '', '', 'candidate', 'Mode B Candidate', 'active', $3)`,
    [candidateId, candidateEmail, now]
  );

  // Seed Second Admin User
  await db.execute(
    `INSERT INTO users (id, email, password_hash, salt, role, name, status, created_at)
     VALUES ($1, $2, '', '', 'admin', 'Second Org Admin', 'active', $3)`,
    [secondUserId, secondUserEmail, now]
  );

  const adminSession = await createSession(validAdminId);
  const candSession = await createSession(candidateId);
  const secondSession = await createSession(secondUserId);

  let createdOrgId = null;
  const targetSlug = `acme-corp-${testRunId}`;

  // --------------------------------------------------------------------------
  // 1. Valid organization creation
  // --------------------------------------------------------------------------
  await runAsyncTest('Valid organization creation (POST /api/org/create)', async () => {
    const req = new Request('http://localhost:3000/api/org/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminSession.token}`,
      },
      body: JSON.stringify({
        name: 'Acme Global Assessments',
        slug: targetSlug,
        domain: 'acme-global.test',
        logoUrl: 'https://acme-global.test/logo.svg',
      }),
    });

    const res = await createOrgHandler(req);
    const data = await res.json();

    assert.ok(res.status === 200 || res.status === 201, `Expected status 200/201, got ${res.status}: ${JSON.stringify(data)}`);
    assert.ok(data.organization, 'Response must contain organization object');
    assert.strictEqual(data.organization.name, 'Acme Global Assessments');
    assert.strictEqual(data.organization.slug, targetSlug);
    assert.strictEqual(data.organization.domain, 'acme-global.test');
    assert.strictEqual(data.organization.logo_url, 'https://acme-global.test/logo.svg');

    createdOrgId = data.organization.id;

    // Verify in database: organization membership is 'owner'
    const memberRow = await db.queryOne(
      'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [createdOrgId, validAdminId]
    );
    assert.ok(memberRow, 'User must be added to organization_members');
    assert.strictEqual(memberRow.role, 'owner', 'Creator must be assigned the owner role');

    // Verify users.organization_id is updated
    const userRow = await db.queryOne('SELECT organization_id FROM users WHERE id = $1', [validAdminId]);
    assert.strictEqual(userRow.organization_id, createdOrgId, 'users.organization_id must be updated');
  });

  // --------------------------------------------------------------------------
  // 2. Invalid organization name validation (HTTP 400)
  // --------------------------------------------------------------------------
  await runAsyncTest('Invalid organization name rejected with 400', async () => {
    // Too short (single character)
    const shortReq = new Request('http://localhost:3000/api/org/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminSession.token}`,
      },
      body: JSON.stringify({
        name: 'A',
      }),
    });

    const shortRes = await createOrgHandler(shortReq);
    const shortData = await shortRes.json();
    assert.strictEqual(shortRes.status, 400, 'Single letter name must be rejected with 400');
    assert.ok(shortData.error.includes('at least 2 characters'), 'Should specify min 2 characters');

    // Empty name
    const emptyReq = new Request('http://localhost:3000/api/org/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminSession.token}`,
      },
      body: JSON.stringify({
        name: '   ',
      }),
    });

    const emptyRes = await createOrgHandler(emptyReq);
    assert.strictEqual(emptyRes.status, 400, 'Blank name must be rejected with 400');
  });

  // --------------------------------------------------------------------------
  // 3. Duplicate organization slug rejection (HTTP 409)
  // --------------------------------------------------------------------------
  await runAsyncTest('Duplicate organization slug rejected with 409', async () => {
    const dupReq = new Request('http://localhost:3000/api/org/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secondSession.token}`,
      },
      body: JSON.stringify({
        name: 'Acme Duplicate Corp',
        slug: targetSlug, // Same slug as first test
      }),
    });

    const dupRes = await createOrgHandler(dupReq);
    const dupData = await dupRes.json();

    assert.strictEqual(dupRes.status, 409, 'Duplicate slug must return 409 Conflict');
    assert.ok(dupData.error.includes('already taken'), 'Error message must clearly inform that slug is already taken');
  });

  // --------------------------------------------------------------------------
  // 4. Unauthenticated request protection (HTTP 401)
  // --------------------------------------------------------------------------
  await runAsyncTest('Unauthenticated request rejected with 401', async () => {
    const unauthReq = new Request('http://localhost:3000/api/org/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rogue Inc',
      }),
    });

    const res = await createOrgHandler(unauthReq);
    assert.strictEqual(res.status, 401, 'Unauthenticated request must be rejected with 401');
  });

  // --------------------------------------------------------------------------
  // 5. Unauthorized candidate request rejection (HTTP 403)
  // --------------------------------------------------------------------------
  await runAsyncTest('Unauthorized exam-only candidate request rejected with 403', async () => {
    const candReq = new Request('http://localhost:3000/api/org/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candSession.token}`,
      },
      body: JSON.stringify({
        name: 'Candidate Workspace',
      }),
    });

    const res = await createOrgHandler(candReq);
    const data = await res.json();
    assert.strictEqual(res.status, 403, 'Candidate role must be rejected with 403 Forbidden');
    assert.ok(data.error.includes('Forbidden'), 'Error must note insufficient permissions');
  });

  // --------------------------------------------------------------------------
  // 6. Organization dashboard refresh after creation (GET /api/org/profile)
  // --------------------------------------------------------------------------
  await runAsyncTest('Organization dashboard refresh after creation (GET /api/org/profile)', async () => {
    const profReq = new Request('http://localhost:3000/api/org/profile', {
      headers: { Authorization: `Bearer ${adminSession.token}` },
    });

    const profRes = await getOrgProfileHandler(profReq);
    const profData = await profRes.json();

    assert.strictEqual(profRes.status, 200, 'Profile request must succeed with 200');
    assert.strictEqual(profData.hasOrg, true, 'hasOrg must be true');
    assert.strictEqual(profData.activeOrgId, createdOrgId, 'activeOrgId must match newly created org');
    assert.strictEqual(profData.organization.name, 'Acme Global Assessments');
    assert.strictEqual(profData.organization.slug, targetSlug);
    assert.ok(Array.isArray(profData.userOrganizations), 'userOrganizations must be an array');
    assert.strictEqual(profData.userOrganizations.length, 1);
    assert.strictEqual(profData.userOrganizations[0].role, 'owner');

    // Also verify GET /api/org/members
    const memReq = new Request('http://localhost:3000/api/org/members', {
      headers: { Authorization: `Bearer ${adminSession.token}` },
    });
    const memRes = await getOrgMembersHandler(memReq);
    const memData = await memRes.json();

    assert.strictEqual(memRes.status, 200, 'Members request must succeed with 200');
    assert.ok(Array.isArray(memData.members), 'members must be an array');
    assert.strictEqual(memData.members.length, 1);
    assert.strictEqual(memData.members[0].user_id, validAdminId);
    assert.strictEqual(memData.members[0].role, 'owner');
  });

  // --------------------------------------------------------------------------
  // 7. Cross-organization access protection
  // --------------------------------------------------------------------------
  await runAsyncTest('Cross-organization access protection', async () => {
    // Second user is NOT a member of createdOrgId
    const crossProfileReq = new Request(`http://localhost:3000/api/org/profile?orgId=${encodeURIComponent(createdOrgId)}`, {
      headers: { Authorization: `Bearer ${secondSession.token}` },
    });

    const crossProfRes = await getOrgProfileHandler(crossProfileReq);
    const crossProfData = await crossProfRes.json();

    assert.strictEqual(crossProfRes.status, 403, 'Cross-org profile access must be rejected with 403');
    assert.ok(crossProfData.error.includes('Forbidden'), 'Error must note cross-tenant boundary');

    // Second user attempting to invite members to createdOrgId
    const crossInviteReq = new Request('http://localhost:3000/api/org/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secondSession.token}`,
      },
      body: JSON.stringify({
        orgId: createdOrgId,
        email: `intruder_${testRunId}@evil.com`,
        role: 'admin',
      }),
    });

    const crossInviteRes = await inviteOrgMemberHandler(crossInviteReq);
    assert.strictEqual(crossInviteRes.status, 403, 'Cross-org member invite must be rejected with 403');
  });

  // --------------------------------------------------------------------------
  // 8. Client Code Verification
  // --------------------------------------------------------------------------
  await runAsyncTest('UI Verification: Onboarding welcome, creation modal, slug suggestion & isolation in assess/admin/page.tsx', async () => {
    const adminPageCode = fs.readFileSync(path.join(process.cwd(), 'src/app/assess/admin/page.tsx'), 'utf-8');

    // Verification of onboarding welcome screen
    assert.ok(adminPageCode.includes('Set Up Your Organization Workspace'), 'Must contain Welcome Screen heading');
    assert.ok(adminPageCode.includes('Multi-Tenant Isolation'), 'Must highlight Multi-Tenant Isolation');
    assert.ok(adminPageCode.includes('Team RBAC Governance'), 'Must highlight Team RBAC Governance');

    // Verification of modal & form fields
    assert.ok(adminPageCode.includes('Create Organization Workspace'), 'Must contain Modal creation heading');
    assert.ok(adminPageCode.includes('Workspace URL Slug'), 'Must contain slug input field');
    assert.ok(adminPageCode.includes('struct.careers/org/'), 'Must display struct.careers/org/ slug prefix preview');
    assert.ok(adminPageCode.includes('Institutional Domain'), 'Must contain optional domain field');
    assert.ok(adminPageCode.includes('Logo URL'), 'Must contain optional logoUrl field');

    // Verification of slug auto-generation logic
    assert.ok(adminPageCode.includes('generateSlug'), 'Must contain slug generation function');
    assert.ok(adminPageCode.includes('handleOrgNameChange'), 'Must contain auto-suggesting org name change handler');
    assert.ok(adminPageCode.includes('slugTouched'), 'Must track whether user manually touched the slug');

    // Verification of workspace switcher in header
    assert.ok(adminPageCode.includes('WORKSPACE:'), 'Must include Workspace selector in header');
    assert.ok(adminPageCode.includes('+ Create New Organization...'), 'Must offer quick link to create another organization');

    // Verification of security: no hardcoded secrets or setup codes
    assert.ok(!adminPageCode.includes('ASSESS_ADMIN_SETUP_CODE'), 'Must not expose setup codes in client code');
  });

  console.log(`\n=== ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY ===`);
}

main().catch((err) => {
  console.error('\nSuite Execution Failed:', err);
  process.exit(1);
});
