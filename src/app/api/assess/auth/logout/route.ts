import { NextResponse } from 'next/server';
import { deleteSession, COOKIE_NAME } from '@/lib/assess/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    let token: string | undefined;
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    }

    if (token) {
      await deleteSession(token);
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.set({
      name: COOKIE_NAME,
      value: '',
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}
