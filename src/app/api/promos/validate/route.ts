import { NextRequest, NextResponse } from 'next/server';
import { validatePromoCode } from '@/lib/payments/promos';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, amountPaise, planId, organizationId } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Promo code is required.' },
        { status: 400 }
      );
    }

    const result = await validatePromoCode({
      code,
      amountPaise: Number(amountPaise) || 0,
      planId,
      organizationId,
    });

    return NextResponse.json({
      success: result.isValid,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to validate promo code' },
      { status: 500 }
    );
  }
}
