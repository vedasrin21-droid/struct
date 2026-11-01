import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireCandidate } from '@/lib/assess/auth';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const candidate = await requireCandidate(request);
    const { id: examId } = await context.params;
    const db = getDb();

    // 1. Verify Exam
    const exam = await db.queryOne<any>('SELECT * FROM exams WHERE id = $1', [examId]);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // 2. Verify Attempt
    const attempt = await db.queryOne<any>(
      'SELECT * FROM attempts WHERE exam_id = $1 AND candidate_id = $2',
      [examId, candidate.id]
    );
    if (!attempt) {
      return NextResponse.json({ error: 'No attempt found for this exam' }, { status: 404 });
    }

    // IDEMPOTENCY CHECK: If already submitted, return the existing submission receipt
    if (attempt.status === 'submitted') {
      const submittedAtNum = Number(attempt.submitted_at);
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        attemptId: attempt.id,
        submittedAt: submittedAtNum,
        receiptCode: `TALVYN-${attempt.id.toUpperCase()}-${submittedAtNum.toString(36).toUpperCase()}`,
        message: 'Your examination was previously submitted and securely recorded.',
        resultsReleased: Boolean(exam.results_released),
        score: exam.results_released ? attempt.score : null,
        passStatus: exam.results_released ? attempt.pass_status : 'pending_release',
      });
    }

    const now = Date.now();

    // 3. Fetch questions and candidate answers (attempt-specific questions if available)
    const qResult = await db.query<any>(`
      SELECT q.id, q.marks, q.negative_marks, q.correct_option_index
      FROM attempt_questions aq
      JOIN questions q ON q.id = aq.question_id
      WHERE aq.attempt_id = $1
    `, [attempt.id]);

    let questions = qResult.rows;

    if (questions.length === 0) {
      const fallbackResult = await db.query<any>(`
        SELECT q.id, q.marks, q.negative_marks, q.correct_option_index
        FROM exam_questions eq
        JOIN questions q ON q.id = eq.question_id
        WHERE eq.exam_id = $1
      `, [examId]);
      questions = fallbackResult.rows;
    }

    const ansResult = await db.query<any>(`
      SELECT question_id, selected_option_index
      FROM attempt_answers
      WHERE attempt_id = $1
    `, [attempt.id]);

    const answers = ansResult.rows;
    const answerMap = new Map<string, number | null>();
    answers.forEach(a => {
      answerMap.set(a.question_id, a.selected_option_index !== null ? Number(a.selected_option_index) : null);
    });

    // 4. Server-Side Scoring with Negative Marking
    let computedScore = 0.0;
    let maxScore = 0.0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const negativeMarkingActive = Boolean(exam.negative_marking_enabled);

    for (const q of questions) {
      const qMarks = Number(q.marks || 1.0);
      const qNeg = Number(q.negative_marks || 0.25);
      maxScore += qMarks;

      const candidateSelection = answerMap.get(q.id);

      if (candidateSelection === undefined || candidateSelection === null) {
        unansweredCount++;
      } else if (candidateSelection === Number(q.correct_option_index)) {
        computedScore += qMarks;
        correctCount++;
      } else {
        if (negativeMarkingActive) {
          computedScore -= qNeg;
        }
        incorrectCount++;
      }
    }

    // Ensure score does not drop below 0 if desired, or keep exact
    const finalScore = Math.max(0, parseFloat(computedScore.toFixed(2)));
    const passStatus = finalScore >= Number(exam.pass_marks) ? 'passed' : 'failed';

    // 5. Atomic Update via Transaction
    await db.transaction(async (tx) => {
      await tx.execute(`
        UPDATE attempts
        SET 
          status = 'submitted',
          submitted_at = $1,
          score = $2,
          max_score = $3,
          pass_status = $4
        WHERE id = $5
      `, [now, finalScore, maxScore, passStatus, attempt.id]);

      await tx.execute(`
        UPDATE exam_assignments
        SET status = 'submitted'
        WHERE exam_id = $1 AND candidate_id = $2
      `, [examId, candidate.id]);
    });

    const receiptCode = `TALVYN-${attempt.id.toUpperCase()}-${now.toString(36).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      alreadySubmitted: false,
      attemptId: attempt.id,
      submittedAt: now,
      receiptCode,
      message: 'Examination submitted successfully.',
      summary: {
        totalQuestions: questions.length,
        answered: correctCount + incorrectCount,
        unanswered: unansweredCount,
      },
      resultsReleased: Boolean(exam.results_released),
      score: exam.results_released ? finalScore : null,
      passStatus: exam.results_released ? passStatus : 'pending_release',
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_CANDIDATE_REQUIRED') {
      return NextResponse.json({ error: 'Candidate login required' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to submit exam' }, { status: 500 });
  }
}
