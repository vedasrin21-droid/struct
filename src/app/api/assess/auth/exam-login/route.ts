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
        { error: 'Examination Participant ID / Email and password are required.' },
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
          error: `Too many failed attempts. Access throttled. Please try again in ${waitMinutes} minute(s).`,
          isLocked: true,
          lockedUntil,
        },
        { status: 429 }
      );
    }

    // 2. Lookup user by email OR user id
    const userRow = await db.queryOne<any>(
      `SELECT id, email, password_hash, salt, role, name, department, college, status, must_change_password
       FROM users
       WHERE LOWER(email) = LOWER($1) OR id = $2`,
      [normalizedEmail, cleanIdentifier]
    );

    if (!userRow) {
      // Record failed attempt
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

      return NextResponse.json({ error: 'Invalid examination participant credentials.' }, { status: 401 });
    }

    if (userRow.status !== 'active') {
      return NextResponse.json(
        { error: 'Examination participant account is inactive. Please contact your examination proctor.' },
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

      return NextResponse.json({ error: 'Invalid examination participant credentials.' }, { status: 401 });
    }

    // Clear failed attempts upon success
    await db.execute('DELETE FROM login_attempts WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);

    // 4. Create Session
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

    // 5. Check if user is admin / super_admin
    if (userRow.role === 'admin' || userRow.role === 'super_admin') {
      const response = NextResponse.json({
        success: true,
        user: userProfile,
        redirectUrl: '/assess/admin',
        role: userRow.role,
      });

      setSessionCookies(response, token);
      return response;
    }

    // 6. Section 8: Determine Assigned Examination Flow
    // Look up assigned institutional examination
    const assignment = await db.queryOne<{ exam_id: string; title: string; exam_status: string }>(
      `SELECT ea.exam_id, e.title, e.status as exam_status
       FROM exam_assignments ea
       JOIN exams e ON ea.exam_id = e.id
       WHERE ea.candidate_id = $1
       ORDER BY ea.assigned_at DESC
       LIMIT 1`,
      [userRow.id]
    );

    let redirectUrl = '';
    let examInfo = null;

    if (!assignment) {
      // Check if user has an active attempt in any published exam
      const latestAttempt = await db.queryOne<{ exam_id: string; status: string }>(
        `SELECT a.exam_id, a.status
         FROM attempts a
         WHERE a.candidate_id = $1
         ORDER BY a.created_at DESC
         LIMIT 1`,
        [userRow.id]
      );

      if (latestAttempt) {
        if (latestAttempt.status === 'submitted') {
          redirectUrl = `/assess/completed/${latestAttempt.exam_id}`;
        } else {
          redirectUrl = `/assess/exam/${latestAttempt.exam_id}`;
        }
      } else {
        // No examination assigned
        const response = NextResponse.json({
          success: true,
          user: userProfile,
          hasAssignedExam: false,
          error: 'No examination has been assigned to your account. Please contact your organization proctor or coordinator.',
          redirectUrl: null,
        }, { status: 200 });

        setSessionCookies(response, token);
        return response;
      }
    } else {
      examInfo = {
        id: assignment.exam_id,
        title: assignment.title,
      };

      // Check existing attempt
      const attempt = await db.queryOne<{ id: string; status: string; deadline_time: number | bigint }>(
        `SELECT id, status, deadline_time FROM attempts WHERE candidate_id = $1 AND exam_id = $2`,
        [userRow.id, assignment.exam_id]
      );

      if (!attempt) {
        // Examination has not started -> Instructions page
        redirectUrl = `/assess/instructions/${assignment.exam_id}`;
      } else if (attempt.status === 'submitted') {
        // Already completed
        redirectUrl = `/assess/completed/${assignment.exam_id}`;
      } else if (attempt.status === 'in_progress') {
        // Active in-progress attempt -> Resume live examination
        redirectUrl = `/assess/exam/${assignment.exam_id}`;
      } else {
        redirectUrl = `/assess/instructions/${assignment.exam_id}`;
      }
    }

    const response = NextResponse.json({
      success: true,
      user: userProfile,
      hasAssignedExam: true,
      exam: examInfo,
      redirectUrl,
    });

    setSessionCookies(response, token);
    return response;
  } catch (error: any) {
    console.error('[Exam Login Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Authentication failed. Please verify credentials.' },
      { status: 500 }
    );
  }
}

function setSessionCookies(response: NextResponse, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  const maxAge = 24 * 60 * 60; // 24 hours

  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  response.cookies.set({
    name: LEGACY_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}
