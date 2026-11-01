import { NextResponse } from 'next/server';
import { createPaymentOrder } from '@/lib/payments/service';
import { getProductOrThrow } from '@/lib/payments/catalog';
import { resolveEntitlementIdentity, normalizeEmail } from '@/lib/payments/guestAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { productId, email: inputEmail } = body;

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { error: 'Valid productId is required.' },
        { status: 400 }
      );
    }

    // 1. Validate product existence and availability in authoritative catalog
    const productDef = getProductOrThrow(productId);

    // 2. Resolve identity: If user is logged in, use their verified email; otherwise use supplied email
    const identity = await resolveEntitlementIdentity(request);
    const resolvedEmail = identity?.email || normalizeEmail(inputEmail);

    if (!resolvedEmail || !resolvedEmail.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required to create a purchase order.' },
        { status: 400 }
      );
    }

    // 3. Razorpay API Call (or local mock if keys not yet set)
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    let externalRzpOrderId: string | undefined;

    if (keyId && keySecret && !keyId.startsWith('mock_')) {
      try {
        const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${basicAuth}`,
          },
          body: JSON.stringify({
            amount: productDef.amountPaise,
            currency: 'INR',
            receipt: 'rcpt_' + Date.now().toString(36),
            notes: {
              email: resolvedEmail,
              productId: productDef.id,
            },
          }),
        });

        if (rzpRes.ok) {
          const rzpData = await rzpRes.json();
          externalRzpOrderId = rzpData.id;
        } else {
          console.warn('[Razorpay API Warning] Direct order creation failed, falling back to local order ID:', await rzpRes.text());
        }
      } catch (err) {
        console.warn('[Razorpay API Error] Network request failed:', err);
      }
    }

    // 4. Create authoritative order in STRUCT database
    const { order, product } = await createPaymentOrder({
      productId: productDef.id,
      email: resolvedEmail,
      userId: identity?.userId || null,
      customRazorpayOrderId: externalRzpOrderId,
    });

    return NextResponse.json({
      success: true,
      orderId: order.razorpay_order_id,
      internalOrderId: order.id,
      amount: order.amount, // in paise (4900)
      currency: order.currency,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        unitsGranted: product.unitsGranted,
      },
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
      email: resolvedEmail,
    });
  } catch (error: any) {
    console.error('Payment order creation error:', error);
    if (error.message?.startsWith('INVALID_PRODUCT_ID') || error.message?.startsWith('UNAVAILABLE_PRODUCT')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to initiate purchase order.' },
      { status: 500 }
    );
  }
}
