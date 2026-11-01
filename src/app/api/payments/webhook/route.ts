import { NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  processCapturedPayment,
  processRefund,
} from '@/lib/payments/service';
import { renewSubscription, cancelSubscription } from '@/lib/payments/subscriptions';
import { getDb } from '@/lib/assess/db';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    if (!signature) {
      console.warn('[Webhook Warning] Missing x-razorpay-signature header.');
      return NextResponse.json(
        { error: 'Missing x-razorpay-signature header.' },
        { status: 400 }
      );
    }

    // 1. Verify Webhook Signature against raw payload
    const isSignatureValid = verifyWebhookSignature({
      rawBody,
      signature,
    });

    if (!isSignatureValid) {
      console.error('[Webhook Security Alert] Invalid Razorpay webhook signature detected.');
      return NextResponse.json(
        { error: 'Invalid webhook signature.' },
        { status: 400 }
      );
    }

    // 2. Parse event payload
    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const payload = event.payload;

    console.log(`[Razorpay Webhook Received] Event: ${eventType}, ID: ${event.id}`);

    // 3. Dispatch by event type
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload.payment?.entity;
      if (!paymentEntity) {
        return NextResponse.json({ error: 'Missing payment entity in payload' }, { status: 400 });
      }

      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;
      const amountPaise = Number(paymentEntity.amount);
      const method = paymentEntity.method || 'unknown';

      if (!razorpayOrderId || !razorpayPaymentId) {
        return NextResponse.json({ error: 'Missing order_id or payment id in entity' }, { status: 400 });
      }

      // Idempotently capture in database and grant entitlements
      const result = await processCapturedPayment({
        razorpayOrderId,
        razorpayPaymentId,
        amountPaise,
        method,
        payloadJson: rawBody,
      });

      console.log(
        `[Webhook Processed] Order: ${razorpayOrderId}, Payment: ${razorpayPaymentId}, AlreadyProcessed: ${result.alreadyProcessed}, Balance: ${result.newBalance}`
      );

      return NextResponse.json({
        status: 'ok',
        event: eventType,
        alreadyProcessed: result.alreadyProcessed,
        unitsGranted: result.unitsGranted,
      });
    }

    if (eventType === 'payment.failed') {
      const paymentEntity = payload.payment?.entity;
      if (paymentEntity?.order_id) {
        const db = getDb();
        await db.execute(
          "UPDATE payment_orders SET status = 'failed', updated_at = $1 WHERE razorpay_order_id = $2",
          [Date.now(), paymentEntity.order_id]
        );
      }
      return NextResponse.json({ status: 'ok', event: eventType, handled: true });
    }

    if (
      eventType === 'refund.created' ||
      eventType === 'refund.processed' ||
      eventType === 'payment.refunded'
    ) {
      const refundEntity = payload.refund?.entity || payload.payment?.entity;
      const paymentId = refundEntity?.payment_id || refundEntity?.id;
      const refundId = refundEntity?.id || 'ref_' + Date.now();

      if (paymentId) {
        const amountPaise = refundEntity?.amount ? Number(refundEntity.amount) : undefined;
        const totalRefundedPaise = payload.payment?.entity?.amount_refunded
          ? Number(payload.payment.entity.amount_refunded)
          : undefined;

        const refundResult = await processRefund({
          razorpayPaymentId: paymentId,
          refundId,
          amountPaise,
          totalRefundedPaise,
        });

        console.log(
          `[Webhook Refund Processed] Payment: ${paymentId}, ReversalDelta: ${refundResult.reversalDelta}, AlreadyRefunded: ${refundResult.alreadyRefunded}, NewBalance: ${refundResult.newBalance}, IsFullRefund: ${refundResult.isFullRefund}`
        );

        return NextResponse.json({
          status: 'ok',
          event: eventType,
          refunded: true,
          alreadyRefunded: refundResult.alreadyRefunded,
          reversalDelta: refundResult.reversalDelta,
          isFullRefund: refundResult.isFullRefund,
        });
      }
    }

    // 4. Recurring Subscription Events
    if (eventType === 'subscription.charged' || eventType === 'subscription.authenticated') {
      const subEntity = payload.subscription?.entity;
      const subId = subEntity?.id;
      const currentEnd = subEntity?.current_end;

      if (subId) {
        const renewResult = await renewSubscription({
          razorpaySubscriptionId: subId,
          currentPeriodEnd: currentEnd,
        });

        console.log(`[Subscription Charged] ID: ${subId}, Renewed: ${renewResult.renewed}`);
        return NextResponse.json({
          status: 'ok',
          event: eventType,
          renewed: renewResult.renewed,
        });
      }
    }

    if (eventType === 'subscription.cancelled' || eventType === 'subscription.paused') {
      const subEntity = payload.subscription?.entity;
      const subId = subEntity?.id;

      if (subId) {
        const cancelResult = await cancelSubscription({
          razorpaySubscriptionId: subId,
        });

        console.log(`[Subscription Cancelled] ID: ${subId}, Canceled: ${cancelResult.canceled}`);
        return NextResponse.json({
          status: 'ok',
          event: eventType,
          canceled: cancelResult.canceled,
        });
      }
    }

    // Default 200 acknowledgment for unhandled events
    return NextResponse.json({ status: 'ok', unhandledEvent: eventType });
  } catch (error: any) {
    console.error('[Razorpay Webhook Error]', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
