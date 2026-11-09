import { NextResponse } from 'next/server';
import { getDb, verifyPassword } from '@/lib/assess/db';
import { createSession, COOKIE_NAME, LEGACY_COOKIE_NAME } from '@/lib/assess/auth';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emailOrId, password } = body;

    if (!emailOrId || !password || typeof emailOrId !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Please enter your Registration ID or Registered Email and password.' },
        { status: 400 }
      );
    }

    const cleanIdentifier = emailOrId.trim();
    const normalizedEmail = cleanIdentifier.toLowerCase();
    const now = Date.now();
    const db = getDb();

    // 1. Rate limiting & Lockout check
    const attemptRecord = await db.queryOne<{ attempts: number; locked_until: number | bigint }>(
      'SELECT attempts, locked_until FROM login_attempts WHERE LOWER(email) = LOWER($1)',
      [normalizedEmail]
    );

    const lockedUntil = attemptRecord ? Number(attemptRecord.locked_until) : 0;
    if (lockedUntil > now) {
      const waitMinutes = Math.ceil((lockedUntil - now) / 60000);
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Access temporarily locked. Please try again in ${waitMinutes} minute(s).`,
          isLocked: true,
          lockedUntil,
        },
        { status: 429 }
      );
    }

    // 2. Query user by email OR registration ID OR roll number OR phone
    const userRow = await db.queryOne<any>(
      `SELECT id, email, password_hash, salt, role, name, department, college, status, must_change_password
       FROM users
       WHERE LOWER(email) = LOWER($1)
          OR id = $2
          OR LOWER(email) LIKE LOWER($1 || '@%')
          OR (phone IS NOT NULL AND phone != '' AND REPLACE(REPLACE(phone, ' ', ''), '-', '') = REPLACE(REPLACE($2, ' ', ''), '-', ''))`,
      [normalizedEmail, cleanIdentifier]
    );

    if (!userRow) {
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

      return NextResponse.json(
        { error: 'Invalid Registration ID/Email or password. Please verify your credentials.' },
        { status: 401 }
      );
    }

    if (userRow.status !== 'active') {
      return NextResponse.json(
        { error: 'Your student account is currently deactivated. Please contact the ECELL examination proctors.' },
        { status: 403 }
      );
    }

    // 3. Verify password
    const isValid = verifyPassword(password, userRow.password_hash, userRow.salt);
    if (!isValid) {
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

      return NextResponse.json(
        { error: 'Invalid Registration ID/Email or password. Please verify your credentials.' },
        { status: 401 }
      );
    }

    // Reset failed counter
    await db.execute('DELETE FROM login_attempts WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);

    // 4. Create Session
    const { token, expiresAt } = await createSession(userRow.id);

    const userProfile = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role,
      name: userRow.name,
      department: userRow.department || '',
      college: userRow.college || '',
    };

    const isSecure = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: Math.floor((expiresAt - now) / 1000),
    };

    const response = NextResponse.json({
      success: true,
      user: userProfile,
      redirectUrl: userRow.role === 'admin' || userRow.role === 'super_admin' ? '/admin/ecell' : '/ecell/dashboard',
    });

    response.cookies.set(COOKIE_NAME, token, cookieOptions);
    response.cookies.set(LEGACY_COOKIE_NAME, token, cookieOptions);

    return response;
  } catch (error: any) {
    console.error('[ECELL Login Error]', error);
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 });
  }
}
