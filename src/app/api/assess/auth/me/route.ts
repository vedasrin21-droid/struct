import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/assess/auth';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Auth check error' }, { status: 500 });
  }
}
