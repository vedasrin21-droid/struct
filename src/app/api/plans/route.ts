import { NextRequest, NextResponse } from 'next/server';
import { getActivePlans } from '@/lib/payments/subscriptions';

export async function GET(request: NextRequest) {
  try {
    const target = request.nextUrl.searchParams.get('target') as 'individual' | 'organization' | null;
    const plans = await getActivePlans(target || undefined);
    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
