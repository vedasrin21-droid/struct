import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/assess/auth';
import { getDb } from '@/lib/assess/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { questionId, selectedOptionIndex, isMarkedForReview, clientVersion } = body;

    if (!questionId || typeof questionId !== 'string') {
      return NextResponse.json({ error: 'Valid questionId is required' }, { status: 400 });
    }

    const db = getDb();
    const now = Date.now();

    // Verify attempt ownership and active status
    const attempt = await db.queryOne<{
      id: string;
      candidate_id: string;
      status: string;
      deadline_time: number | bigint;
    }>('SELECT id, candidate_id, status, deadline_time FROM attempts WHERE id = $1', [attemptId]);

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (attempt.candidate_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Cannot record answers: examination has already been submitted.', isSubmitted: true },
        { status: 400 }
      );
    }

    // Check time limit
    if (now > Number(attempt.deadline_time)) {
      await db.execute(
        `UPDATE attempts SET status = 'submitted', submitted_at = $1 WHERE id = $2 AND status = 'in_progress'`,
        [now, attemptId]
      );
      return NextResponse.json(
        { error: 'Examination time has expired. Submission locked.', isSubmitted: true },
        { status: 400 }
      );
    }

    const optIndex = selectedOptionIndex === null || selectedOptionIndex === undefined ? null : Number(selectedOptionIndex);
    const marked = isMarkedForReview ? 1 : 0;
    const version = Number(clientVersion || 1);
    const answerId = 'ans_' + crypto.randomUUID().replace(/-/g, '').substring(0, 24);

    // Upsert answer in attempt_answers
    await db.execute(
      `INSERT INTO attempt_answers (
        id, attempt_id, question_id, selected_option_index, is_marked_for_review, saved_at, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (attempt_id, question_id) DO UPDATE SET
        selected_option_index = EXCLUDED.selected_option_index,
        is_marked_for_review = EXCLUDED.is_marked_for_review,
        saved_at = EXCLUDED.saved_at,
        version = attempt_answers.version + 1`,
      [
        answerId,
        attemptId,
        questionId,
        optIndex,
        marked,
        now,
        version,
      ]
    );

    return NextResponse.json({
      success: true,
      questionId,
      selectedOptionIndex: optIndex,
      isMarkedForReview: Boolean(marked),
      savedAt: now,
    });
  } catch (error: any) {
    console.error('[ECELL Answer Save Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to save answer' }, { status: 500 });
  }
}
