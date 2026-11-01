import { NextResponse } from 'next/server';
import { getDb, hashPassword, verifyPassword } from '@/lib/assess/db';
import { requireAuth } from '@/lib/assess/auth';

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current temporary password' },
        { status: 400 }
      );
    }

    const db = getDb();
    const userRow = await db.queryOne<{ id: string; password_hash: string; salt: string }>(
      'SELECT id, password_hash, salt FROM users WHERE id = $1',
      [user.id]
    );

    if (!userRow) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const isValid = verifyPassword(currentPassword, userRow.password_hash, userRow.salt);
    if (!isValid) {
      return NextResponse.json({ error: 'Current password verification failed' }, { status: 401 });
    }

    const { hash, salt } = hashPassword(newPassword);

    await db.execute(
      `UPDATE users
       SET password_hash = $1, salt = $2, must_change_password = 0
       WHERE id = $3`,
      [hash, salt, user.id]
    );

    await db.execute(
      `INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
       VALUES ($1, $2, 'change_password', 'user', $3, 'Rotated candidate password', $4)`,
      ['aud_' + Math.random().toString(36).substring(2, 10), user.id, user.id, Date.now()]
    );

    return NextResponse.json({
      success: true,
      message: 'Password successfully changed. You may now proceed with your assessment.',
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Password update failed' }, { status: 500 });
  }
}
