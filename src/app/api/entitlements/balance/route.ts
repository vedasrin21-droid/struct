import { NextResponse } from 'next/server';
import { resolveEntitlementIdentity } from '@/lib/payments/guestAuth';
import { getEntitlementBalance } from '@/lib/payments/service';

export async function GET(request: Request) {
  try {
    const identity = await resolveEntitlementIdentity(request);

    if (!identity) {
      return NextResponse.json({
        hasAccess: false,
        remainingUsages: 0,
        email: null,
        isAuthenticated: false,
        isGuest: false,
      });
    }

    const balance = await getEntitlementBalance(identity.email, 'resume_ai_usage');

    return NextResponse.json({
      hasAccess: balance.remainingBalance > 0,
      remainingUsages: balance.remainingBalance,
      totalGranted: balance.totalGranted,
      totalConsumed: balance.totalConsumed,
      email: identity.email,
      isAuthenticated: !identity.isGuest,
      isGuest: identity.isGuest,
    });
  } catch (error: any) {
    console.error('Entitlement balance error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve entitlement balance' },
      { status: 500 }
    );
  }
}
