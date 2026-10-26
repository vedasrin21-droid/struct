import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireCandidate } from '@/lib/assess/auth';
import crypto from 'node:crypto';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const candidate = await requireCandidate(request);
    const { id: examId } = await context.params;
    const body = await request.json();
    const { questionId, selectedOptionIndex, isMarkedForReview, version } = body;

    if (!questionId) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    const db = getDb();
    const attempt = db.prepare('SELECT * FROM attempts WHERE exam_id = ? AND candidate_id = ?').get(examId, candidate.id) as any;
    if (!attempt) {
      return NextResponse.json({ error: 'No active attempt found' }, { status: 404 });
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: `Cannot save answers. Attempt is already ${attempt.status}.` }, { status: 403 });
    }

    const now = Date.now();
    // Allow small 10-second grace period for in-flight autosave packets right at deadline
    if (now > attempt.deadline_time + 10000) {
      db.prepare("UPDATE attempts SET status = 'expired' WHERE id = ?").run(attempt.id);
      return NextResponse.json({ error: 'Examination duration has expired' }, { status: 403 });
    }

    // Verify question belongs to this exam
    const belongs = db.prepare('SELECT id FROM exam_questions WHERE exam_id = ? AND question_id = ?').get(examId, questionId);
    if (!belongs) {
      return NextResponse.json({ error: 'Question does not belong to this exam' }, { status: 400 });
    }

    // Check version concurrency to prevent stale overwrites
    const existingAnswer = db.prepare('SELECT version FROM attempt_answers WHERE attempt_id = ? AND question_id = ?').get(attempt.id, questionId) as any;
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

    db.prepare(`
      INSERT INTO attempt_answers (id, attempt_id, question_id, selected_option_index, is_marked_for_review, saved_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(attempt_id, question_id) DO UPDATE SET
        selected_option_index = excluded.selected_option_index,
        is_marked_for_review = excluded.is_marked_for_review,
        saved_at = excluded.saved_at,
        version = excluded.version
    `).run(answerId, attempt.id, questionId, selectedIdx, marked, now, incomingVersion);

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
