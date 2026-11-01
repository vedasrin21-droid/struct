import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireCandidate } from '@/lib/assess/auth';
import crypto from 'node:crypto';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const candidate = await requireCandidate(request);
    const { id: examId } = await context.params;
    const body = await request.json();
    const rawOption = body.selectedOptionIndex !== undefined ? body.selectedOptionIndex : body.selectedOption;
    const { questionId, isMarkedForReview, version } = body;
    const selectedOptionIndex = rawOption;

    if (!questionId) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    const db = getDb();
    const attempt = await db.queryOne<any>(
      'SELECT * FROM attempts WHERE exam_id = $1 AND candidate_id = $2',
      [examId, candidate.id]
    );
    if (!attempt) {
      return NextResponse.json({ error: 'No active attempt found' }, { status: 404 });
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: `Cannot save answers. Attempt is already ${attempt.status}.` }, { status: 403 });
    }

    const now = Date.now();
    const deadlineTime = Number(attempt.deadline_time);
    // Allow small 10-second grace period for in-flight autosave packets right at deadline
    if (now > deadlineTime + 10000) {
      await db.execute("UPDATE attempts SET status = 'expired' WHERE id = $1", [attempt.id]);
      return NextResponse.json({ error: 'Examination duration has expired' }, { status: 403 });
    }

    // Verify question belongs to this exam
    const belongs = await db.queryOne(
      'SELECT id FROM exam_questions WHERE exam_id = $1 AND question_id = $2',
      [examId, questionId]
    );
    if (!belongs) {
      return NextResponse.json({ error: 'Question does not belong to this exam' }, { status: 400 });
    }

    // Check version concurrency to prevent stale overwrites
    const existingAnswer = await db.queryOne<any>(
      'SELECT version FROM attempt_answers WHERE attempt_id = $1 AND question_id = $2',
      [attempt.id, questionId]
    );
    const incomingVersion = typeof version === 'number' ? version : (existingAnswer ? existingAnswer.version + 1 : 1);

    if (existingAnswer && existingAnswer.version > incomingVersion) {
      // Stale network packet arriving late
      return NextResponse.json({
        success: false,
        stale: true,
        message: 'Older answer packet ignored due to newer response already recorded',
      });
    }

    const selectedIdx = (selectedOptionIndex !== null && selectedOptionIndex !== undefined && selectedOptionIndex >= 0 && selectedOptionIndex <= 3)
      ? Number(selectedOptionIndex)
      : null;

    const marked = Boolean(isMarkedForReview) ? 1 : 0;
    const answerId = 'ans_' + crypto.randomUUID().slice(0, 8);

    await db.execute(`
      INSERT INTO attempt_answers (id, attempt_id, question_id, selected_option_index, is_marked_for_review, saved_at, version)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT(attempt_id, question_id) DO UPDATE SET
        selected_option_index = EXCLUDED.selected_option_index,
        is_marked_for_review = EXCLUDED.is_marked_for_review,
        saved_at = EXCLUDED.saved_at,
        version = EXCLUDED.version
    `, [answerId, attempt.id, questionId, selectedIdx, marked, now, incomingVersion]);

    return NextResponse.json({
      success: true,
      savedAt: now,
      version: incomingVersion,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_CANDIDATE_REQUIRED') {
      return NextResponse.json({ error: 'Candidate login required' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to save answer' }, { status: 500 });
  }
}
