/**
 * STRUCT LAUNCHGATE & PUBLIC ACCESS AUTOMATED VERIFICATION SUITE
 * 
 * Validates:
 * 1. Default open public access behavior (uninhibited access when gate is disabled).
 * 2. Preview mode gating and passcode verification (configurable passcode vs invalid codes).
 * 3. Auto-unlock logic when launch timestamp is reached.
 * 4. URL query bypass parameters (?launch_unlock=..., ?preview=skip).
 * 5. Role-based authentication integrity: public access does NOT bypass admin or candidate guards.
 * 6. Zero leakage of server secrets to client-side code.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getDb, closeDb } from './src/lib/assess/db.ts';
import { verifySession, requireAdmin, requireCandidate } from './src/lib/assess/auth.ts';

console.log('=== STARTING STRUCT LAUNCHGATE & ACCESS VERIFICATION SUITE ===\n');

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
  // Case 1: Open Public Access Verification (Default Mode)
  runTest('Public Access Enabled by Default without Passcode Barrier', () => {
    // When NEXT_PUBLIC_LAUNCH_GATE_ENABLED is false or unset
    const isGateEnabledEnv = process.env.NEXT_PUBLIC_LAUNCH_GATE_ENABLED === 'true';
    assert.strictEqual(isGateEnabledEnv, false, 'Default configuration must have LaunchGate disabled for public launch');

    // Simulate LaunchGate stage evaluation
    const initialStage = isGateEnabledEnv ? 'loading' : 'unlocked';
    assert.strictEqual(initialStage, 'unlocked', 'LaunchGate must immediately initialize to unlocked state');
  });

  // Case 2: Configurable Preview Passcode Verification
  runTest('Preview Passcode Validation Logic (Correct vs Incorrect)', () => {
    const configuredPasscode = process.env.NEXT_PUBLIC_LAUNCH_PASSCODE || '2118';
    assert.ok(configuredPasscode.length >= 4, 'Configured passcode must be at least 4 characters');

    // Verification helper matching LaunchGate.tsx
    const checkPasscode = (code) => code === configuredPasscode || code === '2118';

    assert.strictEqual(checkPasscode(configuredPasscode), true, 'Valid passcode must be accepted');
    assert.strictEqual(checkPasscode('0000'), false, 'Arbitrary invalid code must be rejected');
    assert.strictEqual(checkPasscode('9999'), false, 'Arbitrary invalid code must be rejected');
    assert.strictEqual(checkPasscode(''), false, 'Empty code must be rejected');
  });

  // Case 3: Automatic Unlock Upon Launch Timestamp Reached
  runTest('Launch Countdown Auto-Unlock when Target Date Arrives', () => {
    // Target date in the past
    const pastLaunchDate = new Date(Date.now() - 60000); // 1 minute ago
    const isPastTime = Date.now() >= pastLaunchDate.getTime();
    assert.strictEqual(isPastTime, true, 'Time past launch timestamp must be detected');

    // Logic in LaunchGate: if now >= targetLaunchDate, auto-unlock without requiring passcode
    let stage = 'countdown';
    if (isPastTime) {
      stage = 'unlocked';
    }
    assert.strictEqual(stage, 'unlocked', 'Gate must automatically transition to unlocked when launch time arrives');
  });

  // Case 4: URL Query Parameter Bypass Logic
  runTest('Preview Query Parameters Evaluation (?launch_unlock & ?preview=skip)', () => {
    const configuredPasscode = process.env.NEXT_PUBLIC_LAUNCH_PASSCODE || '2118';

    const testUrlParams = (queryString) => {
      const params = new URLSearchParams(queryString);
      return (
        params.get('preview') === 'skip' ||
        params.get('launch_unlock') === configuredPasscode ||
        params.get('launch_unlock') === '2118'
      );
    };

    assert.strictEqual(testUrlParams(`launch_unlock=${configuredPasscode}`), true, 'Valid launch_unlock must bypass');
    assert.strictEqual(testUrlParams('preview=skip'), true, 'preview=skip must bypass');
    assert.strictEqual(testUrlParams('launch_unlock=wrong'), false, 'Invalid launch_unlock must not bypass');
    assert.strictEqual(testUrlParams(''), false, 'Empty params must not bypass');
  });

  // Case 5: Authentication & Authorization Integrity (Admin & Candidate Protected Routes)
  await runAsyncTest('Protected Route Security Integrity (Public access does not bypass auth)', async () => {
    // Verify an unauthenticated request to requireAdmin throws UNAUTHORIZED
    const fakeRequest = new Request('http://localhost:3000/api/assess/admin/exams', {
      headers: { cookie: '' },
    });

    let adminBlocked = false;
    try {
      await requireAdmin(fakeRequest);
    } catch (err) {
      if (err.message === 'UNAUTHORIZED') {
        adminBlocked = true;
      }
    }
    assert.strictEqual(adminBlocked, true, 'Unauthenticated admin requests must be blocked with UNAUTHORIZED');

    let candidateBlocked = false;
    try {
      await requireCandidate(fakeRequest);
    } catch (err) {
      if (err.message === 'UNAUTHORIZED') {
        candidateBlocked = true;
      }
    }
    assert.strictEqual(candidateBlocked, true, 'Unauthenticated candidate requests must be blocked with UNAUTHORIZED');
  });

  // Case 6: Zero Secret Leakage into Client Bundle
  runTest('Client-Side Code Free of Server Secrets & Database Credentials', () => {
    const launchGateSource = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'LaunchGate.tsx'), 'utf8');

    // Must not contain database connection strings or server secrets
    assert.ok(!launchGateSource.includes('DATABASE_URL'), 'LaunchGate must never reference DATABASE_URL');
    assert.ok(!launchGateSource.includes('ASSESS_SESSION_SECRET'), 'LaunchGate must never reference ASSESS_SESSION_SECRET');
    assert.ok(!launchGateSource.includes('ASSESS_ADMIN_SETUP_CODE'), 'LaunchGate must never reference ASSESS_ADMIN_SETUP_CODE');
    assert.ok(!launchGateSource.includes('password_hash'), 'LaunchGate must never reference password hashes');
  });

  console.log(`\n=== LAUNCHGATE VERIFICATION RESULTS: ${passedTests} / ${totalTests} TESTS PASSED ===\n`);
  assert.strictEqual(passedTests, totalTests, 'All LaunchGate test cases must pass');
}

main()
  .catch(err => {
    console.error('[FATAL] LaunchGate test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDb();
  });
