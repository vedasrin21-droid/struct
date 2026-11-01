import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireCandidate } from '@/lib/assess/auth';
import { getEntitlementBalance } from '@/lib/payments/service';

export async function GET(request: Request) {
  try {
    const candidate = await requireCandidate(request);
    const db = getDb();

    // 1. Fetch all public practice assessments, joined with candidate's enrollment and attempt status
    const result = await db.query<any>(`
      SELECT 
        e.id, e.title, e.code, e.description, e.department,
        e.duration_minutes, e.total_marks, e.pass_marks,
        e.negative_marking_enabled, e.status, e.instructions,
        COALESCE(e.is_practice, 0) as is_practice,
        e.results_released,
        COUNT(DISTINCT eq.question_id) as questions_count,
        ea.id as assignment_id,
        ea.status as assignment_status,
        ea.assigned_at,
        att.id as attempt_id,
        att.status as attempt_status,
        att.score,
        att.pass_status,
        att.start_time,
        att.deadline_time
      FROM exams e
      LEFT JOIN exam_questions eq ON eq.exam_id = e.id
      LEFT JOIN exam_assignments ea ON ea.exam_id = e.id AND ea.candidate_id = $1
      LEFT JOIN attempts att ON att.exam_id = e.id AND att.candidate_id = $1
      WHERE (COALESCE(e.is_practice, 0) = 1 OR e.organization_id IS NULL)
        AND e.status = 'published'
      GROUP BY e.id, ea.id, att.id
      ORDER BY e.created_at DESC
    `, [candidate.id]);

    const now = Date.now();
    const practiceExams = result.rows.map(exam => {
      let state: 'not_enrolled' | 'enrolled' | 'in_progress' | 'submitted' | 'expired' = 'not_enrolled';
      let remainingSeconds = 0;

      if (exam.assignment_id) {
        if (exam.attempt_status === 'submitted') {
          state = 'submitted';
        } else if (exam.attempt_status === 'in_progress') {
          const deadlineTime = Number(exam.deadline_time || 0);
          if (now > deadlineTime) {
            state = 'expired';
          } else {
            state = 'in_progress';
            remainingSeconds = Math.max(0, Math.floor((deadlineTime - now) / 1000));
          }
        } else {
          state = 'enrolled';
        }
      }

      // Security: hide actual score if results are not released yet
      const safeScore = exam.results_released ? exam.score : null;
      const safePassStatus = exam.results_released ? exam.pass_status : (exam.attempt_status === 'submitted' ? 'pending_release' : null);

      return {
        id: exam.id,
        title: exam.title,
        code: exam.code,
        description: exam.description || '',
        department: exam.department || 'General',
        duration_minutes: Number(exam.duration_minutes),
        durationMinutes: Number(exam.duration_minutes),
        total_marks: Number(exam.total_marks),
        totalMarks: Number(exam.total_marks),
        pass_marks: Number(exam.pass_marks),
        passMarks: Number(exam.pass_marks),
        negative_marking_enabled: Boolean(exam.negative_marking_enabled),
        negativeMarkingEnabled: Boolean(exam.negative_marking_enabled),
        questions_count: Number(exam.questions_count) || 10,
        questionsCount: Number(exam.questions_count) || 10,
        instructions: exam.instructions || '',
        is_practice: 1,
        results_released: Boolean(exam.results_released),
        state: state === 'enrolled' ? 'ready' : state,
        remainingSeconds,
        is_enrolled: Boolean(exam.assignment_id),
        isEnrolled: Boolean(exam.assignment_id),
        assignment_id: exam.assignment_id,
        assignmentId: exam.assignment_id,
        attempt_id: exam.attempt_id,
        attemptId: exam.attempt_id,
        score: safeScore,
        pass_status: safePassStatus,
        passStatus: safePassStatus,
      };
    });

    // 2. Query candidate entitlement balance for mock assessment attempts
    const balance = await getEntitlementBalance(candidate.email, 'mock_assessment_attempt');

    return NextResponse.json({
      success: true,
      practiceExams,
      exams: practiceExams,
      entitlements: {
        remaining: balance.remainingBalance,
        totalGranted: balance.totalGranted,
        totalConsumed: balance.totalConsumed,
        isEligible: balance.remainingBalance > 0,
      },
      entitlement: {
        hasAccess: balance.remainingBalance > 0,
        remainingCredits: balance.remainingBalance,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN_CANDIDATE_REQUIRED') {
      return NextResponse.json({ error: 'Candidate access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to fetch practice catalog' }, { status: 500 });
  }
}
