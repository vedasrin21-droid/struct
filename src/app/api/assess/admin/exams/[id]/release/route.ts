import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';
import crypto from 'node:crypto';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const db = getDb();

    const exam = await db.queryOne<any>('SELECT id, title, results_released FROM exams WHERE id = $1', [id]);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const newReleaseState = body.release !== undefined ? (body.release ? 1 : 0) : (exam.results_released ? 0 : 1);

    await db.execute('UPDATE exams SET results_released = $1, updated_at = $2 WHERE id = $3', [
      newReleaseState,
      Date.now(),
      id
    ]);

    await db.execute(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
      VALUES ($1, $2, 'toggle_results_release', 'exam', $3, $4, $5)
    `, [
      'aud_' + crypto.randomUUID().slice(0, 8),
      admin.id,
      id,
      `Results released set to ${newReleaseState ? 'RELEASED' : 'WITHHELD'} for ${exam.title}`,
      Date.now()
    ]);

    return NextResponse.json({
      success: true,
      resultsReleased: newReleaseState === 1,
      message: newReleaseState === 1
        ? 'Results and detailed explanations have been released to candidates.'
        : 'Results are now withheld from candidates until you choose to publish them.',
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to toggle results release' }, { status: 500 });
  }
}
