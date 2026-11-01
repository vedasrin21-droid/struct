import { NextRequest, NextResponse } from 'next/server';
import { getPlanByTier, activateSubscription } from '@/lib/payments/subscriptions';
import { validatePromoCode } from '@/lib/payments/promos';
import { getAuthContext } from '@/lib/auth/rbac';
import { getDb } from '@/lib/assess/db';
import crypto from 'node:crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planTier, promoCode, organizationId } = body;

    if (!planTier) {
      return NextResponse.json(
        { success: false, error: 'planTier is required.' },
        { status: 400 }
      );
    }

    const plan = await getPlanByTier(planTier);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: `Invalid plan tier "${planTier}".` },
        { status: 404 }
      );
    }

    const authCtx = await getAuthContext(request);
    let amountPaise = plan.priceInr * 100;
    let promoResult = null;

    // Apply promo code if provided
    if (promoCode) {
      promoResult = await validatePromoCode({
        code: promoCode,
        amountPaise,
        planId: plan.id,
        userId: authCtx?.userId,
        organizationId,
      });

      if (promoResult.isValid) {
        amountPaise = promoResult.discountedAmountPaise;
      }
    }

    // Free plan (e.g. Recruit Free ₹0 or 100% discount promo)
    if (amountPaise === 0) {
      const sub = await activateSubscription({
        userId: authCtx?.userId,
        organizationId,
        planTier: plan.tierCode,
      });

      return NextResponse.json({
        success: true,
        isFree: true,
        subscriptionId: sub.subscriptionId,
        plan: sub.plan,
      });
    }

    // Razorpay order creation for paid subscription
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    const rzpOrderId = 'order_sub_' + crypto.randomBytes(8).toString('hex');
    const db = getDb();
    const now = Date.now();
    const orderId = 'ord_' + crypto.randomUUID();

    // Persist payment order in database
    await db.execute(
      `INSERT INTO payment_orders (id, razorpay_order_id, user_id, email, product_id, amount, currency, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'INR', 'created', $7, $8)`,
      [
        orderId,
        rzpOrderId,
        authCtx?.userId || null,
        authCtx?.email || 'customer@struct.careers',
        `plan_${plan.tierCode}`,
        amountPaise,
        now,
        now,
      ]
    );

    return NextResponse.json({
      success: true,
      isFree: false,
      orderId: rzpOrderId,
      amountPaise,
      currency: 'INR',
      keyId: razorpayKeyId || 'rzp_test_placeholder',
      planName: plan.name,
      planTier: plan.tierCode,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Subscription checkout failed' },
      { status: 500 }
    );
  }
}
