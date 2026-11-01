/**
 * STRUCT PAYMENT & ENTITLEMENT LEDGER AUTOMATED TEST SUITE
 * 
 * Validates all critical payment security and entitlement scenarios:
 * 1. Correct ₹49 server-side order amount (4900 paise).
 * 2. Invalid and unapproved product IDs rejected.
 * 3. Cryptographic Razorpay signature verification (HMAC-SHA256).
 * 4. Webhook raw body signature verification and forged signature rejection.
 * 5. Client verification without confirmed capture (Zero credits granted).
 * 6. Webhook arriving before client callback.
 * 7. Webhook arriving after client callback.
 * 8. Duplicate capture webhook idempotency.
 * 9. Successful credit grant (+2 usages).
 * 10. Atomic credit reservation before AI invocation.
 * 11. Concurrent requests competing for one credit (Only 1 succeeds, no overdraw).
 * 12. Settle reservation on successful AI output.
 * 13. AI failure releasing reservation (Credit restored).
 * 14. Duplicate analysis retry guard (Idempotent reference ID).
 * 15. Overdraw attempt rejected when balance is 0.
 * 16. Refund after credit consumption (Safe zero floor, no negative balance).
 * 17. Refund after purchase before consumption (Clean reversal).
 * 18. Duplicate refund webhook idempotency.
 * 19. Guest entitlement claiming with signed token.
 * 20. Guest purchase claimed by two different accounts (Second account rejected).
 * 21. Guest claim attempt without token rejected (Email alone never sufficient).
 * 22. Database check constraint enforcement (remaining_balance >= 0).
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import { getDb, closeDb } from './src/lib/assess/db.ts';
import { PRODUCT_CATALOG, getProductOrThrow } from './src/lib/payments/catalog.ts';
import {
  createPaymentOrder,
  verifyRazorpaySignature,
  verifyWebhookSignature,
  processCapturedPayment,
  processRefund,
  reserveEntitlement,
  settleEntitlementReservation,
  releaseEntitlementReservation,
  reconcileAndConfirmPayment,
  getEntitlementBalance,
  markOperationActive,
  markOperationComplete,
  isOperationActive,
  heartbeatReservation,
  isReservationActive,
  recoverStaleReservations,
} from './src/lib/payments/service.ts';
import {
  normalizeEmail,
  createGuestEntitlementToken,
  verifyGuestEntitlementToken,
  claimGuestEntitlements,
} from './src/lib/payments/guestAuth.ts';

console.log('=== STARTING STRUCT PAYMENT & ENTITLEMENT VERIFICATION SUITE ===\n');

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
  const db = getDb();
  const testRunId = Date.now().toString(36);
  const testEmail = `candidate_${testRunId}@talvyn.com`;

  // 1. Correct ₹49 Server-Side Order Amount
  await runAsyncTest('Correct ₹49 Server-Side Order Amount (4900 Paise)', async () => {
    const { order, product } = await createPaymentOrder({
      productId: 'resume_ai_pack_49',
      email: testEmail,
      customDb: db,
    });

    assert.strictEqual(product.amountPaise, 4900, 'Product price must be exactly 4900 paise (₹49)');
    assert.strictEqual(order.amount, 4900, 'Order amount must be set authoritatively to 4900 paise');
    assert.strictEqual(order.currency, 'INR', 'Currency must be INR');
    assert.strictEqual(order.status, 'created', 'Initial status must be created');
    assert.strictEqual(product.unitsGranted, 2, 'Must grant exactly 2 AI usages');
  });

  // 2. Invalid Product IDs Rejected
  runTest('Invalid and Unavailable Product IDs Rejected', () => {
    assert.throws(
      () => getProductOrThrow('malicious_1_paisa_product'),
      /INVALID_PRODUCT_ID/,
      'Arbitrary client product ID must throw error'
    );

    assert.throws(
      () => getProductOrThrow('mock_interview_1_29'),
      /UNAVAILABLE_PRODUCT/,
      'Unapproved products for Phase 3 must be rejected'
    );
  });

  // 3. Valid and Invalid Razorpay Signatures
  runTest('Cryptographic Razorpay Signature Verification (HMAC-SHA256)', () => {
    const secret = 'test_secret_key_12345';
    const orderId = 'order_test_123';
    const paymentId = 'pay_test_456';

    const validSig = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    assert.strictEqual(
      verifyRazorpaySignature({ orderId, paymentId, signature: validSig, secret }),
      true,
      'Valid signature must verify'
    );

    assert.strictEqual(
      verifyRazorpaySignature({ orderId, paymentId, signature: 'tampered_signature', secret }),
      false,
      'Tampered signature must fail'
    );
  });

  // 4. Webhook Raw Body Signature Verification & Forged Signature Rejection
  runTest('Webhook Raw Body Signature Verification & Forged Rejection', () => {
    const webhookSecret = 'test_webhook_secret_999';
    const rawPayload = JSON.stringify({ event: 'payment.captured', id: 'evt_1' });

    const validSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    assert.strictEqual(
      verifyWebhookSignature({ rawBody: rawPayload, signature: validSig, webhookSecret }),
      true,
      'Valid webhook signature must pass'
    );

    assert.strictEqual(
      verifyWebhookSignature({ rawBody: rawPayload, signature: 'forged_sig', webhookSecret }),
      false,
      'Invalid webhook signature must be rejected'
    );

    // Tampered payload with valid original signature
    const tamperedPayload = JSON.stringify({ event: 'payment.captured', id: 'evt_tampered' });
    assert.strictEqual(
      verifyWebhookSignature({ rawBody: tamperedPayload, signature: validSig, webhookSecret }),
      false,
      'Tampered body must fail verification'
    );
  });

  // 5. Client Verification WITHOUT Confirmed Capture (Zero Credits Granted)
  await runAsyncTest('Client Verification Without Confirmed Capture (Zero Credits Granted)', async () => {
    const unconfirmedEmail = `unconf_${testRunId}@talvyn.com`;
    const unconfOrderId = `order_unconf_${testRunId}`;
    const unconfPayId = `pay_unconf_${testRunId}`;

    await createPaymentOrder({
      productId: 'resume_ai_pack_49',
      email: unconfirmedEmail,
      customRazorpayOrderId: unconfOrderId,
      customDb: db,
    });

    // Client sends callback with valid signature, but remote provider is merely 'authorized'
    const result = await reconcileAndConfirmPayment({
      razorpayOrderId: unconfOrderId,
      razorpayPaymentId: unconfPayId,
      customDb: db,
      customFetchPayment: async () => ({
        id: unconfPayId,
        order_id: unconfOrderId,
        status: 'authorized', // Not captured!
        amount: 4900,
        currency: 'INR',
      }),
    });

    assert.strictEqual(result.confirmed, false, 'Uncaptured payment must NOT be confirmed');
    assert.strictEqual(result.unitsGranted, 0, 'Must grant ZERO credits on uncaptured payment');

    const bal = await getEntitlementBalance(unconfirmedEmail, 'resume_ai_usage', db);
    assert.strictEqual(bal.remainingBalance, 0, 'Balance must remain 0 for merely authorized payments');
  });

  // 6. Webhook Arriving BEFORE Client Callback
  await runAsyncTest('Webhook Arriving BEFORE Client Callback', async () => {
    const preEmail = `pre_${testRunId}@talvyn.com`;
    const preOrderId = `order_pre_${testRunId}`;
    const prePayId = `pay_pre_${testRunId}`;

    await createPaymentOrder({
      productId: 'resume_ai_pack_49',
      email: preEmail,
      customRazorpayOrderId: preOrderId,
      customDb: db,
    });

    // 1. Webhook arrives first
    const captureRes = await processCapturedPayment({
      razorpayOrderId: preOrderId,
      razorpayPaymentId: prePayId,
      amountPaise: 4900,
      customDb: db,
    });
    assert.strictEqual(captureRes.success, true);
    assert.strictEqual(captureRes.unitsGranted, 2);

    // 2. Client callback arrives later
    const clientRes = await reconcileAndConfirmPayment({
      razorpayOrderId: preOrderId,
      razorpayPaymentId: prePayId,
      customDb: db,
    });
    assert.strictEqual(clientRes.confirmed, true, 'Client callback must recognize captured state');
    assert.strictEqual(clientRes.alreadyProcessed, true, 'Must detect as already processed');
    assert.strictEqual(clientRes.unitsGranted, 0, 'Must not double-grant credits');
    assert.strictEqual(clientRes.newBalance, 2, 'Balance must remain 2');
  });

  // 7. Webhook Arriving AFTER Client Callback
  await runAsyncTest('Webhook Arriving AFTER Client Callback', async () => {
    const postEmail = `post_${testRunId}@talvyn.com`;
    const postOrderId = `order_post_${testRunId}`;
    const postPayId = `pay_post_${testRunId}`;

    await createPaymentOrder({
      productId: 'resume_ai_pack_49',
      email: postEmail,
      customRazorpayOrderId: postOrderId,
      customDb: db,
    });

    // 1. Client callback arrives first (reconciliation offline/pending)
    const clientRes = await reconcileAndConfirmPayment({
      razorpayOrderId: postOrderId,
      razorpayPaymentId: postPayId,
      customDb: db,
      customFetchPayment: async () => null, // Provider API unavailable
    });
    assert.strictEqual(clientRes.confirmed, false, 'Pending capture cannot grant credits');
    assert.strictEqual(clientRes.unitsGranted, 0);

    // 2. Webhook arrives later and confirms capture
    const webhookRes = await processCapturedPayment({
      razorpayOrderId: postOrderId,
      razorpayPaymentId: postPayId,
      amountPaise: 4900,
      customDb: db,
    });
    assert.strictEqual(webhookRes.success, true);
    assert.strictEqual(webhookRes.unitsGranted, 2);
    assert.strictEqual(webhookRes.newBalance, 2);

    const bal = await getEntitlementBalance(postEmail, 'resume_ai_usage', db);
    assert.strictEqual(bal.remainingBalance, 2, 'Balance must now be 2 after webhook arrives');
  });

  // 8. Duplicate Capture Webhook Idempotency
  const rzpOrderId = `order_test_${testRunId}`;
  const rzpPaymentId = `pay_test_${testRunId}`;

  await runAsyncTest('Duplicate Capture Webhook Idempotency (Zero Double-Granting)', async () => {
    await createPaymentOrder({
      productId: 'resume_ai_pack_49',
      email: testEmail,
      customRazorpayOrderId: rzpOrderId,
      customDb: db,
    });

    const firstCapture = await processCapturedPayment({
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: rzpPaymentId,
      amountPaise: 4900,
      method: 'upi',
      customDb: db,
    });
    assert.strictEqual(firstCapture.unitsGranted, 2);

    // Duplicate webhook delivery
    const dupCapture = await processCapturedPayment({
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: rzpPaymentId,
      amountPaise: 4900,
      method: 'upi',
      customDb: db,
    });
    assert.strictEqual(dupCapture.alreadyProcessed, true);
    assert.strictEqual(dupCapture.unitsGranted, 0);
    assert.strictEqual(dupCapture.newBalance, 2);

    const bal = await getEntitlementBalance(testEmail, 'resume_ai_usage', db);
    assert.strictEqual(bal.remainingBalance, 2);
  });

  // 9. Successful Credit Grant (+2 Usages Verified)
  await runAsyncTest('Successful Credit Grant (+2 Usages in Balance and Ledger)', async () => {
    const bal = await getEntitlementBalance(testEmail, 'resume_ai_usage', db);
    assert.strictEqual(bal.remainingBalance, 2);
    assert.strictEqual(bal.totalGranted, 2);
    assert.strictEqual(bal.totalConsumed, 0);
  });

  // 10. Atomic Credit Reservation Before AI Invocation
  const analysisRef1 = `ana_${testRunId}_1`;
  await runAsyncTest('Atomic Credit Reservation Before AI Invocation', async () => {
    const reserveRes = await reserveEntitlement({
      email: testEmail,
      featureType: 'resume_ai_usage',
      referenceId: analysisRef1,
      customDb: db,
    });

    assert.strictEqual(reserveRes.success, true, 'Reservation must succeed');
    assert.strictEqual(reserveRes.remainingBalance, 1, 'Balance must decrement from 2 to 1 on reservation');

    const bal = await getEntitlementBalance(testEmail, 'resume_ai_usage', db);
    assert.strictEqual(bal.remainingBalance, 1, 'Active balance must be 1 during reservation');
  });

  // 11. Concurrent Requests Competing for ONE Credit (Race Condition Prevention)
  await runAsyncTest('Concurrent Requests Competing for ONE Credit (Only 1 Succeeds)', async () => {
    const oneCreditEmail = `one_credit_${testRunId}@talvyn.com`;
    const oneOrderId = `order_one_${testRunId}`;
    const onePayId = `pay_one_${testRunId}`;

    await createPaymentOrder({
      productId: 'resume_ai_pack_49',
      email: oneCreditEmail,
      customRazorpayOrderId: oneOrderId,
      customDb: db,
    });
    await processCapturedPayment({
      razorpayOrderId: oneOrderId,
      razorpayPaymentId: onePayId,
      amountPaise: 4900,
      customDb: db,
    });

    // Consume 1 credit so exactly 1 credit remains
    await reserveEntitlement({
      email: oneCreditEmail,
      featureType: 'resume_ai_usage',
      referenceId: `used_${testRunId}`,
      customDb: db,
    });
    await settleEntitlementReservation({
      email: oneCreditEmail,
      featureType: 'resume_ai_usage',
      referenceId: `used_${testRunId}`,
      customDb: db,
    });

    const balBefore = await getEntitlementBalance(oneCreditEmail, 'resume_ai_usage', db);
    assert.strictEqual(balBefore.remainingBalance, 1, 'User must have exactly 1 credit available');

    // Fire 5 concurrent requests competing for this single remaining credit
    const concurrentReservations = await Promise.all([
      reserveEntitlement({ email: oneCreditEmail, featureType: 'resume_ai_usage', referenceId: `c_req_1_${testRunId}`, customDb: db }),
      reserveEntitlement({ email: oneCreditEmail, featureType: 'resume_ai_usage', referenceId: `c_req_2_${testRunId}`, customDb: db }),
      reserveEntitlement({ email: oneCreditEmail, featureType: 'resume_ai_usage', referenceId: `c_req_3_${testRunId}`, customDb: db }),
      reserveEntitlement({ email: oneCreditEmail, featureType: 'resume_ai_usage', referenceId: `c_req_4_${testRunId}`, customDb: db }),
      reserveEntitlement({ email: oneCreditEmail, featureType: 'resume_ai_usage', referenceId: `c_req_5_${testRunId}`, customDb: db }),
    ]);

    const successes = concurrentReservations.filter(r => r.success);
    const failures = concurrentReservations.filter(r => !r.success);

    assert.strictEqual(successes.length, 1, 'Exactly ONE concurrent request may reserve the remaining credit');
    assert.strictEqual(failures.length, 4, 'The other 4 concurrent requests must be rejected');

    const balAfter = await getEntitlementBalance(oneCreditEmail, 'resume_ai_usage', db);
    assert.strictEqual(balAfter.remainingBalance, 0, 'Balance must be exactly 0, zero overdraw');
  });

  // 12. Settle Reservation on Successful AI Output
  await runAsyncTest('Settle Reservation on Successful AI Output', async () => {
    const settleRes = await settleEntitlementReservation({
      email: testEmail,
      featureType: 'resume_ai_usage',
      referenceId: analysisRef1,
      customDb: db,
    });

    assert.strictEqual(settleRes.success, true, 'Settlement must succeed');
    assert.strictEqual(settleRes.remainingBalance, 1, 'Balance remains 1');

    const bal = await getEntitlementBalance(testEmail, 'resume_ai_usage', db);
    assert.strictEqual(bal.totalConsumed, 1, 'total_consumed must now be 1');
  });

  // 13. AI Failure / Timeout Releasing Reservation (Credit Restored)
  await runAsyncTest('AI Failure / Timeout Releasing Reservation (Credit Restored)', async () => {
    const failRef = `ana_fail_${testRunId}`;

    // 1. Reserve credit (balance goes 1 -> 0)
    const reserveRes = await reserveEntitlement({
      email: testEmail,
      featureType: 'resume_ai_usage',
      referenceId: failRef,
      customDb: db,
    });
    assert.strictEqual(reserveRes.success, true);
    assert.strictEqual(reserveRes.remainingBalance, 0);

    // 2. AI provider fails -> release reservation
    const releaseRes = await releaseEntitlementReservation({
      email: testEmail,
      featureType: 'resume_ai_usage',
      referenceId: failRef,
      customDb: db,
    });
    assert.strictEqual(releaseRes.success, true, 'Release must succeed');
    assert.strictEqual(releaseRes.remainingBalance, 1, 'Balance must be restored to 1');

    const bal = await getEntitlementBalance(testEmail, 'resume_ai_usage', db);
    assert.strictEqual(bal.remainingBalance, 1, 'Active balance must remain 1');
    assert.strictEqual(bal.totalConsumed, 1, 'Total consumed must NOT increment on failure');
  });

  // 14. Duplicate Analysis Retry Guard (Idempotent Reference ID)
  await runAsyncTest('Duplicate Analysis Retry Guard (Idempotent Reference ID)', async () => {
    // Calling reserve with previously settled analysisRef1
    const retryRes = await reserveEntitlement({
      email: testEmail,
      featureType: 'resume_ai_usage',
      referenceId: analysisRef1,
      customDb: db,
    });

    assert.strictEqual(retryRes.success, true, 'Retry must return success');
    assert.strictEqual(retryRes.alreadyReserved, true, 'Must detect as already reserved');
    assert.strictEqual(retryRes.remainingBalance, 1, 'Balance must NOT decrement again on retry');
  });

  // 15. Consume Second Credit & Overdraw Attempt Rejected when Balance is 0
  await runAsyncTest('Overdraw Attempt Rejected when Balance is 0 (402 Payment Required)', async () => {
    // Consume remaining 1 credit
    const ref2 = `ana_${testRunId}_final`;
    await reserveEntitlement({ email: testEmail, featureType: 'resume_ai_usage', referenceId: ref2, customDb: db });
    await settleEntitlementReservation({ email: testEmail, featureType: 'resume_ai_usage', referenceId: ref2, customDb: db });

    const bal = await getEntitlementBalance(testEmail, 'resume_ai_usage', db);
    assert.strictEqual(bal.remainingBalance, 0, 'Remaining balance must be 0');

    // Overdraw attempt
    const overdrawRes = await reserveEntitlement({
      email: testEmail,
      featureType: 'resume_ai_usage',
      referenceId: `ana_overdraw_${testRunId}`,
      customDb: db,
    });
    assert.strictEqual(overdrawRes.success, false, 'Reservation must fail when balance is 0');
    assert.strictEqual(overdrawRes.remainingBalance, 0);
  });

  // 16. Refund After Credit Consumption (Safe Zero Floor, No Negative Balance)
  await runAsyncTest('Refund After Credit Consumption (No Negative Balance)', async () => {
    const refundRes = await processRefund({
      razorpayPaymentId: rzpPaymentId,
      refundId: `rfnd_${testRunId}`,
      amountPaise: 4900,
      customDb: db,
    });

    assert.strictEqual(refundRes.success, true, 'Refund must process successfully');
    assert.strictEqual(refundRes.alreadyRefunded, false);
    assert.strictEqual(refundRes.reversalDelta, 0, 'Reversal delta must be 0 because balance was already 0');
    assert.strictEqual(refundRes.newBalance, 0, 'Balance must remain 0, never negative');

    const bal = await getEntitlementBalance(testEmail, 'resume_ai_usage', db);
    assert.strictEqual(bal.remainingBalance, 0, 'Balance must not drop below 0');
  });

  // 17. Refund After Purchase Before Consumption (Clean Reversal)
  await runAsyncTest('Refund After Purchase Before Consumption (Clean Full Reversal)', async () => {
    const unconsumedEmail = `unconsumed_${testRunId}@talvyn.com`;
    const uncOrderId = `order_unc_${testRunId}`;
    const uncPayId = `pay_unc_${testRunId}`;

    await createPaymentOrder({
      productId: 'resume_ai_pack_49',
      email: unconsumedEmail,
      customRazorpayOrderId: uncOrderId,
      customDb: db,
    });
    await processCapturedPayment({
      razorpayOrderId: uncOrderId,
      razorpayPaymentId: uncPayId,
      amountPaise: 4900,
      customDb: db,
    });

    const refundRes = await processRefund({
      razorpayPaymentId: uncPayId,
      refundId: `rfnd_unc_${testRunId}`,
      amountPaise: 4900,
      customDb: db,
    });

    assert.strictEqual(refundRes.success, true);
    assert.strictEqual(refundRes.reversalDelta, -2, 'Reversal delta must be -2');
    assert.strictEqual(refundRes.newBalance, 0, 'Balance must be reversed back to 0');
  });

  // 18. Duplicate Refund Webhook Idempotency
  await runAsyncTest('Duplicate Refund Webhook Idempotency (Zero Double-Reversal)', async () => {
    const dupRefundEmail = `dup_rfnd_${testRunId}@talvyn.com`;
    const dupOrderId = `order_dup_rf_${testRunId}`;
    const dupPayId = `pay_dup_rf_${testRunId}`;
    const refundId = `rfnd_dup_${testRunId}`;

    await createPaymentOrder({
      productId: 'resume_ai_pack_49',
      email: dupRefundEmail,
      customRazorpayOrderId: dupOrderId,
      customDb: db,
    });
    await processCapturedPayment({
      razorpayOrderId: dupOrderId,
      razorpayPaymentId: dupPayId,
      amountPaise: 4900,
      customDb: db,
    });

    // 1st refund delivery
    const r1 = await processRefund({ razorpayPaymentId: dupPayId, refundId, amountPaise: 4900, customDb: db });
    assert.strictEqual(r1.success, true);
    assert.strictEqual(r1.alreadyRefunded, false);
    assert.strictEqual(r1.reversalDelta, -2);

    // 2nd duplicate refund delivery with identical refundId
    const r2 = await processRefund({ razorpayPaymentId: dupPayId, refundId, amountPaise: 4900, customDb: db });
    assert.strictEqual(r2.success, true, 'Duplicate refund webhook must succeed gracefully');
    assert.strictEqual(r2.alreadyRefunded, true, 'Must detect as already refunded');
    assert.strictEqual(r2.reversalDelta, 0, 'Must not reverse credits a second time');
  });

  // 19. Guest Entitlement Claiming with Cryptographic Proof
  const guestEmail = `guest_${testRunId}@talvyn.com`;
  const guestToken = createGuestEntitlementToken(guestEmail);
  const testUserId1 = `usr_claim1_${testRunId}`;

  await runAsyncTest('Guest Entitlement Claiming with Signed Token', async () => {
    assert.ok(guestToken.length > 20, 'Guest token must be generated');
    const verifiedEmail = verifyGuestEntitlementToken(guestToken);
    assert.strictEqual(verifiedEmail, guestEmail, 'Verified email must match guest email');

    assert.strictEqual(
      verifyGuestEntitlementToken('tampered.token_payload'),
      null,
      'Tampered guest token must fail verification'
    );

    // Setup guest order & payment
    const gOrderId = `order_g_${testRunId}`;
    const gPayId = `pay_g_${testRunId}`;
    await createPaymentOrder({
      productId: 'resume_ai_pack_49',
      email: guestEmail,
      customRazorpayOrderId: gOrderId,
      customDb: db,
    });
    await processCapturedPayment({
      razorpayOrderId: gOrderId,
      razorpayPaymentId: gPayId,
      amountPaise: 4900,
      customDb: db,
    });

    // Insert user into users table to satisfy foreign key
    await db.execute(
      `INSERT INTO users (id, email, password_hash, salt, role, name, created_at)
       VALUES ($1, $2, 'hash', 'salt', 'candidate', 'Guest User 1', $3)`,
      [testUserId1, guestEmail, Date.now()]
    );

    const claimRes = await claimGuestEntitlements({
      userId: testUserId1,
      userEmail: guestEmail,
      guestToken,
      customDb: db,
    });

    assert.strictEqual(claimRes.claimedCount, 1, 'Must claim exactly 1 guest entitlement record');
    assert.strictEqual(claimRes.alreadyClaimed, false);

    // Repeated claim by same user must be idempotent
    const repeatClaim = await claimGuestEntitlements({
      userId: testUserId1,
      userEmail: guestEmail,
      guestToken,
      customDb: db,
    });
    assert.strictEqual(repeatClaim.claimedCount, 0);
    assert.strictEqual(repeatClaim.alreadyClaimed, true, 'Repeated claim must be idempotent');
  });

  // 20. Guest Purchase Claimed by Two Different Accounts (Second Account Rejected)
  await runAsyncTest('Guest Purchase Claimed by Two Different Accounts (Second Account Rejected)', async () => {
    const secondUserEmail = `second_${testRunId}@talvyn.com`;
    const testUserId2 = `usr_claim2_${testRunId}`;
    await db.execute(
      `INSERT INTO users (id, email, password_hash, salt, role, name, created_at)
       VALUES ($1, $2, 'hash', 'salt', 'candidate', 'Guest User 2', $3)`,
      [testUserId2, secondUserEmail, Date.now()]
    );

    // Account 2 attempts to claim with Account 1's guest token
    let errorCaught = false;
    try {
      await claimGuestEntitlements({
        userId: testUserId2,
        userEmail: secondUserEmail,
        guestToken,
        customDb: db,
      });
    } catch (err) {
      errorCaught = true;
      assert.match(
        err.message,
        /(GUEST_TOKEN_EMAIL_MISMATCH|ALREADY_CLAIMED_BY_ANOTHER_ACCOUNT)/,
        'Must reject token belonging to another email or already claimed'
      );
    }

    assert.strictEqual(errorCaught, true, 'Second account must be rejected from claiming another account purchase');
  });

  // 21. Guest Claim Attempt Without Token Rejected (Email Alone Never Sufficient)
  await runAsyncTest('Guest Claim Attempt Without Token Rejected (Email Alone Never Sufficient)', async () => {
    let rejectedWithoutToken = false;
    try {
      await claimGuestEntitlements({
        userId: testUserId1,
        userEmail: guestEmail,
        guestToken: '', // No token provided!
        customDb: db,
      });
    } catch (err) {
      rejectedWithoutToken = true;
      assert.match(err.message, /GUEST_TOKEN_REQUIRED/, 'Must require guest token');
    }

    assert.strictEqual(rejectedWithoutToken, true, 'Email alone must never be accepted to claim purchases');
  });

  // 22. Database Check Constraint Enforcement: remaining_balance >= 0
  await runAsyncTest('Database Check Constraint: remaining_balance >= 0', async () => {
    let failedAsExpected = false;
    try {
      await db.execute(
        "UPDATE user_entitlements SET remaining_balance = -5 WHERE LOWER(email) = LOWER($1)",
        [testEmail]
      );
    } catch {
      failedAsExpected = true;
    }
    assert.strictEqual(failedAsExpected, true, 'Database must reject any negative balance via CHECK constraint');
  });

  // 23. Crash Simulation & Stale Reservation Safe Recovery
  await runAsyncTest('Crash Simulation & Stale Reservation Safe Recovery', async () => {
    const crashTestEmail = `crash_${testRunId}@talvyn.com`;
    // Grant 2 credits
    await processCapturedPayment({
      razorpayPaymentId: `pay_crash_${testRunId}`,
      razorpayOrderId: (await createPaymentOrder({ productId: 'resume_ai_pack_49', email: crashTestEmail, customDb: db })).order.razorpay_order_id,
      customDb: db,
    });

    const initialBal = await getEntitlementBalance(crashTestEmail, 'resume_ai_usage', db);
    assert.strictEqual(initialBal.remainingBalance, 2);

    // Reserve 1 credit
    const crashRefId = `ref_crashed_${testRunId}`;
    const res = await reserveEntitlement({
      email: crashTestEmail,
      featureType: 'resume_ai_usage',
      referenceId: crashRefId,
      customDb: db,
    });
    assert.strictEqual(res.remainingBalance, 1, 'Balance decremented to 1 after reservation');

    // Simulate crash before AI/settle: server process died and restarted 6 minutes later.
    // Backdate the reservation ledger entry to 6 minutes ago:
    const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
    await db.execute(
      `UPDATE entitlement_ledger SET created_at = $1 WHERE reference_id = $2`,
      [sixMinutesAgo, crashRefId]
    );
    await db.execute(
      `UPDATE entitlement_reservations SET created_at = $1, lease_expires_at = $2 WHERE reference_id = $3`,
      [sixMinutesAgo, sixMinutesAgo + 60 * 1000, crashRefId]
    );

    // Invoke recoverStaleReservations
    const recRes = await recoverStaleReservations({
      email: crashTestEmail,
      maxAgeMs: 5 * 60 * 1000,
      customDb: db,
    });

    assert.strictEqual(recRes.recoveredCount, 1, 'Must recover exactly 1 stuck reservation');
    assert.deepStrictEqual(recRes.recoveredReferenceIds, [crashRefId]);

    // Check balance restored to 2
    const restoredBal = await getEntitlementBalance(crashTestEmail, 'resume_ai_usage', db);
    assert.strictEqual(restoredBal.remainingBalance, 2, 'Balance must be restored to 2');

    // Re-running recovery must be strictly idempotent (0 recovered, balance stays 2)
    const repeatRec = await recoverStaleReservations({
      email: crashTestEmail,
      maxAgeMs: 5 * 60 * 1000,
      customDb: db,
    });
    assert.strictEqual(repeatRec.recoveredCount, 0, 'Repeat recovery must be idempotent');
    const finalBal = await getEntitlementBalance(crashTestEmail, 'resume_ai_usage', db);
    assert.strictEqual(finalBal.remainingBalance, 2, 'Balance must remain 2 (no double credit)');

    // Attempting to settle a recovered/released reservation must be strictly rejected
    let settleErrorCaught = false;
    try {
      await settleEntitlementReservation({
        email: crashTestEmail,
        featureType: 'resume_ai_usage',
        referenceId: crashRefId,
        customDb: db,
      });
    } catch (err) {
      settleErrorCaught = true;
      assert.match(err.message, /RESERVATION_ALREADY_RELEASED/);
    }
    assert.strictEqual(settleErrorCaught, true, 'Settlement after recovery must be rejected');
  });

  // 24. Active In-Flight Operation Protected from Stale Recovery
  await runAsyncTest('Active In-Flight Operation Protected from Stale Recovery', async () => {
    const activeTestEmail = `active_${testRunId}@talvyn.com`;
    await processCapturedPayment({
      razorpayPaymentId: `pay_act_${testRunId}`,
      razorpayOrderId: (await createPaymentOrder({ productId: 'resume_ai_pack_49', email: activeTestEmail, customDb: db })).order.razorpay_order_id,
      customDb: db,
    });

    const activeRefId = `ref_live_inflight_${testRunId}`;
    await reserveEntitlement({
      email: activeTestEmail,
      featureType: 'resume_ai_usage',
      referenceId: activeRefId,
      customDb: db,
    });

    // Mark active in memory
    markOperationActive(activeRefId, activeTestEmail);
    assert.strictEqual(isOperationActive(activeRefId), true);

    // Backdate in DB as if it started long ago
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    await db.execute(
      `UPDATE entitlement_ledger SET created_at = $1 WHERE reference_id = $2`,
      [tenMinutesAgo, activeRefId]
    );

    // Recovery must IGNORE active operation
    const recRes = await recoverStaleReservations({
      email: activeTestEmail,
      maxAgeMs: 5 * 60 * 1000,
      customDb: db,
    });

    assert.strictEqual(recRes.recoveredCount, 0, 'Active in-flight operation must NOT be released');

    // Clean up active registry
    markOperationComplete(activeRefId);
    assert.strictEqual(isOperationActive(activeRefId), false);
  });

  // 25. Mutual Exclusion: Release Attempt After Successful Settle
  await runAsyncTest('Mutual Exclusion: Release Attempt After Settle Returns False', async () => {
    const settleTestEmail = `settled_${testRunId}@talvyn.com`;
    await processCapturedPayment({
      razorpayPaymentId: `pay_set_${testRunId}`,
      razorpayOrderId: (await createPaymentOrder({ productId: 'resume_ai_pack_49', email: settleTestEmail, customDb: db })).order.razorpay_order_id,
      customDb: db,
    });

    const settleRefId = `ref_settled_${testRunId}`;
    await reserveEntitlement({
      email: settleTestEmail,
      featureType: 'resume_ai_usage',
      referenceId: settleRefId,
      customDb: db,
    });

    const settleRes = await settleEntitlementReservation({
      email: settleTestEmail,
      featureType: 'resume_ai_usage',
      referenceId: settleRefId,
      customDb: db,
    });
    assert.strictEqual(settleRes.success, true);
    assert.strictEqual(settleRes.remainingBalance, 1);

    // Attempting to release an already settled reservation must fail safely
    const releaseRes = await releaseEntitlementReservation({
      email: settleTestEmail,
      featureType: 'resume_ai_usage',
      referenceId: settleRefId,
      customDb: db,
    });
    assert.strictEqual(releaseRes.success, false, 'Release on settled reservation must return false');

    const balAfter = await getEntitlementBalance(settleTestEmail, 'resume_ai_usage', db);
    assert.strictEqual(balAfter.remainingBalance, 1, 'Balance must remain 1 (no double refund)');
  });

  // 26. Out-of-Order Webhook Delivery: Refund Arrives Before Capture
  await runAsyncTest('Out-of-Order Webhook Delivery: Refund Arrives Before Capture', async () => {
    const outOfOrderPayId = `pay_ooo_${testRunId}`;
    const refundId = `rfnd_ooo_${testRunId}`;

    // 1. Refund arrives before capture is recorded
    let errorCaught = false;
    try {
      await processRefund({
        razorpayPaymentId: outOfOrderPayId,
        refundId,
        customDb: db,
      });
    } catch (err) {
      errorCaught = true;
      assert.match(err.message, /TRANSACTION_NOT_FOUND/);
    }
    assert.strictEqual(errorCaught, true, 'Refund before capture must throw TRANSACTION_NOT_FOUND to prompt webhook retry');

    // 2. Now capture arrives
    const oooEmail = `ooo_${testRunId}@talvyn.com`;
    const { order } = await createPaymentOrder({ productId: 'resume_ai_pack_49', email: oooEmail, customDb: db });
    await processCapturedPayment({
      razorpayPaymentId: outOfOrderPayId,
      razorpayOrderId: order.razorpay_order_id,
      customDb: db,
    });

    // 3. Retry of refund webhook succeeds cleanly
    const refundRes = await processRefund({
      razorpayPaymentId: outOfOrderPayId,
      refundId,
      amountPaise: 4900,
      customDb: db,
    });
    assert.strictEqual(refundRes.success, true);
    assert.strictEqual(refundRes.reversalDelta, -2);
    assert.strictEqual(refundRes.newBalance, 0);
  });

  // 27. Operation Continuing Past Five-Minute Threshold (Heartbeat Extends Lease)
  await runAsyncTest('Operation Continuing Past 5-Minute Threshold (Heartbeat Extends Lease)', async () => {
    const longRunningEmail = `long_${testRunId}@talvyn.com`;
    const { order } = await createPaymentOrder({ productId: 'resume_ai_pack_49', email: longRunningEmail, customDb: db });
    await processCapturedPayment({ razorpayOrderId: order.razorpay_order_id, razorpayPaymentId: `pay_long_${testRunId}`, customDb: db });

    const longRefId = `ref_long_${testRunId}`;
    await reserveEntitlement({ email: longRunningEmail, featureType: 'resume_ai_usage', referenceId: longRefId, customDb: db });

    // Simulate operation was created 7 minutes ago, BUT heartbeat refreshed the lease just now
    const sevenMinutesAgo = Date.now() - 7 * 60 * 1000;
    await db.execute(
      `UPDATE entitlement_reservations SET created_at = $1 WHERE reference_id = $2`,
      [sevenMinutesAgo, longRefId]
    );

    // Heartbeat updates lease_expires_at to future
    const hbRes = await heartbeatReservation({ referenceId: longRefId, leaseDurationMs: 60 * 1000, customDb: db });
    assert.strictEqual(hbRes.success, true);
    assert.ok(hbRes.leaseExpiresAt > Date.now());

    // Trigger recovery: even though created_at was 7 minutes ago, the active lease has NOT expired!
    const recRes = await recoverStaleReservations({ email: longRunningEmail, customDb: db });
    assert.strictEqual(recRes.recoveredCount, 0, 'Long operation with valid heartbeat lease must NOT be recovered');

    // Settle succeeds cleanly after long duration
    const settleRes = await settleEntitlementReservation({ email: longRunningEmail, featureType: 'resume_ai_usage', referenceId: longRefId, customDb: db });
    assert.strictEqual(settleRes.success, true);
  });

  // 28. Recovery After Server Restart (In-Memory Map Empty, Expired Lease in DB Recovered)
  await runAsyncTest('Recovery After Server Restart (Database-Authoritative)', async () => {
    const restartEmail = `restart_${testRunId}@talvyn.com`;
    const { order } = await createPaymentOrder({ productId: 'resume_ai_pack_49', email: restartEmail, customDb: db });
    await processCapturedPayment({ razorpayOrderId: order.razorpay_order_id, razorpayPaymentId: `pay_rst_${testRunId}`, customDb: db });

    const restartRefId = `ref_restart_${testRunId}`;
    await reserveEntitlement({ email: restartEmail, featureType: 'resume_ai_usage', referenceId: restartRefId, customDb: db });

    // Simulate server crash: in-memory map has NO trace of this operation (markOperationComplete simulated restart)
    markOperationComplete(restartRefId);
    assert.strictEqual(isOperationActive(restartRefId), false);

    // Simulate lease expired 2 minutes ago
    const twoMinsAgo = Date.now() - 2 * 60 * 1000;
    await db.execute(
      `UPDATE entitlement_reservations SET lease_expires_at = $1 WHERE reference_id = $2`,
      [twoMinsAgo, restartRefId]
    );

    // Fresh server instance executes recovery on restart
    const recRes = await recoverStaleReservations({ email: restartEmail, customDb: db });
    assert.strictEqual(recRes.recoveredCount, 1, 'Restarted server must recover expired lease from database');
    assert.deepStrictEqual(recRes.recoveredReferenceIds, [restartRefId]);

    const restoredBal = await getEntitlementBalance(restartEmail, 'resume_ai_usage', db);
    assert.strictEqual(restoredBal.remainingBalance, 2, 'Balance must be restored to 2');
  });

  // 29. Two Instances Attempting to Recover the Same Reservation Concurrently (CAS Race)
  await runAsyncTest('Two Instances Concurrently Recovering Same Reservation (CAS Protection)', async () => {
    const multiInstEmail = `multi_${testRunId}@talvyn.com`;
    const { order } = await createPaymentOrder({ productId: 'resume_ai_pack_49', email: multiInstEmail, customDb: db });
    await processCapturedPayment({ razorpayOrderId: order.razorpay_order_id, razorpayPaymentId: `pay_mi_${testRunId}`, customDb: db });

    const miRefId = `ref_mi_${testRunId}`;
    await reserveEntitlement({ email: multiInstEmail, featureType: 'resume_ai_usage', referenceId: miRefId, customDb: db });

    // Expire the lease
    const past = Date.now() - 30 * 1000;
    await db.execute(
      `UPDATE entitlement_reservations SET lease_expires_at = $1 WHERE reference_id = $2`,
      [past, miRefId]
    );

    // Instance 1 and Instance 2 execute recovery concurrently
    const [rec1, rec2] = await Promise.all([
      recoverStaleReservations({ email: multiInstEmail, customDb: db }),
      recoverStaleReservations({ email: multiInstEmail, customDb: db }),
    ]);

    // Exactly one instance should perform the CAS release (+1), the other 0
    const totalRecovered = rec1.recoveredCount + rec2.recoveredCount;
    assert.strictEqual(totalRecovered, 1, 'Exactly one instance must win the recovery CAS race');

    const bal = await getEntitlementBalance(multiInstEmail, 'resume_ai_usage', db);
    assert.strictEqual(bal.remainingBalance, 2, 'Balance must not double-credit (must be exactly 2)');
  });

  // 30. Settlement Racing with Recovery (Mutual Exclusion Guarantee)
  await runAsyncTest('Settlement Racing with Recovery (Strict Mutual Exclusion)', async () => {
    const raceEmail = `race_${testRunId}@talvyn.com`;
    const { order } = await createPaymentOrder({ productId: 'resume_ai_pack_49', email: raceEmail, customDb: db });
    await processCapturedPayment({ razorpayOrderId: order.razorpay_order_id, razorpayPaymentId: `pay_race_${testRunId}`, customDb: db });

    const raceRefId = `ref_race_${testRunId}`;
    await reserveEntitlement({ email: raceEmail, featureType: 'resume_ai_usage', referenceId: raceRefId, customDb: db });

    // Simulate recovery wins first (e.g. lease expired)
    const releaseRes = await releaseEntitlementReservation({
      email: raceEmail,
      featureType: 'resume_ai_usage',
      referenceId: raceRefId,
      customDb: db,
    });
    assert.strictEqual(releaseRes.success, true);

    // Now late worker attempts to settle after release: MUST be rejected
    let settleErrorCaught = false;
    try {
      await settleEntitlementReservation({
        email: raceEmail,
        featureType: 'resume_ai_usage',
        referenceId: raceRefId,
        customDb: db,
      });
    } catch (err) {
      settleErrorCaught = true;
      assert.match(err.message, /RESERVATION_ALREADY_RELEASED/);
    }
    assert.strictEqual(settleErrorCaught, true, 'Settlement must be rejected if reservation was released');

    // Balance must remain restored to 2 (user was refunded)
    const bal = await getEntitlementBalance(raceEmail, 'resume_ai_usage', db);
    assert.strictEqual(bal.remainingBalance, 2);
  });

  // 31. Duplicate Retries While Original Request Is Active (In-Flight Protection)
  await runAsyncTest('Duplicate Retries While Original Request Is Active (In-Flight Protection)', async () => {
    const retryEmail = `retry_${testRunId}@talvyn.com`;
    const { order } = await createPaymentOrder({ productId: 'resume_ai_pack_49', email: retryEmail, customDb: db });
    await processCapturedPayment({ razorpayOrderId: order.razorpay_order_id, razorpayPaymentId: `pay_ret_${testRunId}`, customDb: db });

    const retryRefId = `ref_ret_${testRunId}`;
    await reserveEntitlement({ email: retryEmail, featureType: 'resume_ai_usage', referenceId: retryRefId, customDb: db });

    // Check cross-instance authoritative active state
    const isActive = await isReservationActive(retryRefId, db);
    assert.strictEqual(isActive, true, 'isReservationActive must return true while lease is active in DB');

    // Duplicate reservation call returns alreadyReserved: true without extra deduction
    const dupRes = await reserveEntitlement({ email: retryEmail, featureType: 'resume_ai_usage', referenceId: retryRefId, customDb: db });
    assert.strictEqual(dupRes.success, true);
    assert.strictEqual(dupRes.alreadyReserved, true);
    assert.strictEqual(dupRes.remainingBalance, 1, 'Balance must remain 1 without extra deduction');
  });

  // 32. Heartbeat Rejection After Reservation Release
  await runAsyncTest('Heartbeat Arriving After Reservation Release (Safe Rejection)', async () => {
    const hbRelEmail = `hbrel_${testRunId}@talvyn.com`;
    const { order } = await createPaymentOrder({ productId: 'resume_ai_pack_49', email: hbRelEmail, customDb: db });
    await processCapturedPayment({ razorpayOrderId: order.razorpay_order_id, razorpayPaymentId: `pay_hbrel_${testRunId}`, customDb: db });

    const hbRelRefId = `ref_hbrel_${testRunId}`;
    await reserveEntitlement({ email: hbRelEmail, featureType: 'resume_ai_usage', referenceId: hbRelRefId, customDb: db });

    // Release the reservation (e.g. timeout, failure, or recovery)
    const relRes = await releaseEntitlementReservation({
      email: hbRelEmail,
      featureType: 'resume_ai_usage',
      referenceId: hbRelRefId,
      customDb: db,
    });
    assert.strictEqual(relRes.success, true);

    // Heartbeat arriving AFTER release must return success: false and NOT re-activate reservation
    const hbRes = await heartbeatReservation({ referenceId: hbRelRefId, customDb: db });
    assert.strictEqual(hbRes.success, false, 'Heartbeat for released reservation must return false');

    const isActive = await isReservationActive(hbRelRefId, db);
    assert.strictEqual(isActive, false, 'Reservation must remain inactive in DB');
  });

  // 33. Full Refunds Only Policy: Partial Refunds Reverse Zero Credits; Full Refund Reverses Pack Units
  await runAsyncTest('Full Refunds Only Policy: Partial Refunds Reverse Zero Credits; Full Refund Reverses Pack Units', async () => {
    const partRefEmail = `partref_${testRunId}@talvyn.com`;
    const { order } = await createPaymentOrder({ productId: 'resume_ai_pack_49', email: partRefEmail, customDb: db });
    const partPayId = `pay_part_${testRunId}`;
    await processCapturedPayment({ razorpayOrderId: order.razorpay_order_id, razorpayPaymentId: partPayId, customDb: db });

    const initialBal = await getEntitlementBalance(partRefEmail, 'resume_ai_usage', db);
    assert.strictEqual(initialBal.remainingBalance, 2);

    // 1. ₹1 partial refund (100 paise out of 4900 paise pack): Reverses 0 credits
    const smallRefund = await processRefund({
      razorpayPaymentId: partPayId,
      refundId: `rfnd_small_${testRunId}`,
      amountPaise: 100,
      customDb: db,
    });
    assert.strictEqual(smallRefund.success, true);
    assert.strictEqual(smallRefund.isFullRefund, false);
    assert.strictEqual(smallRefund.reversalDelta, 0, '₹1 refund must reverse 0 credits');
    assert.strictEqual(smallRefund.newBalance, 2, 'Balance must remain 2');

    // 2. ₹25 partial refund: Still partial for this pack, so it must NOT revoke credits
    const partial25Refund = await processRefund({
      razorpayPaymentId: partPayId,
      refundId: `rfnd_25_${testRunId}`,
      amountPaise: 2500,
      customDb: db,
    });
    assert.strictEqual(partial25Refund.success, true);
    assert.strictEqual(partial25Refund.isFullRefund, false);
    assert.strictEqual(partial25Refund.reversalDelta, 0, 'Partial refund must reverse 0 credits under full-refunds-only policy');
    assert.strictEqual(partial25Refund.newBalance, 2, 'Balance must remain 2');

    // 3. Duplicate partial refund delivery must be idempotent
    const dupPartial = await processRefund({
      razorpayPaymentId: partPayId,
      refundId: `rfnd_25_${testRunId}`,
      amountPaise: 2500,
      customDb: db,
    });
    assert.strictEqual(dupPartial.alreadyRefunded, true);
    assert.strictEqual(dupPartial.reversalDelta, 0);

    // 4. Verify balance is completely uncorrupted after multiple partial refunds
    const midBal = await getEntitlementBalance(partRefEmail, 'resume_ai_usage', db);
    assert.strictEqual(midBal.remainingBalance, 2, 'Multiple partial refunds must never corrupt entitlement balance');

    // 5. Official Full Refund (4900 paise): Reverses all pack credits
    const fullRefund = await processRefund({
      razorpayPaymentId: partPayId,
      refundId: `rfnd_full_${testRunId}`,
      amountPaise: 4900,
      customDb: db,
    });
    assert.strictEqual(fullRefund.success, true);
    assert.strictEqual(fullRefund.isFullRefund, true);
    assert.strictEqual(fullRefund.reversalDelta, -2, 'Full refund must reverse all pack units (-2)');
    assert.strictEqual(fullRefund.newBalance, 0, 'Balance drops cleanly to 0');

    // 6. Post-full refund event must be safely ignored without double reversal
    const postRefund = await processRefund({
      razorpayPaymentId: partPayId,
      refundId: `rfnd_extra_${testRunId}`,
      amountPaise: 100,
      customDb: db,
    });
    assert.strictEqual(postRefund.alreadyRefunded, true);
    assert.strictEqual(postRefund.reversalDelta, 0);
  });

  // 34. Recovered Reservation Whose AI Operation Later Completes
  await runAsyncTest('Recovered Reservation Whose AI Operation Later Completes (Denied)', async () => {
    const lateEmail = `late_${testRunId}@talvyn.com`;
    const { order } = await createPaymentOrder({ productId: 'resume_ai_pack_49', email: lateEmail, customDb: db });
    await processCapturedPayment({ razorpayOrderId: order.razorpay_order_id, razorpayPaymentId: `pay_late_${testRunId}`, customDb: db });

    const lateRefId = `ref_late_${testRunId}`;
    await reserveEntitlement({ email: lateEmail, featureType: 'resume_ai_usage', referenceId: lateRefId, customDb: db });

    // Simulate recovery reclaiming the credit after lease expiration
    const past = Date.now() - 2 * 60 * 1000;
    await db.execute(
      `UPDATE entitlement_reservations SET lease_expires_at = $1 WHERE reference_id = $2`,
      [past, lateRefId]
    );
    const recRes = await recoverStaleReservations({ email: lateEmail, customDb: db });
    assert.strictEqual(recRes.recoveredCount, 1);

    const restoredBal = await getEntitlementBalance(lateEmail, 'resume_ai_usage', db);
    assert.strictEqual(restoredBal.remainingBalance, 2);

    // AI operation belatedly completes on slow worker and attempts settlement: MUST throw and fail
    let settleThrew = false;
    try {
      await settleEntitlementReservation({
        email: lateEmail,
        featureType: 'resume_ai_usage',
        referenceId: lateRefId,
        customDb: db,
      });
    } catch (err) {
      settleThrew = true;
      assert.match(err.message, /RESERVATION_ALREADY_RELEASED/);
    }
    assert.strictEqual(settleThrew, true, 'Settling recovered reservation must throw RESERVATION_ALREADY_RELEASED');

    // Credit balance must remain 2 (no double-spend or silent deduction)
    const finalBal = await getEntitlementBalance(lateEmail, 'resume_ai_usage', db);
    assert.strictEqual(finalBal.remainingBalance, 2);
  });

  // 35. Extended Multi-Interval Heartbeat Lease Renewal
  await runAsyncTest('Extended Multi-Interval Heartbeat Lease Renewal (Multi-Beat Extension)', async () => {
    const multiHbEmail = `multihb_${testRunId}@talvyn.com`;
    const { order } = await createPaymentOrder({ productId: 'resume_ai_pack_49', email: multiHbEmail, customDb: db });
    await processCapturedPayment({ razorpayOrderId: order.razorpay_order_id, razorpayPaymentId: `pay_mhb_${testRunId}`, customDb: db });

    const multiHbRefId = `ref_mhb_${testRunId}`;
    await reserveEntitlement({ email: multiHbEmail, featureType: 'resume_ai_usage', referenceId: multiHbRefId, customDb: db });

    // Step 1: Initial heartbeat
    const hb1 = await heartbeatReservation({ referenceId: multiHbRefId, leaseDurationMs: 30000, customDb: db });
    assert.strictEqual(hb1.success, true);

    // Step 2: Second heartbeat extending further
    const hb2 = await heartbeatReservation({ referenceId: multiHbRefId, leaseDurationMs: 60000, customDb: db });
    assert.strictEqual(hb2.success, true);
    assert.ok(hb2.leaseExpiresAt > hb1.leaseExpiresAt);

    // Stale recovery should NOT recover active lease
    const recRes = await recoverStaleReservations({ email: multiHbEmail, customDb: db });
    assert.strictEqual(recRes.recoveredCount, 0);

    // Settle cleanly
    const settleRes = await settleEntitlementReservation({
      email: multiHbEmail,
      featureType: 'resume_ai_usage',
      referenceId: multiHbRefId,
      customDb: db,
    });
    assert.strictEqual(settleRes.success, true);
    assert.strictEqual(settleRes.remainingBalance, 1);
  });

  // 36. Missing, Zero, Negative, and Non-Numeric Refund Amounts (Safe Zero-Reversal)
  await runAsyncTest('Missing, Zero, Negative, and Invalid Refund Amounts (Safe Zero-Reversal)', async () => {
    const edgeEmail = `edge_${testRunId}@talvyn.com`;
    const { order } = await createPaymentOrder({ productId: 'resume_ai_pack_49', email: edgeEmail, customDb: db });
    const edgePayId = `pay_edge_${testRunId}`;
    await processCapturedPayment({ razorpayOrderId: order.razorpay_order_id, razorpayPaymentId: edgePayId, customDb: db });

    const initialBal = await getEntitlementBalance(edgeEmail, 'resume_ai_usage', db);
    assert.strictEqual(initialBal.remainingBalance, 2);

    // 1. Missing / undefined refund amount: MUST NOT trigger full reversal
    const missingRes = await processRefund({
      razorpayPaymentId: edgePayId,
      refundId: `rfnd_miss_${testRunId}`,
      customDb: db,
    });
    assert.strictEqual(missingRes.success, true);
    assert.strictEqual(missingRes.isFullRefund, false, 'Missing amount must not be treated as full refund');
    assert.strictEqual(missingRes.reversalDelta, 0, 'Zero credits reversed on missing amount');
    assert.strictEqual(missingRes.newBalance, 2);

    // 2. Zero amount: MUST NOT trigger full reversal
    const zeroRes = await processRefund({
      razorpayPaymentId: edgePayId,
      refundId: `rfnd_zero_${testRunId}`,
      amountPaise: 0,
      customDb: db,
    });
    assert.strictEqual(zeroRes.isFullRefund, false);
    assert.strictEqual(zeroRes.reversalDelta, 0);
    assert.strictEqual(zeroRes.newBalance, 2);

    // 3. Negative amount: MUST NOT trigger full reversal
    const negRes = await processRefund({
      razorpayPaymentId: edgePayId,
      refundId: `rfnd_neg_${testRunId}`,
      amountPaise: -4900,
      customDb: db,
    });
    assert.strictEqual(negRes.isFullRefund, false);
    assert.strictEqual(negRes.reversalDelta, 0);
    assert.strictEqual(negRes.newBalance, 2);

    // 4. NaN / non-numeric amount: MUST NOT trigger full reversal
    const nanRes = await processRefund({
      razorpayPaymentId: edgePayId,
      refundId: `rfnd_nan_${testRunId}`,
      amountPaise: NaN,
      customDb: db,
    });
    assert.strictEqual(nanRes.isFullRefund, false);
    assert.strictEqual(nanRes.reversalDelta, 0);
    assert.strictEqual(nanRes.newBalance, 2);

    // Verify balance is completely unchanged
    const finalBal = await getEntitlementBalance(edgeEmail, 'resume_ai_usage', db);
    assert.strictEqual(finalBal.remainingBalance, 2, 'Customer balance must remain 2 after all invalid refund attempts');
  });

  // 37. Cumulative Partial Refunds Reaching Full Amount
  await runAsyncTest('Cumulative Partial Refunds Reaching Full Order Amount (Triggers Full Reversal)', async () => {
    const cumEmail = `cum_${testRunId}@talvyn.com`;
    const { order } = await createPaymentOrder({ productId: 'resume_ai_pack_49', email: cumEmail, customDb: db });
    const cumPayId = `pay_cum_${testRunId}`;
    await processCapturedPayment({ razorpayOrderId: order.razorpay_order_id, razorpayPaymentId: cumPayId, customDb: db });

    // Step 1: 1st partial refund of ₹20 (cumulative 2000 paise < 4900): reverses 0 credits
    const part1 = await processRefund({
      razorpayPaymentId: cumPayId,
      refundId: `rfnd_cum_1_${testRunId}`,
      amountPaise: 2000,
      totalRefundedPaise: 2000,
      customDb: db,
    });
    assert.strictEqual(part1.isFullRefund, false);
    assert.strictEqual(part1.reversalDelta, 0);
    assert.strictEqual(part1.newBalance, 2);

    // Step 2: 2nd partial refund of ₹29 (cumulative 4900 paise >= order.amount): triggers full reversal!
    const part2 = await processRefund({
      razorpayPaymentId: cumPayId,
      refundId: `rfnd_cum_2_${testRunId}`,
      amountPaise: 2900,
      totalRefundedPaise: 4900,
      customDb: db,
    });
    assert.strictEqual(part2.isFullRefund, true, 'Cumulative total reaching order.amount must trigger full refund');
    assert.strictEqual(part2.reversalDelta, -2, 'Full reversal delta must be -2');
    assert.strictEqual(part2.newBalance, 0);

    // Step 3: Duplicate webhook delivery of 2nd partial refund: idempotent
    const dupPart2 = await processRefund({
      razorpayPaymentId: cumPayId,
      refundId: `rfnd_cum_2_${testRunId}`,
      amountPaise: 2900,
      totalRefundedPaise: 4900,
      customDb: db,
    });
    assert.strictEqual(dupPart2.alreadyRefunded, true);
    assert.strictEqual(dupPart2.reversalDelta, 0);
    assert.strictEqual(dupPart2.newBalance, 0);
  });

  // 38. Valid Full Refund & Duplicate Full-Refund Idempotency
  await runAsyncTest('Valid Full Refund & Duplicate Full-Refund Event Idempotency', async () => {
    const fullEmail = `fulldup_${testRunId}@talvyn.com`;
    const { order } = await createPaymentOrder({ productId: 'resume_ai_pack_49', email: fullEmail, customDb: db });
    const fullPayId = `pay_fdup_${testRunId}`;
    await processCapturedPayment({ razorpayOrderId: order.razorpay_order_id, razorpayPaymentId: fullPayId, customDb: db });

    const refundId = `rfnd_fdup_${testRunId}`;

    // 1. Valid full refund with exact amount (4900 paise)
    const res1 = await processRefund({
      razorpayPaymentId: fullPayId,
      refundId,
      amountPaise: 4900,
      customDb: db,
    });
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.alreadyRefunded, false);
    assert.strictEqual(res1.isFullRefund, true);
    assert.strictEqual(res1.reversalDelta, -2);
    assert.strictEqual(res1.newBalance, 0);

    // 2. Duplicate full refund with identical refundId
    const res2 = await processRefund({
      razorpayPaymentId: fullPayId,
      refundId,
      amountPaise: 4900,
      customDb: db,
    });
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.alreadyRefunded, true);
    assert.strictEqual(res2.reversalDelta, 0);
    assert.strictEqual(res2.newBalance, 0);

    // 3. New refundId on already-refunded order
    const res3 = await processRefund({
      razorpayPaymentId: fullPayId,
      refundId: `rfnd_extra_${testRunId}`,
      amountPaise: 4900,
      customDb: db,
    });
    assert.strictEqual(res3.alreadyRefunded, true);
    assert.strictEqual(res3.reversalDelta, 0);
    assert.strictEqual(res3.newBalance, 0);
  });

  console.log(`\n=== PAYMENT & ENTITLEMENT RESULTS: ${passedTests} / ${totalTests} TESTS PASSED ===\n`);
  assert.strictEqual(passedTests, totalTests, 'All payment test cases must pass');
}

main()
  .catch(err => {
    console.error('[FATAL] Payment test runner error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDb();
  });
