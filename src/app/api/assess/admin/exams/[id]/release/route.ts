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

    const exam = db.prepare('SELECT id, title, results_released FROM exams WHERE id = ?').get(id) as any;
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const newReleaseState = body.release !== undefined ? (body.release ? 1 : 0) : (exam.results_released ? 0 : 1);

    db.prepare('UPDATE exams SET results_released = ?, updated_at = ? WHERE id = ?').run(
      newReleaseState,
      Date.now(),
      id
    );

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, 'toggle_results_release', 'exam', ?, ?, ?)
    `).run(
      'aud_' + crypto.randomUUID().slice(0, 8),
      admin.id,
      id,
      `Results released set to ${newReleaseState ? 'RELEASED' : 'WITHHELD'} for ${exam.title}`,
      Date.now()
    );

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
