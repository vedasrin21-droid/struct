import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireCandidate } from '@/lib/assess/auth';

export async function GET(request: Request) {
  try {
    const candidate = await requireCandidate(request);
    const db = getDb();

    const exams = db.prepare(`
      SELECT 
        e.id, e.title, e.code, e.description, e.department,
        e.duration_minutes, e.total_marks, e.pass_marks,
        e.negative_marking_enabled, e.status as exam_status,
        e.results_released, e.instructions,
        ea.assigned_at, ea.status as assignment_status,
        att.id as attempt_id,
        att.start_time,
        att.deadline_time,
        att.submitted_at,
        att.status as attempt_status,
        att.score,
        att.pass_status
      FROM exam_assignments ea
      JOIN exams e ON e.id = ea.exam_id
      LEFT JOIN attempts att ON att.exam_id = e.id AND att.candidate_id = ?
      WHERE ea.candidate_id = ? AND e.status != 'draft'
      ORDER BY ea.assigned_at DESC
    `).all(candidate.id, candidate.id) as any[];

    const now = Date.now();
    const formattedExams = exams.map(e => {
      let state: 'ready' | 'in_progress' | 'submitted' | 'expired' | 'closed' = 'ready';
      let remainingSeconds = 0;

      if (e.exam_status === 'closed') {
        state = 'closed';
      } else if (e.attempt_status === 'submitted') {
        state = 'submitted';
      } else if (e.attempt_status === 'in_progress') {
        if (now > e.deadline_time) {
          state = 'expired';
        } else {
          state = 'in_progress';
          remainingSeconds = Math.max(0, Math.floor((e.deadline_time - now) / 1000));
        }
      }

      // Hide exact score if results are not released yet
      const safeScore = e.results_released ? e.score : null;
      const safePassStatus = e.results_released ? e.pass_status : (e.attempt_status === 'submitted' ? 'pending_release' : null);

      return {
        ...e,
        state,
        remainingSeconds,
        score: safeScore,
        pass_status: safePassStatus,
      };
    });

    return NextResponse.json({ exams: formattedExams });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_CANDIDATE_REQUIRED') {
      return NextResponse.json({ error: 'Candidate login required' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch candidate exams' }, { status: 500 });
  }
}
