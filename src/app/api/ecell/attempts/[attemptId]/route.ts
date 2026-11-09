import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/assess/auth';
import { getDb } from '@/lib/assess/db';

export async function GET(
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

    // Fetch attempt details
    const attempt = await db.queryOne<{
      id: string;
      exam_id: string;
      candidate_id: string;
      start_time: number | bigint;
      deadline_time: number | bigint;
      status: string;
      department: string;
      submitted_at: number | bigint | null;
      score: number | null;
    }>('SELECT id, exam_id, candidate_id, start_time, deadline_time, status, department, submitted_at, score FROM attempts WHERE id = $1', [
      attemptId,
    ]);

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Ownership check (only the candidate or an admin can access this attempt)
    if (attempt.candidate_id !== user.id && user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized access to this attempt' }, { status: 403 });
    }

    const deadline = Number(attempt.deadline_time);
    const remainingSeconds = Math.max(0, Math.floor((deadline - now) / 1000));

    // Handle time expiration auto-submit
    let isSubmitted = attempt.status === 'submitted';
    if (!isSubmitted && remainingSeconds <= 0) {
      await db.execute(
        `UPDATE attempts SET status = 'submitted', submitted_at = $1 WHERE id = $2 AND status = 'in_progress'`,
        [now, attemptId]
      );
      await db.execute(
        `UPDATE exam_assignments SET status = 'submitted' WHERE exam_id = $1 AND candidate_id = $2`,
        [attempt.exam_id, attempt.candidate_id]
      );
      isSubmitted = true;
    }

    // Fetch questions mapped to this attempt in order
    // NEVER RETURN correct_option_index or explanation to candidate
    const questionsResult = await db.query<{
      question_id: string;
      order_index: number;
      is_mandatory: number;
      text: string;
      options_json: string;
      category: string;
      question_type: string;
    }>(
      `SELECT aq.question_id, aq.order_index, aq.is_mandatory,
              q.text, q.options_json, q.category, q.question_type
       FROM attempt_questions aq
       JOIN questions q ON aq.question_id = q.id
       WHERE aq.attempt_id = $1
       ORDER BY aq.order_index ASC`,
      [attemptId]
    );

    const questions = questionsResult.rows.map((row) => {
      let options: string[] = [];
      try {
        options = JSON.parse(row.options_json);
      } catch {
        options = ['Option A', 'Option B', 'Option C', 'Option D'];
      }
      return {
        id: row.question_id,
        orderIndex: row.order_index,
        isMandatory: Boolean(row.is_mandatory),
        text: row.text,
        options,
        category: row.category,
        questionType: row.question_type,
      };
    });

    // Fetch saved candidate answers
    const answersResult = await db.query<{
      question_id: string;
      selected_option_index: number | null;
      is_marked_for_review: number;
      version: number;
    }>(
      `SELECT question_id, selected_option_index, is_marked_for_review, version
       FROM attempt_answers
       WHERE attempt_id = $1`,
      [attemptId]
    );

    const savedAnswers: Record<string, { selectedOptionIndex: number | null; isMarkedForReview: boolean; version: number }> = {};
    for (const ans of answersResult.rows) {
      savedAnswers[ans.question_id] = {
        selectedOptionIndex: ans.selected_option_index !== null ? Number(ans.selected_option_index) : null,
        isMarkedForReview: Boolean(ans.is_marked_for_review),
        version: Number(ans.version || 1),
      };
    }

    return NextResponse.json({
      success: true,
      attemptId,
      department: attempt.department,
      status: isSubmitted ? 'submitted' : 'in_progress',
      isSubmitted,
      remainingSeconds: isSubmitted ? 0 : remainingSeconds,
      startTime: Number(attempt.start_time),
      deadlineTime: deadline,
      submittedAt: attempt.submitted_at ? Number(attempt.submitted_at) : null,
      questions,
      savedAnswers,
      student: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error('[ECELL Attempt GET Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch examination attempt' }, { status: 500 });
  }
}
