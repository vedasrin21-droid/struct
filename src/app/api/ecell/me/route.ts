import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/assess/auth';
import { getDb } from '@/lib/assess/db';

const ECELL_EXAM_ID = 'exam_ecell_round1_2026';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = getDb();
    const now = Date.now();

    // Check ECELL Exam Configuration
    const exam = await db.queryOne<{
      id: string;
      title: string;
      code: string;
      duration_minutes: number;
      status: string;
      custom_post_exam_question?: string;
    }>('SELECT id, title, code, duration_minutes, status, custom_post_exam_question FROM exams WHERE id = $1', [
      ECELL_EXAM_ID,
    ]);

    if (!exam) {
      return NextResponse.json({ error: 'ECELL Examination is not configured' }, { status: 500 });
    }

    // Check Candidate Attempt
    const attempt = await db.queryOne<{
      id: string;
      status: string;
      department: string;
      start_time: number | bigint;
      deadline_time: number | bigint;
      submitted_at: number | bigint | null;
      score: number | null;
    }>('SELECT id, status, department, start_time, deadline_time, submitted_at, score FROM attempts WHERE candidate_id = $1 AND exam_id = $2', [
      user.id,
      ECELL_EXAM_ID,
    ]);

    let attemptStatus: 'not_started' | 'in_progress' | 'submitted' | 'closed' = 'not_started';
    let remainingSeconds = 0;
    let lockedDepartment = user.department || '';

    if (exam.status === 'closed') {
      attemptStatus = 'closed';
    } else if (attempt) {
      lockedDepartment = attempt.department || user.department || '';
      const deadline = Number(attempt.deadline_time);
      remainingSeconds = Math.max(0, Math.floor((deadline - now) / 1000));

      if (attempt.status === 'submitted') {
        attemptStatus = 'submitted';
      } else if (attempt.status === 'in_progress') {
        if (remainingSeconds <= 0) {
          // Time expired, auto-submit
          await db.execute(
            `UPDATE attempts SET status = 'submitted', submitted_at = $1 WHERE id = $2 AND status = 'in_progress'`,
            [now, attempt.id]
          );
          attemptStatus = 'submitted';
        } else {
          attemptStatus = 'in_progress';
        }
      }
    }

    return NextResponse.json({
      success: true,
      student: {
        id: user.id,
        name: user.name,
        email: user.email,
        college: user.college || '',
        department: lockedDepartment,
        role: user.role,
      },
      exam: {
        id: exam.id,
        title: exam.title,
        code: exam.code,
        durationMinutes: exam.duration_minutes,
        totalQuestions: 20,
        status: exam.status,
        customPostExamQuestion: exam.custom_post_exam_question || '',
      },
      attempt: attempt
        ? {
            id: attempt.id,
            status: attemptStatus,
            department: lockedDepartment,
            remainingSeconds,
            submittedAt: attempt.submitted_at ? Number(attempt.submitted_at) : null,
          }
        : null,
      attemptStatus,
    });
  } catch (error: any) {
    console.error('[ECELL Me Route Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
