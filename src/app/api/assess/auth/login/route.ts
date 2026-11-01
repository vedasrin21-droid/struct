import { NextResponse } from 'next/server';
import { getDb, verifyPassword } from '@/lib/assess/db';
import { createSession, COOKIE_NAME, LEGACY_COOKIE_NAME } from '@/lib/assess/auth';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Valid email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const now = Date.now();
    const db = getDb();

    // Check rate limiting / lockout from durable database
    const attemptRecord = await db.queryOne<{ attempts: number; locked_until: number | bigint }>(
      'SELECT attempts, locked_until FROM login_attempts WHERE LOWER(email) = LOWER($1)',
      [normalizedEmail]
    );

    const lockedUntil = attemptRecord ? Number(attemptRecord.locked_until) : 0;
    if (lockedUntil > now) {
      const waitMinutes = Math.ceil((lockedUntil - now) / 60000);
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Account temporarily throttled. Please try again in ${waitMinutes} minute(s).`,
          isLocked: true,
          lockedUntil,
        },
        { status: 429 }
      );
    }

    const userRow = await db.queryOne<any>(
      `SELECT id, email, password_hash, salt, role, name, department, college, status, must_change_password, created_at
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [normalizedEmail]
    );

    if (!userRow) {
      // Record failed attempt in database
      const curr = (lockedUntil > 0 && lockedUntil <= now) ? 0 : Number(attemptRecord?.attempts || 0);
      const nextAttempts = curr + 1;
      const nextLockedUntil = nextAttempts >= MAX_ATTEMPTS ? now + LOCKOUT_DURATION_MS : 0;

      await db.execute(
        `INSERT INTO login_attempts (email, attempts, locked_until, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET
           attempts = EXCLUDED.attempts,
           locked_until = EXCLUDED.locked_until,
           updated_at = EXCLUDED.updated_at`,
        [normalizedEmail, nextAttempts, nextLockedUntil, now]
      );

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (userRow.status !== 'active') {
      return NextResponse.json(
        { error: 'Account has been deactivated. Please contact your administrator.' },
        { status: 403 }
      );
    }

    const isValid = verifyPassword(password, userRow.password_hash, userRow.salt);
    if (!isValid) {
      // Record failed attempt in database
      const curr = (lockedUntil > 0 && lockedUntil <= now) ? 0 : Number(attemptRecord?.attempts || 0);
      const nextAttempts = curr + 1;
      const nextLockedUntil = nextAttempts >= MAX_ATTEMPTS ? now + LOCKOUT_DURATION_MS : 0;

      await db.execute(
        `INSERT INTO login_attempts (email, attempts, locked_until, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET
           attempts = EXCLUDED.attempts,
           locked_until = EXCLUDED.locked_until,
           updated_at = EXCLUDED.updated_at`,
        [normalizedEmail, nextAttempts, nextLockedUntil, now]
      );

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Login successful: reset failed attempt counter in database
    await db.execute('DELETE FROM login_attempts WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);

    // Create session
    const { token, expiresAt } = await createSession(userRow.id);

    const userProfile = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role,
      name: userRow.name,
      department: userRow.department,
      college: userRow.college,
      must_change_password: Number(userRow.must_change_password || 0),
    };

    const response = NextResponse.json({
      success: true,
      token,
      expiresAt,
      user: userProfile,
    });

    // Set secure HTTP-only canonical cookie: struct_exam_token
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
    });

    // Set legacy cookie for backward compatibility with active test runners
    response.cookies.set({
      name: LEGACY_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('[Login Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}
