import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/assess/auth';
import { getDb } from '@/lib/assess/db';

const ECELL_EXAM_ID = 'exam_ecell_round1_2026';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Administrative privileges required' }, { status: 403 });
    }

    const body = await request.json();
    const { status, customPostExamQuestion } = body;

    const db = getDb();
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status && (status === 'published' || status === 'closed' || status === 'draft')) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (customPostExamQuestion !== undefined) {
      updates.push(`custom_post_exam_question = $${paramIndex++}`);
      params.push(customPostExamQuestion);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No configuration updates provided' }, { status: 400 });
    }

    params.push(ECELL_EXAM_ID);
    await db.execute(
      `UPDATE exams SET ${updates.join(', ')}, updated_at = ${Date.now()} WHERE id = $${paramIndex}`,
      params
    );

    return NextResponse.json({
      success: true,
      message: 'Examination configuration updated successfully.',
    });
  } catch (error: any) {
    console.error('[Admin ECELL Exam Control Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to update exam controls' }, { status: 500 });
  }
}
