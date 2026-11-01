import { NextRequest, NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';
import crypto from 'node:crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id: candidateId } = await params;

    const db = getDb();
    const candidate = await db.queryOne<{ id: string; email: string; role: string; name: string }>(
      "SELECT id, email, role, name FROM users WHERE id = $1 AND role = 'candidate'",
      [candidateId]
    );

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Generate new random temporary password
    const randomPin = crypto.randomBytes(4).toString('hex').toUpperCase();
    const tempPassword = `St#${randomPin}`;
    const { hash, salt } = hashPassword(tempPassword);
    const now = Date.now();

    await db.execute(
      `UPDATE users
       SET password_hash = $1, salt = $2, must_change_password = 1
       WHERE id = $3`,
      [hash, salt, candidateId]
    );

    // Invalidate existing sessions for this candidate
    await db.execute('DELETE FROM sessions WHERE user_id = $1', [candidateId]);

    // Audit log
    await db.execute(
      `INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
       VALUES ($1, $2, 'admin_reset_password', 'user', $3, $4, $5)`,
      [
        'aud_' + Math.random().toString(36).substring(2, 10),
        admin.id,
        candidateId,
        `Admin reset password for candidate ${candidate.email}`,
        now,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Candidate password successfully reset',
      candidateId,
      email: candidate.email,
      tempPassword,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Password reset failed' }, { status: 500 });
  }
}
