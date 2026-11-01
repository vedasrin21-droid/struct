import { NextResponse } from 'next/server';
import { requireCandidate } from '@/lib/assess/auth';
import { claimGuestEntitlements } from '@/lib/payments/guestAuth';

export async function POST(request: Request) {
  try {
    const user = await requireCandidate(request);

    // Extract guest token from body, header, or cookie
    const body = await request.json().catch(() => ({}));
    const headerToken = request.headers.get('x-guest-token') || '';
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parseCookies(cookieHeader);
    const cookieToken = cookies['struct_guest_token'] || '';

    const guestToken = (body.guestToken || headerToken || cookieToken || '').trim();

    if (!guestToken) {
      return NextResponse.json(
        { error: 'A cryptographically signed guest token is required to claim purchases. Email alone is not proof of ownership.' },
        { status: 400 }
      );
    }

    const result = await claimGuestEntitlements({
      userId: user.id,
      userEmail: user.email,
      guestToken,
    });

    return NextResponse.json({
      success: true,
      claimedCount: result.claimedCount,
      alreadyClaimed: result.alreadyClaimed,
      message: result.claimedCount > 0
        ? `Successfully linked ${result.claimedCount} previous guest purchases to your account.`
        : result.alreadyClaimed
        ? 'These guest purchases were already linked to your account.'
        : 'Your account is up to date. No unclaimed guest purchases found.',
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_CANDIDATE_REQUIRED') {
      return NextResponse.json(
        { error: 'You must be logged in to claim previous guest purchases.' },
        { status: 401 }
      );
    }
    if (
      error.message?.includes('INVALID_GUEST_TOKEN') ||
      error.message?.includes('GUEST_TOKEN_REQUIRED') ||
      error.message?.includes('GUEST_TOKEN_EMAIL_MISMATCH') ||
      error.message?.includes('ALREADY_CLAIMED_BY_ANOTHER_ACCOUNT')
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to claim entitlements' },
      { status: 500 }
    );
  }
}

function parseCookies(cookieStr: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieStr) return out;
  cookieStr.split(';').forEach((pair) => {
    const [k, v] = pair.trim().split('=');
    if (k && v) out[k] = decodeURIComponent(v);
  });
  return out;
}
