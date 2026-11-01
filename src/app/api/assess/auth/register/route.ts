import { NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/assess/db';
import { createSession, COOKIE_NAME, LEGACY_COOKIE_NAME } from '@/lib/assess/auth';
import crypto from 'node:crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, confirmPassword, college, department } = body;

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Please enter your full name (at least 2 characters).' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match. Please re-enter.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanCollege = typeof college === 'string' ? college.trim() : '';
    const cleanDepartment = typeof department === 'string' && department.trim() ? department.trim() : 'General';
    const now = Date.now();
    const db = getDb();

    // 2. Uniqueness check
    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [normalizedEmail]
    );

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      );
    }

    // 3. Password hashing
    const { hash, salt } = hashPassword(password);
    const userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    // 4. Insert into database
    await db.execute(
      `INSERT INTO users (id, email, password_hash, salt, role, name, department, college, status, must_change_password, created_at)
       VALUES ($1, $2, $3, $4, 'candidate', $5, $6, $7, 'active', 0, $8)`,
      [userId, normalizedEmail, hash, salt, cleanName, cleanDepartment, cleanCollege, now]
    );

    // 5. Provision 1 starter practice assessment entitlement
    try {
      await db.execute(
        `INSERT INTO user_entitlements (user_id, feature_key, total_granted, used_count, remaining_balance, updated_at)
         VALUES ($1, 'mock_assessment_attempt', 1, 0, 1, $2)
         ON CONFLICT (user_id, feature_key) DO NOTHING`,
        [userId, now]
      );
    } catch (e) {
      console.warn('[Registration Entitlement Warning]', e);
    }

    // 6. Create session
    const { token, expiresAt } = await createSession(userId);

    // 7. Prepare response with session cookies
    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        name: cleanName,
        role: 'candidate',
        college: cleanCollege,
        department: cleanDepartment,
      },
      redirectUrl: '/portal',
    });

    const isProd = process.env.NODE_ENV === 'production';
    const maxAgeSec = Math.floor((expiresAt - now) / 1000);

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeSec,
    });

    response.cookies.set({
      name: LEGACY_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeSec,
    });

    return response;
  } catch (error: any) {
    console.error('[Registration Error]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration. Please try again.' },
      { status: 500 }
    );
  }
}
