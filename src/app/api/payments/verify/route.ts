import { NextResponse } from 'next/server';
import { verifyRazorpaySignature, reconcileAndConfirmPayment } from '@/lib/payments/service';
import { createGuestEntitlementToken } from '@/lib/payments/guestAuth';
import { getDb } from '@/lib/assess/db';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'Missing payment signature verification parameters.' },
        { status: 400 }
      );
    }

    // 1. Verify Razorpay cryptographic signature server-side
    const isValid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      console.warn('[Payment Security] Tampered signature detected for order:', razorpayOrderId);
      return NextResponse.json(
        { error: 'Invalid payment signature. Payment verification failed.' },
        { status: 400 }
      );
    }

    // 2. Fetch the corresponding order to get the authoritative amount
    const db = getDb();
    const order = await db.queryOne<any>(
      'SELECT * FROM payment_orders WHERE razorpay_order_id = $1',
      [razorpayOrderId]
    );

    if (!order) {
      return NextResponse.json(
        { error: 'Order reference not found.' },
        { status: 404 }
      );
    }

    // 3. Reconcile payment state: Confirm capture via webhook or server-to-server Razorpay API.
    // Client signature alone NEVER directly grants credits.
    const result = await reconcileAndConfirmPayment({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!result.confirmed) {
      return NextResponse.json({
        success: true,
        verified: true,
        captured: false,
        status: result.status,
        email: result.email,
        remainingUsages: result.newBalance,
        message: result.message || 'Signature verified. Awaiting webhook payment confirmation.',
      });
    }

    // 4. Generate guest entitlement token for client retention only after capture is confirmed
    const guestToken = createGuestEntitlementToken(result.email);

    const response = NextResponse.json({
      success: true,
      verified: true,
      captured: true,
      email: result.email,
      remainingUsages: result.newBalance,
      guestToken,
      message: result.alreadyProcessed
        ? 'Payment previously confirmed. Entitlements active.'
        : 'Payment confirmed! 2 AI Usages have been credited to your account.',
    });

    // Set secure cookie for guest persistence
    response.cookies.set({
      name: 'struct_guest_token',
      value: guestToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 90 * 24 * 60 * 60, // 90 days
    });

    return response;
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment verification failed.' },
      { status: 500 }
    );
  }
}
