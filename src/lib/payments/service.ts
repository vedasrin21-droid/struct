/**
 * STRUCT PAYMENT & ENTITLEMENT LEDGER SERVICE
 * 
 * Core business logic and database transactions:
 * 1. Order Creation with Authoritative Catalog Lookup.
 * 2. Idempotent Payment Capture & Ledger Granting.
 * 3. Atomic Entitlement Consumption with Concurrency Controls.
 * 4. Safe Non-Negative Refund Reversals.
 * 5. Complete Double-Entry Ledger Tracking.
 */

import crypto from 'node:crypto';
import { getDb, DbClient } from '@/lib/assess/db';
import { getProductOrThrow, ProductDefinition } from './catalog';
import { normalizeEmail } from './guestAuth';
import { getPlanByTier, activateSubscription, cancelSubscription } from './subscriptions';

export interface PaymentOrderRecord {
  id: string;
  razorpay_order_id: string;
  user_id: string | null;
  email: string;
  product_id: string;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  created_at: number | string;
  updated_at: number | string;
}

export interface EntitlementBalance {
  email: string;
  featureType: string;
  remainingBalance: number;
  totalGranted: number;
  totalConsumed: number;
}

/**
 * Creates a server-side order with authoritative pricing
 */
export async function createPaymentOrder(params: {
  productId: string;
  email: string;
  userId?: string | null;
  customRazorpayOrderId?: string; // Used in tests/mocks or passed from Razorpay API
  customDb?: DbClient;
}): Promise<{
  order: PaymentOrderRecord;
  product: ProductDefinition;
}> {
  const { productId, email, userId } = params;
  const normEmail = normalizeEmail(email);
  if (!normEmail || !normEmail.includes('@')) {
    throw new Error('VALID_EMAIL_REQUIRED: A valid email address is required.');
  }

  const product = getProductOrThrow(productId);
  const db = params.customDb || getDb();

  const internalOrderId = 'ord_' + crypto.randomUUID().slice(0, 12);
  const razorpayOrderId =
    params.customRazorpayOrderId ||
    'order_' + crypto.randomBytes(10).toString('hex');
  const now = Date.now();

  await db.execute(
    `INSERT INTO payment_orders (
       id, razorpay_order_id, user_id, email, product_id, amount, currency, status, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'created', $8, $9)`,
    [
      internalOrderId,
      razorpayOrderId,
      userId || null,
      normEmail,
      product.id,
      product.amountPaise,
      product.currency,
      now,
      now,
    ]
  );

  const orderRecord: PaymentOrderRecord = {
    id: internalOrderId,
    razorpay_order_id: razorpayOrderId,
    user_id: userId || null,
    email: normEmail,
    product_id: product.id,
    amount: product.amountPaise,
    currency: product.currency,
    status: 'created',
    created_at: now,
    updated_at: now,
  };

  return { order: orderRecord, product };
}

/**
 * Verifies Razorpay payment signature
 */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret?: string;
}): boolean {
  const { orderId, paymentId, signature } = params;
  const secret =
    params.secret ||
    process.env.RAZORPAY_KEY_SECRET ||
    'struct_razorpay_mock_secret_key_2026';

  const body = `${orderId}|${paymentId}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSig, 'utf8')
    );
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay webhook signature against raw request body
 */
export function verifyWebhookSignature(params: {
  rawBody: string;
  signature: string;
  webhookSecret?: string;
}): boolean {
  const { rawBody, signature } = params;
  const secret =
    params.webhookSecret ||
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    'struct_rzp_webhook_secret_2026';

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSig, 'utf8')
    );
  } catch {
    return false;
  }
}

/**
 * Idempotently captures a verified payment and grants entitlements in an atomic transaction
 */
export async function processCapturedPayment(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  amountPaise: number;
  method?: string;
  payloadJson?: string;
  customDb?: DbClient;
}): Promise<{
  success: boolean;
  alreadyProcessed: boolean;
  unitsGranted: number;
  newBalance: number;
  email: string;
}> {
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    amountPaise,
    method,
    payloadJson,
  } = params;

  const db = params.customDb || getDb();

  return await db.transaction(async (tx) => {
    // 1. Idempotency Check: Has this payment ID already been captured?
    const existingTx = await tx.queryOne<any>(
      'SELECT id, order_id, status FROM payment_transactions WHERE razorpay_payment_id = $1',
      [razorpayPaymentId]
    );

    // Look up the order
    const order = await tx.queryOne<PaymentOrderRecord>(
      'SELECT * FROM payment_orders WHERE razorpay_order_id = $1',
      [razorpayOrderId]
    );

    if (!order) {
      throw new Error(`ORDER_NOT_FOUND: No order found for Razorpay order ID "${razorpayOrderId}"`);
    }

    const isPlan = order.product_id.startsWith('plan_');
    const planTier = isPlan ? order.product_id.replace(/^plan_/, '') : null;
    const plan = planTier ? await getPlanByTier(planTier) : null;
    const product = isPlan ? null : getProductOrThrow(order.product_id);
    const featureType = product ? product.featureType : 'resume_ai_usage';
    const unitsGranted = product ? product.unitsGranted : (plan?.limits?.resumeAiCredits || 0);
    const normEmail = normalizeEmail(order.email);

    if (existingTx && existingTx.status === 'captured') {
      // Payment was already captured and credits granted (e.g. duplicate webhook)
      const currentEnt = await tx.queryOne<any>(
        'SELECT remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
        [normEmail, featureType]
      );
      return {
        success: true,
        alreadyProcessed: true,
        unitsGranted: 0,
        newBalance: Number(currentEnt?.remaining_balance || 0),
        email: normEmail,
      };
    }

    const now = Date.now();

    const finalAmountPaise = amountPaise || order.amount;

    // 2. Insert or update payment_transactions
    if (existingTx) {
      await tx.execute(
        `UPDATE payment_transactions
         SET status = 'captured', amount = $1, method = $2, payload_json = $3, created_at = $4
         WHERE id = $5`,
        [finalAmountPaise, method || 'webhook', payloadJson || '', now, existingTx.id]
      );
    } else {
      const txId = 'ptx_' + crypto.randomUUID().slice(0, 12);
      await tx.execute(
        `INSERT INTO payment_transactions (
           id, order_id, razorpay_payment_id, razorpay_signature, amount, status, method, payload_json, created_at
         ) VALUES ($1, $2, $3, $4, $5, 'captured', $6, $7, $8)`,
        [
          txId,
          order.id,
          razorpayPaymentId,
          razorpaySignature || '',
          finalAmountPaise,
          method || 'unknown',
          payloadJson || '',
          now,
        ]
      );
    }

    // 3. Mark payment_orders as paid
    await tx.execute(
      "UPDATE payment_orders SET status = 'paid', updated_at = $1 WHERE id = $2",
      [now, order.id]
    );

    // If subscription plan, activate or renew subscription
    if (isPlan && planTier) {
      await activateSubscription({
        userId: order.user_id || undefined,
        planTier,
        razorpaySubscriptionId: razorpayOrderId,
        razorpayCustomerId: normEmail,
      });
    }

    // 4. Upsert user_entitlements if units granted
    let newBalance = 0;
    if (unitsGranted > 0) {
      const entitlement = await tx.queryOne<any>(
        'SELECT * FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
        [normEmail, featureType]
      );

      let entitlementId: string;
      if (!entitlement) {
        entitlementId = 'ent_' + crypto.randomUUID().slice(0, 12);
        newBalance = unitsGranted;
        await tx.execute(
          `INSERT INTO user_entitlements (
             id, user_id, email, feature_type, total_granted, total_consumed, remaining_balance, updated_at
           ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7)`,
          [
            entitlementId,
            order.user_id,
            normEmail,
            featureType,
            unitsGranted,
            unitsGranted,
            now,
          ]
        );
      } else {
        entitlementId = entitlement.id;
        newBalance = Number(entitlement.remaining_balance) + unitsGranted;
        await tx.execute(
          `UPDATE user_entitlements
           SET total_granted = total_granted + $1,
               remaining_balance = remaining_balance + $1,
               user_id = COALESCE(user_id, $2),
               updated_at = $3
           WHERE id = $4`,
          [unitsGranted, order.user_id, now, entitlementId]
        );
      }

      // 5. Append to Immutable Entitlement Ledger
      const ledgerId = 'led_' + crypto.randomUUID().slice(0, 12);
      await tx.execute(
        `INSERT INTO entitlement_ledger (
           id, entitlement_id, delta, reason, reference_id, created_at
         ) VALUES ($1, $2, $3, 'purchase', $4, $5)`,
        [ledgerId, entitlementId, unitsGranted, razorpayPaymentId, now]
      );
    } else {
      const ent = await tx.queryOne<any>(
        'SELECT remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
        [normEmail, featureType]
      );
      newBalance = Number(ent?.remaining_balance || 0);
    }

    return {
      success: true,
      alreadyProcessed: false,
      unitsGranted,
      newBalance,
      email: normEmail,
    };
  });
}

/**
 * Queries Razorpay API directly to fetch payment entity for reconciliation
 */
export async function fetchRazorpayPaymentDetails(
  paymentId: string
): Promise<{
  id: string;
  order_id: string;
  status: string;
  amount: number;
  currency: string;
  method?: string;
} | null> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || keyId.startsWith('mock_')) {
    return null;
  }

  try {
    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return {
      id: data.id,
      order_id: data.order_id,
      status: data.status,
      amount: Number(data.amount),
      currency: data.currency,
      method: data.method,
    };
  } catch (err) {
    console.warn('[Razorpay Reconciliation] Failed to reach Razorpay API:', err);
    return null;
  }
}

/**
 * Server-side payment reconciliation:
 * Confirms payment captured via webhook OR direct Razorpay API before granting credits.
 * Browser callback alone NEVER grants credits without confirmed capture.
 */
export async function reconcileAndConfirmPayment(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  customDb?: DbClient;
  customFetchPayment?: (paymentId: string) => Promise<{
    id: string;
    order_id: string;
    status: string;
    amount: number;
    currency: string;
    method?: string;
  } | null>;
}): Promise<{
  confirmed: boolean;
  status: string;
  alreadyProcessed: boolean;
  unitsGranted: number;
  newBalance: number;
  email: string;
  message?: string;
}> {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;
  const db = params.customDb || getDb();

  // 1. Check if the payment was already captured by the webhook
  const existingTx = await db.queryOne<any>(
    "SELECT id, order_id, status FROM payment_transactions WHERE razorpay_payment_id = $1 AND status = 'captured'",
    [razorpayPaymentId]
  );

  const order = await db.queryOne<PaymentOrderRecord>(
    'SELECT * FROM payment_orders WHERE razorpay_order_id = $1',
    [razorpayOrderId]
  );

  if (!order) {
    throw new Error(`ORDER_NOT_FOUND: No order found for Razorpay order ID "${razorpayOrderId}"`);
  }

  const normEmail = normalizeEmail(order.email);
  const isPlan = order.product_id.startsWith('plan_');
  const product = isPlan ? null : getProductOrThrow(order.product_id);
  const featureType = product ? product.featureType : 'resume_ai_usage';

  if (existingTx) {
    const ent = await db.queryOne<any>(
      'SELECT remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
      [normEmail, featureType]
    );
    return {
      confirmed: true,
      status: 'captured',
      alreadyProcessed: true,
      unitsGranted: 0,
      newBalance: Number(ent?.remaining_balance || 0),
      email: normEmail,
      message: 'Payment already captured and credited via webhook.',
    };
  }

  // 2. Webhook has not processed it yet. Reconcile directly with Razorpay API
  const fetchFn = params.customFetchPayment || fetchRazorpayPaymentDetails;
  const remotePayment = await fetchFn(razorpayPaymentId);

  if (remotePayment) {
    // Validate order ID, currency, and amount match authoritatively
    const orderMatches = remotePayment.order_id === razorpayOrderId;
    const amountMatches = remotePayment.amount === order.amount;

    if (!orderMatches || !amountMatches) {
      console.warn('[Payment Security] Order details mismatch during reconciliation:', {
        remotePayment,
        expectedOrder: order,
      });
      return {
        confirmed: false,
        status: 'mismatch',
        alreadyProcessed: false,
        unitsGranted: 0,
        newBalance: 0,
        email: normEmail,
        message: 'Payment details from provider do not match internal order record.',
      };
    }

    // Only grant credits if Razorpay confirms the status is explicitly 'captured'
    if (remotePayment.status === 'captured') {
      const captureResult = await processCapturedPayment({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        amountPaise: order.amount,
        method: remotePayment.method || 'reconciled_api',
        payloadJson: JSON.stringify({ source: 'server_reconciliation', remotePayment }),
        customDb: db,
      });

      return {
        confirmed: true,
        status: 'captured',
        alreadyProcessed: captureResult.alreadyProcessed,
        unitsGranted: captureResult.unitsGranted,
        newBalance: captureResult.newBalance,
        email: normEmail,
        message: 'Payment verified and captured via server-side reconciliation.',
      };
    }

    // Merely authorized, pending, or failed payments do NOT grant credits
    return {
      confirmed: false,
      status: remotePayment.status,
      alreadyProcessed: false,
      unitsGranted: 0,
      newBalance: 0,
      email: normEmail,
      message: `Payment status is "${remotePayment.status}". Credits require captured status.`,
    };
  }

  // 3. If direct API check is unavailable, do NOT grant credits based only on client signature.
  // Record the verification attempt in payment_transactions with 'authorized' state.
  await db.transaction(async (tx) => {
    const existing = await tx.queryOne<any>(
      'SELECT id FROM payment_transactions WHERE razorpay_payment_id = $1',
      [razorpayPaymentId]
    );
    if (!existing) {
      const txId = 'ptx_' + crypto.randomUUID().slice(0, 12);
      await tx.execute(
        `INSERT INTO payment_transactions (
           id, order_id, razorpay_payment_id, razorpay_signature, amount, status, method, payload_json, created_at
         ) VALUES ($1, $2, $3, $4, $5, 'authorized', 'client_callback', $6, $7)`,
        [
          txId,
          order.id,
          razorpayPaymentId,
          razorpaySignature || '',
          order.amount,
          JSON.stringify({ source: 'client_signature_verified_awaiting_webhook', timestamp: Date.now() }),
          Date.now(),
        ]
      );
    }
  });

  const ent = await db.queryOne<any>(
    'SELECT remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
    [normEmail, featureType]
  );

  return {
    confirmed: false,
    status: 'pending_capture',
    alreadyProcessed: false,
    unitsGranted: 0,
    newBalance: Number(ent?.remaining_balance || 0),
    email: normEmail,
    message: 'Payment signature verified. Waiting for capture confirmation from Razorpay webhook.',
  };
}

/**
 * Handles a verified payment refund event cleanly without negative balances
 * Supports partial and full refunds with duplicate webhook idempotency.
 */
export async function processRefund(params: {
  razorpayPaymentId: string;
  refundId: string;
  amountPaise?: number;
  totalRefundedPaise?: number;
  customDb?: DbClient;
}): Promise<{
  success: boolean;
  alreadyRefunded: boolean;
  reversalDelta: number;
  newBalance: number;
  isFullRefund?: boolean;
}> {
  const { razorpayPaymentId, refundId, amountPaise, totalRefundedPaise } = params;
  const db = params.customDb || getDb();

  return await db.transaction(async (tx) => {
    // 1. Idempotency Check: Has this specific refundId already been recorded in the ledger?
    const existingRefund = await tx.queryOne<any>(
      "SELECT id FROM entitlement_ledger WHERE reference_id = $1 AND reason = 'refund'",
      [refundId]
    );

    const paymentTx = await tx.queryOne<any>(
      'SELECT id, order_id, amount, status FROM payment_transactions WHERE razorpay_payment_id = $1',
      [razorpayPaymentId]
    );

    if (!paymentTx) {
      throw new Error(`TRANSACTION_NOT_FOUND: Cannot refund unknown payment "${razorpayPaymentId}"`);
    }

    const order = await tx.queryOne<PaymentOrderRecord>(
      'SELECT * FROM payment_orders WHERE id = $1',
      [paymentTx.order_id]
    );

    if (!order) {
      throw new Error(`ORDER_NOT_FOUND: Order "${paymentTx.order_id}" not found`);
    }

    const isPlan = order.product_id.startsWith('plan_');
    const planTier = isPlan ? order.product_id.replace(/^plan_/, '') : null;
    const plan = planTier ? await getPlanByTier(planTier) : null;
    const product = isPlan ? null : getProductOrThrow(order.product_id);
    const featureType = product ? product.featureType : 'resume_ai_usage';
    const planUnits = plan?.limits?.resumeAiCredits || 0;
    const normEmail = normalizeEmail(order.email);
    const now = Date.now();

    const entitlement = await tx.queryOne<any>(
      'SELECT * FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
      [normEmail, featureType]
    );

    const currentBalance = Number(entitlement?.remaining_balance || 0);

    // If this specific refundId was already processed, exit idempotently without changes
    if (existingRefund) {
      return {
        success: true,
        alreadyRefunded: true,
        reversalDelta: 0,
        newBalance: currentBalance,
        isFullRefund: order.status === 'refunded',
      };
    }

    // If order was already fully refunded in a previous event, do not reverse credits again
    if (order.status === 'refunded') {
      const ledgerId = 'led_' + crypto.randomUUID().slice(0, 12);
      if (entitlement) {
        await tx.execute(
          `INSERT INTO entitlement_ledger (
             id, entitlement_id, delta, reason, reference_id, created_at
           ) VALUES ($1, $2, 0, 'refund', $3, $4)`,
          [ledgerId, entitlement.id, refundId, now]
        );
      }
      return {
        success: true,
        alreadyRefunded: true,
        reversalDelta: 0,
        newBalance: currentBalance,
        isFullRefund: true,
      };
    }

    // 2. Policy Enforcement: Digital credit packs support FULL refunds only.
    // Validate refund amounts: must be finite positive numbers.
    const isValidAmount = typeof amountPaise === 'number' && Number.isFinite(amountPaise) && amountPaise > 0;
    const isValidTotal = typeof totalRefundedPaise === 'number' && Number.isFinite(totalRefundedPaise) && totalRefundedPaise > 0;

    // Full reversal requires a valid refund amount covering the order amount,
    // or a valid cumulative amount_refunded reaching the order amount.
    const isFullRefund =
      (isValidAmount && amountPaise >= order.amount) ||
      (isValidTotal && totalRefundedPaise >= order.amount);

    if (!isValidAmount && !isValidTotal) {
      console.warn(
        `[Payment Refund Warning] Refund "${refundId}" for payment "${razorpayPaymentId}" has missing or invalid refund amounts (amountPaise=${amountPaise}, totalRefundedPaise=${totalRefundedPaise}). Zero credits reversed; logged for review.`
      );
    }

    const targetUnits = isFullRefund ? (product ? product.unitsGranted : planUnits) : 0;

    // 3. Update statuses only when full refund is confirmed
    if (isFullRefund) {
      await tx.execute(
        "UPDATE payment_transactions SET status = 'refunded' WHERE id = $1",
        [paymentTx.id]
      );
      await tx.execute(
        "UPDATE payment_orders SET status = 'refunded', updated_at = $1 WHERE id = $2",
        [now, order.id]
      );
      if (isPlan) {
        await cancelSubscription({ razorpaySubscriptionId: order.razorpay_order_id });
      }
    }

    if (!entitlement) {
      return { success: true, alreadyRefunded: false, reversalDelta: 0, newBalance: 0, isFullRefund };
    }

    // Safe reversal: Deduct only up to available balance so it NEVER becomes negative
    const reversalUnits = Math.min(currentBalance, targetUnits);
    const newBalance = currentBalance - reversalUnits;

    if (reversalUnits > 0) {
      await tx.execute(
        `UPDATE user_entitlements
         SET remaining_balance = remaining_balance - $1,
             updated_at = $2
         WHERE id = $3 AND remaining_balance >= $1`,
        [reversalUnits, now, entitlement.id]
      );
    }

    // 4. Append to immutable ledger (recording referenceId even for 0-delta partial refunds for idempotency)
    const ledgerId = 'led_' + crypto.randomUUID().slice(0, 12);
    await tx.execute(
      `INSERT INTO entitlement_ledger (
         id, entitlement_id, delta, reason, reference_id, created_at
       ) VALUES ($1, $2, $3, 'refund', $4, $5)`,
      [ledgerId, entitlement.id, reversalUnits > 0 ? -reversalUnits : 0, refundId, now]
    );

    return {
      success: true,
      alreadyRefunded: false,
      reversalDelta: reversalUnits > 0 ? -reversalUnits : 0,
      newBalance,
      isFullRefund,
    };
  });
}

// Active in-flight operations registry in this server process (fast local cache)
const activeOperations = new Map<string, { startTime: number; email: string }>();

export function markOperationActive(referenceId: string, email: string): void {
  activeOperations.set(referenceId, { startTime: Date.now(), email: normalizeEmail(email) });
}

export function markOperationComplete(referenceId: string): void {
  activeOperations.delete(referenceId);
}

export function isOperationActive(referenceId: string): boolean {
  return activeOperations.has(referenceId);
}

export function getActiveOperationsCount(): number {
  return activeOperations.size;
}

export const DEFAULT_LEASE_DURATION_MS = 60 * 1000; // 60 seconds lease
export const HEARTBEAT_INTERVAL_MS = 15 * 1000; // 15 seconds heartbeat interval
export const STALE_RESERVATION_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes fallback cutoff

/**
 * Checks whether an active, non-expired reservation exists in the database.
 * Cross-instance authoritative check.
 */
export async function isReservationActive(referenceId: string, customDb?: DbClient): Promise<boolean> {
  const db = customDb || getDb();
  const row = await db.queryOne<any>(
    "SELECT id FROM entitlement_reservations WHERE reference_id = $1 AND status = 'reserved' AND lease_expires_at > $2",
    [referenceId, Date.now()]
  );
  return !!row;
}

/**
 * Extends the durable database lease for an active reservation.
 * Heartbeat called periodically by workers executing AI operations.
 */
export async function heartbeatReservation(params: {
  referenceId: string;
  leaseDurationMs?: number;
  customDb?: DbClient;
}): Promise<{
  success: boolean;
  leaseExpiresAt: number;
}> {
  const { referenceId } = params;
  const leaseDurationMs = params.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS;
  const db = params.customDb || getDb();
  const now = Date.now();
  const newLeaseExpiresAt = now + leaseDurationMs;

  const result = await db.execute(
    `UPDATE entitlement_reservations
     SET lease_expires_at = $1, heartbeat_at = $2, updated_at = $2
     WHERE reference_id = $3 AND status = 'reserved'`,
    [newLeaseExpiresAt, now, referenceId]
  );

  return {
    success: result.rowCount > 0,
    leaseExpiresAt: newLeaseExpiresAt,
  };
}

/**
 * Recovers stale reservations caused by server crashes or unhandled drops.
 *
 * Safety Rules:
 * 1. Database is the authoritative source for all reservation state.
 * 2. Only recovers reservations whose active lease has expired (now >= lease_expires_at).
 * 3. Atomic CAS transition (status = 'reserved' -> 'released') prevents duplicate recoveries across instances.
 * 4. Increments remaining_balance by 1 and records 'release_ai_reservation' in ledger.
 * 5. Strictly idempotent; cannot release the same referenceId twice.
 * 6. Prevents double-credit: net change across reservation (-1) and release (+1) is exactly 0.
 */
async function executeStaleRecovery(
  tx: DbClient,
  normEmail: string | undefined,
  cutoffTime: number
): Promise<{
  recoveredCount: number;
  recoveredReferenceIds: string[];
}> {
  const now = Date.now();
  const recoveredReferenceIds: string[] = [];

  // Path 1: Check durable entitlement_reservations table
  let resQuery = `
    SELECT r.id, r.entitlement_id, r.reference_id, r.lease_expires_at, e.email, e.feature_type, e.remaining_balance
    FROM entitlement_reservations r
    JOIN user_entitlements e ON r.entitlement_id = e.id
    WHERE r.status = 'reserved'
      AND r.lease_expires_at <= $1
  `;
  const resParams: any[] = [now];
  if (normEmail) {
    resQuery += ' AND LOWER(e.email) = LOWER($2)';
    resParams.push(normEmail);
  }

  const expiredReservations = await tx.query<any>(resQuery, resParams);

  for (const cand of expiredReservations.rows) {
    const refId = cand.reference_id;
    if (!refId) continue;

    // Fast local skip if active in current worker memory
    if (isOperationActive(refId)) {
      continue;
    }

    // Atomic compare-and-swap: transition from 'reserved' to 'released'
    const updateRes = await tx.execute(
      `UPDATE entitlement_reservations
       SET status = 'released', updated_at = $1
       WHERE id = $2 AND status = 'reserved'`,
      [now, cand.id]
    );

    // If another worker or instance already settled or released it, skip
    if (updateRes.rowCount === 0) {
      continue;
    }

    // Restore 1 credit back to user_entitlements
    await tx.execute(
      `UPDATE user_entitlements
       SET remaining_balance = remaining_balance + 1,
           updated_at = $1
       WHERE id = $2`,
      [now, cand.entitlement_id]
    );

    // Append release event to ledger
    const ledgerId = 'led_' + crypto.randomUUID().slice(0, 12);
    await tx.execute(
      `INSERT INTO entitlement_ledger (
         id, entitlement_id, delta, reason, reference_id, created_at
       ) VALUES ($1, $2, +1, 'release_ai_reservation', $3, $4)`,
      [ledgerId, cand.entitlement_id, refId, now]
    );

    recoveredReferenceIds.push(refId);
  }

  // Path 2: Check legacy ledger for any entries not present in entitlement_reservations
  let querySql = `
    SELECT l.id, l.entitlement_id, l.reference_id, l.created_at, e.email, e.feature_type, e.remaining_balance
    FROM entitlement_ledger l
    JOIN user_entitlements e ON l.entitlement_id = e.id
    WHERE l.reason = 'reserve_ai_analysis'
      AND l.created_at <= $1
      AND l.reference_id NOT IN (SELECT reference_id FROM entitlement_reservations)
  `;
  const queryParams: any[] = [cutoffTime];

  if (normEmail) {
    querySql += ' AND LOWER(e.email) = LOWER($2)';
    queryParams.push(normEmail);
  }

  const legacyCandidates = await tx.query<any>(querySql, queryParams);

  for (const cand of legacyCandidates.rows) {
    const refId = cand.reference_id;
    if (!refId) continue;

    if (isOperationActive(refId)) {
      continue;
    }

    const existingTerminal = await tx.queryOne<any>(
      "SELECT id FROM entitlement_ledger WHERE reference_id = $1 AND reason IN ('settle_ai_analysis', 'release_ai_reservation')",
      [refId]
    );
    if (existingTerminal) {
      continue;
    }

    await tx.execute(
      `UPDATE user_entitlements
       SET remaining_balance = remaining_balance + 1,
           updated_at = $1
       WHERE id = $2`,
      [now, cand.entitlement_id]
    );

    const ledgerId = 'led_' + crypto.randomUUID().slice(0, 12);
    await tx.execute(
      `INSERT INTO entitlement_ledger (
         id, entitlement_id, delta, reason, reference_id, created_at
       ) VALUES ($1, $2, +1, 'release_ai_reservation', $3, $4)`,
      [ledgerId, cand.entitlement_id, refId, now]
    );

    recoveredReferenceIds.push(refId);
  }

  return {
    recoveredCount: recoveredReferenceIds.length,
    recoveredReferenceIds,
  };
}

export async function recoverStaleReservations(params?: {
  email?: string;
  maxAgeMs?: number;
  customDb?: DbClient;
}): Promise<{
  recoveredCount: number;
  recoveredReferenceIds: string[];
}> {
  const maxAgeMs = params?.maxAgeMs ?? STALE_RESERVATION_MAX_AGE_MS;
  const cutoffTime = Date.now() - maxAgeMs;
  const normEmail = params?.email ? normalizeEmail(params.email) : undefined;

  if (params?.customDb) {
    return await executeStaleRecovery(params.customDb, normEmail, cutoffTime);
  }

  const db = getDb();
  return await db.transaction(async (tx) => {
    return await executeStaleRecovery(tx, normEmail, cutoffTime);
  });
}

/**
 * Atomically reserves 1 usage entitlement BEFORE starting expensive AI analysis.
 * Stores a durable lease in entitlement_reservations to prevent concurrent overdraw.
 */
export async function reserveEntitlement(params: {
  email: string;
  featureType: 'resume_ai_usage' | 'mock_interview_attempt' | 'mock_assessment_attempt';
  referenceId: string;
  leaseDurationMs?: number;
  customDb?: DbClient;
}): Promise<{
  success: boolean;
  alreadyReserved: boolean;
  remainingBalance: number;
}> {
  const { email, featureType, referenceId } = params;
  const leaseDurationMs = params.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS;
  const normEmail = normalizeEmail(email);
  const db = params.customDb || getDb();
  const now = Date.now();
  const leaseExpiresAt = now + leaseDurationMs;

  const executeReservation = async (tx: DbClient) => {
    // Proactively recover any stale reservations for this user before evaluating balance
    await recoverStaleReservations({ email: normEmail, customDb: tx });

    // Check durable entitlement_reservations table
    const existingRes = await tx.queryOne<any>(
      `SELECT r.id, r.status, r.lease_expires_at, e.remaining_balance
       FROM entitlement_reservations r
       JOIN user_entitlements e ON r.entitlement_id = e.id
       WHERE r.reference_id = $1`,
      [referenceId]
    );

    if (existingRes) {
      if (existingRes.status === 'reserved' || existingRes.status === 'settled') {
        return {
          success: true,
          alreadyReserved: true,
          remainingBalance: Number(existingRes.remaining_balance),
        };
      }
    }

    // Check legacy ledger
    const existing = await tx.queryOne<any>(
      `SELECT l.id, l.reason, e.remaining_balance
       FROM entitlement_ledger l
       JOIN user_entitlements e ON l.entitlement_id = e.id
       WHERE l.reference_id = $1 AND l.reason IN ('reserve_ai_analysis', 'consume_ai_analysis', 'settle_ai_analysis')`,
      [referenceId]
    );

    if (existing && !existingRes) {
      return {
        success: true,
        alreadyReserved: true,
        remainingBalance: Number(existing.remaining_balance),
      };
    }

    // Atomic conditional decrement: Only decrements if remaining_balance >= 1
    const updateResult = await tx.execute(
      `UPDATE user_entitlements
       SET remaining_balance = remaining_balance - 1,
           updated_at = $1
       WHERE LOWER(email) = LOWER($2)
         AND feature_type = $3
         AND remaining_balance >= 1`,
      [now, normEmail, featureType]
    );

    if (updateResult.rowCount === 0) {
      const current = await tx.queryOne<any>(
        'SELECT remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
        [normEmail, featureType]
      );
      return {
        success: false,
        alreadyReserved: false,
        remainingBalance: Number(current?.remaining_balance || 0),
      };
    }

    const updated = await tx.queryOne<any>(
      'SELECT id, remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
      [normEmail, featureType]
    );

    // Record reservation event in ledger
    const ledgerId = 'led_' + crypto.randomUUID().slice(0, 12);
    await tx.execute(
      `INSERT INTO entitlement_ledger (
         id, entitlement_id, delta, reason, reference_id, created_at
       ) VALUES ($1, $2, -1, 'reserve_ai_analysis', $3, $4)`,
      [ledgerId, updated.id, referenceId, now]
    );

    // Record durable reservation with lease in entitlement_reservations
    if (existingRes) {
      await tx.execute(
        `UPDATE entitlement_reservations
         SET status = 'reserved', lease_expires_at = $1, heartbeat_at = $2, updated_at = $2
         WHERE reference_id = $3`,
        [leaseExpiresAt, now, referenceId]
      );
    } else {
      const resId = 'res_' + crypto.randomUUID().slice(0, 12);
      await tx.execute(
        `INSERT INTO entitlement_reservations (
           id, entitlement_id, reference_id, status, lease_expires_at, heartbeat_at, created_at, updated_at
         ) VALUES ($1, $2, $3, 'reserved', $4, $5, $6, $7)`,
        [resId, updated.id, referenceId, leaseExpiresAt, now, now, now]
      );
    }

    return {
      success: true,
      alreadyReserved: false,
      remainingBalance: Number(updated.remaining_balance),
    };
  };

  if (params.customDb) {
    return await executeReservation(params.customDb);
  }
  return await db.transaction(executeReservation);
}

/**
 * Settles an active entitlement reservation AFTER successful AI generation.
 * Marks 1 credit as consumed and transitions reservation to 'settled'.
 */
export async function settleEntitlementReservation(params: {
  email: string;
  featureType: 'resume_ai_usage' | 'mock_interview_attempt' | 'mock_assessment_attempt';
  referenceId: string;
  customDb?: DbClient;
}): Promise<{
  success: boolean;
  remainingBalance: number;
}> {
  const { email, featureType, referenceId } = params;
  const normEmail = normalizeEmail(email);
  const db = params.customDb || getDb();
  const now = Date.now();

  const executeSettle = async (tx: DbClient) => {
    // 1. Atomic transition from 'reserved' to 'settled' in durable reservations table
    const updateRes = await tx.execute(
      `UPDATE entitlement_reservations
       SET status = 'settled', updated_at = $1
       WHERE reference_id = $2 AND status = 'reserved'`,
      [now, referenceId]
    );

    if (updateRes.rowCount === 0) {
      const existing = await tx.queryOne<any>(
        'SELECT status FROM entitlement_reservations WHERE reference_id = $1',
        [referenceId]
      );

      if (existing) {
        if (existing.status === 'settled') {
          const bal = await tx.queryOne<any>(
            'SELECT remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
            [normEmail, featureType]
          );
          return { success: true, remainingBalance: Number(bal?.remaining_balance || 0) };
        } else if (existing.status === 'released') {
          throw new Error(`RESERVATION_ALREADY_RELEASED: Cannot settle reference "${referenceId}" because it has already been released or recovered`);
        }
      }

      // Check legacy ledger
      const isReleased = await tx.queryOne<any>(
        "SELECT id FROM entitlement_ledger WHERE reference_id = $1 AND reason = 'release_ai_reservation'",
        [referenceId]
      );
      if (isReleased) {
        throw new Error(`RESERVATION_ALREADY_RELEASED: Cannot settle reference "${referenceId}" because it has already been released or recovered`);
      }

      const isSettled = await tx.queryOne<any>(
        "SELECT id FROM entitlement_ledger WHERE reference_id = $1 AND reason = 'settle_ai_analysis'",
        [referenceId]
      );
      if (isSettled) {
        const bal = await tx.queryOne<any>(
          'SELECT remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
          [normEmail, featureType]
        );
        return { success: true, remainingBalance: Number(bal?.remaining_balance || 0) };
      }

      const hasReservation = await tx.queryOne<any>(
        "SELECT id FROM entitlement_ledger WHERE reference_id = $1 AND reason = 'reserve_ai_analysis'",
        [referenceId]
      );
      if (!hasReservation) {
        throw new Error(`NO_ACTIVE_RESERVATION: Cannot settle unreserved reference "${referenceId}"`);
      }
    }

    // 2. Increment total_consumed on user_entitlements
    await tx.execute(
      `UPDATE user_entitlements
       SET total_consumed = total_consumed + 1,
           updated_at = $1
       WHERE LOWER(email) = LOWER($2) AND feature_type = $3`,
      [now, normEmail, featureType]
    );

    const entitlement = await tx.queryOne<any>(
      'SELECT id, remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
      [normEmail, featureType]
    );

    // 3. Record settlement event in ledger (delta 0 since credit was deducted at reservation)
    const ledgerId = 'led_' + crypto.randomUUID().slice(0, 12);
    await tx.execute(
      `INSERT INTO entitlement_ledger (
         id, entitlement_id, delta, reason, reference_id, created_at
       ) VALUES ($1, $2, 0, 'settle_ai_analysis', $3, $4)`,
      [ledgerId, entitlement.id, referenceId, now]
    );

    return {
      success: true,
      remainingBalance: Number(entitlement.remaining_balance),
    };
  };

  if (params.customDb) {
    return await executeSettle(params.customDb);
  }
  return await db.transaction(executeSettle);
}

/**
 * Releases a reserved entitlement if AI generation fails, times out, or falls back.
 * Restores the reserved credit back to remaining_balance.
 */
export async function releaseEntitlementReservation(params: {
  email: string;
  featureType: 'resume_ai_usage' | 'mock_interview_attempt' | 'mock_assessment_attempt';
  referenceId: string;
  customDb?: DbClient;
}): Promise<{
  success: boolean;
  remainingBalance: number;
}> {
  const { email, featureType, referenceId } = params;
  const normEmail = normalizeEmail(email);
  const db = params.customDb || getDb();
  const now = Date.now();

  const executeRelease = async (tx: DbClient) => {
    // 1. Atomic transition from 'reserved' to 'released' in durable reservations table
    const updateRes = await tx.execute(
      `UPDATE entitlement_reservations
       SET status = 'released', updated_at = $1
       WHERE reference_id = $2 AND status = 'reserved'`,
      [now, referenceId]
    );

    if (updateRes.rowCount === 0) {
      const existing = await tx.queryOne<any>(
        'SELECT status FROM entitlement_reservations WHERE reference_id = $1',
        [referenceId]
      );

      if (existing) {
        if (existing.status === 'released') {
          const bal = await tx.queryOne<any>(
            'SELECT remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
            [normEmail, featureType]
          );
          return { success: true, remainingBalance: Number(bal?.remaining_balance || 0) };
        } else if (existing.status === 'settled') {
          const bal = await tx.queryOne<any>(
            'SELECT remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
            [normEmail, featureType]
          );
          return { success: false, remainingBalance: Number(bal?.remaining_balance || 0) };
        }
      }

      // Check legacy ledger
      const isSettled = await tx.queryOne<any>(
        "SELECT id FROM entitlement_ledger WHERE reference_id = $1 AND reason = 'settle_ai_analysis'",
        [referenceId]
      );
      if (isSettled) {
        const bal = await tx.queryOne<any>(
          'SELECT remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
          [normEmail, featureType]
        );
        return { success: false, remainingBalance: Number(bal?.remaining_balance || 0) };
      }

      const isReleased = await tx.queryOne<any>(
        "SELECT id FROM entitlement_ledger WHERE reference_id = $1 AND reason = 'release_ai_reservation'",
        [referenceId]
      );
      if (isReleased) {
        const bal = await tx.queryOne<any>(
          'SELECT remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
          [normEmail, featureType]
        );
        return { success: true, remainingBalance: Number(bal?.remaining_balance || 0) };
      }

      const hasReservation = await tx.queryOne<any>(
        "SELECT id FROM entitlement_ledger WHERE reference_id = $1 AND reason = 'reserve_ai_analysis'",
        [referenceId]
      );
      if (!hasReservation) {
        const bal = await tx.queryOne<any>(
          'SELECT remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
          [normEmail, featureType]
        );
        return { success: false, remainingBalance: Number(bal?.remaining_balance || 0) };
      }
    }

    // 2. Restore remaining_balance
    await tx.execute(
      `UPDATE user_entitlements
       SET remaining_balance = remaining_balance + 1,
           updated_at = $1
       WHERE LOWER(email) = LOWER($2) AND feature_type = $3`,
      [now, normEmail, featureType]
    );

    const entitlement = await tx.queryOne<any>(
      'SELECT id, remaining_balance FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
      [normEmail, featureType]
    );

    // 3. Record release event in ledger
    const ledgerId = 'led_' + crypto.randomUUID().slice(0, 12);
    await tx.execute(
      `INSERT INTO entitlement_ledger (
         id, entitlement_id, delta, reason, reference_id, created_at
       ) VALUES ($1, $2, +1, 'release_ai_reservation', $3, $4)`,
      [ledgerId, entitlement.id, referenceId, now]
    );

    return {
      success: true,
      remainingBalance: Number(entitlement.remaining_balance),
    };
  };

  if (params.customDb) {
    return await executeRelease(params.customDb);
  }
  return await db.transaction(executeRelease);
}

/**
 * Backward-compatible single-step consumption: atomically reserves and settles
 */
export async function consumeEntitlement(params: {
  email: string;
  featureType: 'resume_ai_usage' | 'mock_interview_attempt' | 'mock_assessment_attempt';
  referenceId: string;
  customDb?: DbClient;
}): Promise<{
  success: boolean;
  remainingBalance: number;
}> {
  const reserveRes = await reserveEntitlement(params);
  if (!reserveRes.success) {
    return { success: false, remainingBalance: reserveRes.remainingBalance };
  }
  return await settleEntitlementReservation(params);
}

/**
 * Backward-compatible reversal of consumption
 */
export async function reverseFailedConsumption(params: {
  email: string;
  featureType: 'resume_ai_usage' | 'mock_interview_attempt' | 'mock_assessment_attempt';
  referenceId: string;
  customDb?: DbClient;
}): Promise<void> {
  await releaseEntitlementReservation(params);
}

/**
 * Queries active entitlement balance
 */
export async function getEntitlementBalance(
  email: string,
  featureType: string = 'resume_ai_usage',
  customDb?: DbClient
): Promise<EntitlementBalance> {
  const normEmail = normalizeEmail(email);
  const db = customDb || getDb();

  // Proactively recover any stale reservations for this user
  await recoverStaleReservations({ email: normEmail, customDb: db });

  const row = await db.queryOne<any>(
    'SELECT * FROM user_entitlements WHERE LOWER(email) = LOWER($1) AND feature_type = $2',
    [normEmail, featureType]
  );

  return {
    email: normEmail,
    featureType,
    remainingBalance: Number(row?.remaining_balance || 0),
    totalGranted: Number(row?.total_granted || 0),
    totalConsumed: Number(row?.total_consumed || 0),
  };
}
