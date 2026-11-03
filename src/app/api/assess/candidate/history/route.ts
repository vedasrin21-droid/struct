import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { getSessionUser } from '@/lib/assess/auth';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const db = getDb();
    const queryRes = await db.query<any>(
      `SELECT 
        a.id as attempt_id,
        a.exam_id,
        a.start_time,
        a.deadline_time,
        a.submitted_at,
        a.score,
        a.max_score,
        a.pass_status,
        a.status as attempt_status,
        e.title as exam_title,
        e.code as exam_code,
        e.duration_minutes,
        COALESCE(e.is_practice, 0) as is_practice,
        e.department as category,
        e.results_released
       FROM attempts a
       JOIN exams e ON a.exam_id = e.id
       WHERE a.candidate_id = $1
       ORDER BY a.created_at DESC`,
      [user.id]
    );

    const history = (queryRes.rows || []).map((r: any) => ({
      attemptId: r.attempt_id,
      examId: r.exam_id,
      title: r.exam_title,
      code: r.exam_code,
      category: r.category || 'General',
      durationMinutes: Number(r.duration_minutes || 15),
      isPractice: Number(r.is_practice) === 1,
      startTime: Number(r.start_time),
      submittedAt: r.submitted_at ? Number(r.submitted_at) : null,
      score: r.results_released || Number(r.is_practice) === 1 ? Number(r.score) : null,
      maxScore: Number(r.max_score || 10),
      passStatus: r.results_released || Number(r.is_practice) === 1 ? r.pass_status : null,
      status: r.attempt_status,
      resultsReleased: Boolean(r.results_released),
    }));

    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    console.error('[Candidate History Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load assessment history' },
      { status: 500 }
    );
  }
}
