import { NextResponse } from 'next/server';
import { getDb, verifyPassword } from '@/lib/assess/db';
import { createSession, COOKIE_NAME } from '@/lib/assess/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Valid email and password are required' }, { status: 400 });
    }

    const db = getDb();
    const userRow = db.prepare(`
      SELECT id, email, password_hash, salt, role, name, department, college, status, must_change_password, created_at
      FROM users
      WHERE email = ? COLLATE NOCASE
    `).get(email.trim()) as any;

    if (!userRow) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (userRow.status !== 'active') {
      return NextResponse.json({ error: 'Account has been deactivated. Please contact your administrator.' }, { status: 403 });
    }

    const isValid = verifyPassword(password, userRow.password_hash, userRow.salt);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Create session
    const { token, expiresAt } = createSession(userRow.id);

    const userProfile = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role,
      name: userRow.name,
      department: userRow.department,
      college: userRow.college,
      must_change_password: userRow.must_change_password,
    };

    const response = NextResponse.json({
      success: true,
      token,
      expiresAt,
      user: userProfile,
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
    });

    return response;
  } catch (error: any) {
    console.error('Assess login error:', error);
    return NextResponse.json({ error: 'Internal server authentication error' }, { status: 500 });
  }
}
