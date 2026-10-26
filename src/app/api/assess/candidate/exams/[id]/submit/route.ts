import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireCandidate } from '@/lib/assess/auth';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const candidate = await requireCandidate(request);
    const { id: examId } = await context.params;
    const db = getDb();

    // 1. Verify Exam
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId) as any;
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // 2. Verify Attempt
    const attempt = db.prepare('SELECT * FROM attempts WHERE exam_id = ? AND candidate_id = ?').get(examId, candidate.id) as any;
    if (!attempt) {
      return NextResponse.json({ error: 'No attempt found for this exam' }, { status: 404 });
    }

    // IDEMPOTENCY CHECK: If already submitted, return the existing submission receipt
    if (attempt.status === 'submitted') {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        attemptId: attempt.id,
        submittedAt: attempt.submitted_at,
        receiptCode: `TALVYN-${attempt.id.toUpperCase()}-${attempt.submitted_at.toString(36).toUpperCase()}`,
        message: 'Your examination was previously submitted and securely recorded.',
        resultsReleased: Boolean(exam.results_released),
        score: exam.results_released ? attempt.score : null,
        passStatus: exam.results_released ? attempt.pass_status : 'pending_release',
      });
    }

    const now = Date.now();

    // 3. Fetch questions and candidate answers (attempt-specific questions if available)
    let questions = db.prepare(`
      SELECT q.id, q.marks, q.negative_marks, q.correct_option_index
      FROM attempt_questions aq
      JOIN questions q ON q.id = aq.question_id
      WHERE aq.attempt_id = ?
    `).all(attempt.id) as any[];

    if (questions.length === 0) {
      questions = db.prepare(`
        SELECT q.id, q.marks, q.negative_marks, q.correct_option_index
        FROM exam_questions eq
        JOIN questions q ON q.id = eq.question_id
        WHERE eq.exam_id = ?
      `).all(examId) as any[];
    }

    const answers = db.prepare(`
      SELECT question_id, selected_option_index
      FROM attempt_answers
      WHERE attempt_id = ?
    `).all(attempt.id) as any[];

    const answerMap = new Map<string, number | null>();
    answers.forEach(a => {
      answerMap.set(a.question_id, a.selected_option_index);
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
      } else if (candidateSelection === q.correct_option_index) {
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
    const passStatus = finalScore >= exam.pass_marks ? 'passed' : 'failed';

    // 5. Atomic Update
    db.prepare(`
      UPDATE attempts
      SET 
        status = 'submitted',
        submitted_at = ?,
        score = ?,
        max_score = ?,
        pass_status = ?
      WHERE id = ?
    `).run(now, finalScore, maxScore, passStatus, attempt.id);

    db.prepare(`
      UPDATE exam_assignments
      SET status = 'submitted'
      WHERE exam_id = ? AND candidate_id = ?
    `).run(examId, candidate.id);

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
