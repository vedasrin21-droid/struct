import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireCandidate } from '@/lib/assess/auth';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const candidate = await requireCandidate(request);
    const { id: examId } = await context.params;
    const db = getDb();

    // 1. Get Exam
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId) as any;
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // 2. Get Attempt
    const attempt = db.prepare('SELECT * FROM attempts WHERE exam_id = ? AND candidate_id = ?').get(examId, candidate.id) as any;
    if (!attempt) {
      return NextResponse.json({
        hasStarted: false,
        exam: {
          id: exam.id,
          title: exam.title,
          code: exam.code,
          description: exam.description,
          duration_minutes: exam.duration_minutes,
          total_marks: exam.total_marks,
          pass_marks: exam.pass_marks,
          instructions: exam.instructions,
          negative_marking_enabled: Boolean(exam.negative_marking_enabled),
        },
      });
    }

    const now = Date.now();
    const isExpired = attempt.status === 'in_progress' && now > attempt.deadline_time;

    if (isExpired && attempt.status === 'in_progress') {
      db.prepare("UPDATE attempts SET status = 'expired' WHERE id = ?").run(attempt.id);
      db.prepare("UPDATE exam_assignments SET status = 'expired' WHERE exam_id = ? AND candidate_id = ?").run(examId, candidate.id);
      attempt.status = 'expired';
    }

    // 3. Fetch questions attached to this attempt (or fallback to exam_questions)
    let questionRows = db.prepare(`
      SELECT 
        q.id, q.text, q.category, q.difficulty, q.marks, q.negative_marks, q.options_json,
        aq.order_index, COALESCE(aq.is_mandatory, 0) as is_mandatory,
        q.correct_option_index, q.explanation
      FROM attempt_questions aq
      JOIN questions q ON q.id = aq.question_id
      WHERE aq.attempt_id = ?
      ORDER BY aq.order_index ASC
    `).all(attempt.id) as any[];

    if (questionRows.length === 0) {
      questionRows = db.prepare(`
        SELECT 
          q.id, q.text, q.category, q.difficulty, q.marks, q.negative_marks, q.options_json,
          eq.order_index, COALESCE(eq.is_mandatory, 0) as is_mandatory,
          q.correct_option_index, q.explanation
        FROM exam_questions eq
        JOIN questions q ON q.id = eq.question_id
        WHERE eq.exam_id = ?
        ORDER BY eq.order_index ASC
      `).all(examId) as any[];
    }

    // 4. Fetch saved answers
    const savedAnswersRows = db.prepare(`
      SELECT question_id, selected_option_index, is_marked_for_review, version
      FROM attempt_answers
      WHERE attempt_id = ?
    `).all(attempt.id) as any[];

    const savedAnswersMap: Record<string, { selectedOption: number | null; isMarkedForReview: boolean; version: number }> = {};
    savedAnswersRows.forEach(a => {
      savedAnswersMap[a.question_id] = {
        selectedOption: a.selected_option_index,
        isMarkedForReview: Boolean(a.is_marked_for_review),
        version: a.version,
      };
    });

    // 5. SECURITY GUARD: Strip answer keys unless results are officially released AND show_answer_key is enabled!
    const canSeeAnswers = attempt.status === 'submitted' && Boolean(exam.results_released) && (exam.show_answer_key === undefined || Boolean(exam.show_answer_key));

    const sanitizedQuestions = questionRows.map(q => {
      const base: any = {
        id: q.id,
        text: q.text,
        category: q.category,
        difficulty: q.difficulty,
        marks: q.marks,
        negative_marks: q.negative_marks,
        options: JSON.parse(q.options_json),
        orderIndex: q.order_index,
        isMandatory: Boolean(q.is_mandatory),
      };

      if (canSeeAnswers) {
        base.correctOptionIndex = q.correct_option_index;
        base.explanation = q.explanation;
      }

      return base;
    });

    const remainingSeconds = attempt.status === 'in_progress'
      ? Math.max(0, Math.floor((attempt.deadline_time - now) / 1000))
      : 0;

    return NextResponse.json({
      hasStarted: true,
      attemptId: attempt.id,
      status: attempt.status,
      startTime: attempt.start_time,
      deadlineTime: attempt.deadline_time,
      submittedAt: attempt.submitted_at,
      remainingSeconds,
      serverTime: now,
      score: Boolean(exam.results_released) ? attempt.score : null,
      passStatus: Boolean(exam.results_released) ? attempt.pass_status : (attempt.status === 'submitted' ? 'pending_release' : null),
      resultsReleased: Boolean(exam.results_released),
      showAnswerKey: exam.show_answer_key === undefined ? true : Boolean(exam.show_answer_key),
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        department: candidate.department,
        college: candidate.college || '',
      },
      exam: {
        id: exam.id,
        title: exam.title,
        code: exam.code,
        duration_minutes: exam.duration_minutes,
        total_marks: exam.total_marks,
        pass_marks: exam.pass_marks,
        instructions: exam.instructions,
        negative_marking_enabled: Boolean(exam.negative_marking_enabled),
        allow_back_navigation: exam.allow_back_navigation === undefined ? true : Boolean(exam.allow_back_navigation),
        show_answer_key: exam.show_answer_key === undefined ? true : Boolean(exam.show_answer_key),
        enable_fullscreen: exam.enable_fullscreen === undefined ? true : Boolean(exam.enable_fullscreen),
        enable_ai_defense: exam.enable_ai_defense === undefined ? true : Boolean(exam.enable_ai_defense),
        enable_anti_google: exam.enable_anti_google === undefined ? true : Boolean(exam.enable_anti_google),
      },
      questions: sanitizedQuestions,
      savedAnswers: savedAnswersMap,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_CANDIDATE_REQUIRED') {
      return NextResponse.json({ error: 'Candidate login required' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch status' }, { status: 500 });
  }
}
