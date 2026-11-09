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

    const db = getDb();
    const now = Date.now();

    // Verify attempt
    const attempt = await db.queryOne<{
      id: string;
      exam_id: string;
      candidate_id: string;
      status: string;
      score: number | null;
      deadline_time: number | bigint;
    }>('SELECT id, exam_id, candidate_id, status, score, deadline_time FROM attempts WHERE id = $1', [attemptId]);

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (attempt.candidate_id !== user.id && user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized to submit this attempt' }, { status: 403 });
    }

    if (attempt.status === 'submitted') {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        redirectUrl: '/ecell/completed',
        message: 'Examination was already submitted.',
      });
    }

    // Calculate score
    // 1. Fetch all attempt questions with their correct answers
    const questionsResult = await db.query<{
      question_id: string;
      correct_option_index: number;
      marks: number;
      negative_marks: number;
    }>(
      `SELECT aq.question_id, q.correct_option_index, q.marks, q.negative_marks
       FROM attempt_questions aq
       JOIN questions q ON aq.question_id = q.id
       WHERE aq.attempt_id = $1`,
      [attemptId]
    );

    // 2. Fetch candidate answers
    const answersResult = await db.query<{
      question_id: string;
      selected_option_index: number | null;
    }>(
      `SELECT question_id, selected_option_index FROM attempt_answers WHERE attempt_id = $1`,
      [attemptId]
    );

    const answerMap = new Map<string, number | null>();
    for (const ans of answersResult.rows) {
      answerMap.set(ans.question_id, ans.selected_option_index !== null ? Number(ans.selected_option_index) : null);
    }

    let calculatedScore = 0.0;
    let maxScore = 0.0;

    for (const q of questionsResult.rows) {
      const qMarks = Number(q.marks || 1.0);
      maxScore += qMarks;

      const selectedOpt = answerMap.get(q.question_id);
      if (selectedOpt !== undefined && selectedOpt !== null) {
        if (selectedOpt === Number(q.correct_option_index)) {
          calculatedScore += qMarks;
        }
      }
    }

    const passStatus = calculatedScore >= 10.0 ? 'passed' : 'failed';

    // Atomically update attempt status to submitted
    await db.execute(
      `UPDATE attempts
       SET status = 'submitted',
           submitted_at = $1,
           score = $2,
           max_score = $3,
           pass_status = $4
       WHERE id = $5`,
      [now, calculatedScore, maxScore, passStatus, attemptId]
    );

    // Update assignment status
    await db.execute(
      `UPDATE exam_assignments
       SET status = 'submitted'
       WHERE exam_id = $1 AND candidate_id = $2`,
      [attempt.exam_id, attempt.candidate_id]
    );

    return NextResponse.json({
      success: true,
      redirectUrl: '/ecell/completed',
      submittedAt: now,
      totalQuestions: questionsResult.rowCount,
      message: 'Examination submitted successfully.',
    });
  } catch (error: any) {
    console.error('[ECELL Submit Route Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to submit examination' }, { status: 500 });
  }
}
