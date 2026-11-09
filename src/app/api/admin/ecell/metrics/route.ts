import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/assess/auth';
import { getDb } from '@/lib/assess/db';

const ECELL_EXAM_ID = 'exam_ecell_round1_2026';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Administrative privileges required' }, { status: 403 });
    }

    const db = getDb();

    // 1. Total Registered Students
    const studentCountRes = await db.queryOne<{ count: string | number }>(
      `SELECT count(*) as count FROM users WHERE role = 'candidate'`
    );

    // 2. Attempts counts
    const attemptsCountRes = await db.query<{ status: string; count: string | number }>(
      `SELECT status, count(*) as count FROM attempts WHERE exam_id = $1 GROUP BY status`,
      [ECELL_EXAM_ID]
    );

    let inProgressCount = 0;
    let submittedCount = 0;
    for (const row of attemptsCountRes.rows) {
      if (row.status === 'in_progress') inProgressCount = Number(row.count);
      if (row.status === 'submitted') submittedCount = Number(row.count);
    }

    // 3. Department Breakdown
    const deptBreakdownRes = await db.query<{ department: string; count: string | number }>(
      `SELECT department, count(*) as count FROM attempts WHERE exam_id = $1 GROUP BY department ORDER BY count DESC`,
      [ECELL_EXAM_ID]
    );

    // 4. Feedback metrics
    const feedbackStatsRes = await db.queryOne<{
      total_feedback: string | number;
      avg_overall: string | number;
      avg_nav: string | number;
      avg_quality: string | number;
    }>(
      `SELECT count(*) as total_feedback,
              COALESCE(AVG(overall_rating), 0) as avg_overall,
              COALESCE(AVG(navigation_rating), 0) as avg_nav,
              COALESCE(AVG(question_quality_rating), 0) as avg_quality
       FROM exam_feedback WHERE exam_id = $1`,
      [ECELL_EXAM_ID]
    );

    // 5. Waitlist subscribers count
    const waitlistCountRes = await db.queryOne<{ count: string | number }>(
      `SELECT count(*) as count FROM waitlist_subscribers`
    );

    // 6. Exam current config
    const examConfig = await db.queryOne<{ status: string; custom_post_exam_question: string }>(
      `SELECT status, custom_post_exam_question FROM exams WHERE id = $1`,
      [ECELL_EXAM_ID]
    );

    return NextResponse.json({
      success: true,
      metrics: {
        totalStudents: Number(studentCountRes?.count || 0),
        inProgressAttempts: inProgressCount,
        submittedAttempts: submittedCount,
        departmentBreakdown: deptBreakdownRes.rows.map((r) => ({
          department: r.department || 'Unspecified',
          count: Number(r.count),
        })),
        totalFeedback: Number(feedbackStatsRes?.total_feedback || 0),
        avgOverallRating: Number(Number(feedbackStatsRes?.avg_overall || 0).toFixed(1)),
        avgNavigationRating: Number(Number(feedbackStatsRes?.avg_nav || 0).toFixed(1)),
        avgQualityRating: Number(Number(feedbackStatsRes?.avg_quality || 0).toFixed(1)),
        totalWaitlistSubscribers: Number(waitlistCountRes?.count || 0),
        examStatus: examConfig?.status || 'published',
        customPostExamQuestion: examConfig?.custom_post_exam_question || '',
      },
    });
  } catch (error: any) {
    console.error('[Admin ECELL Metrics Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to load metrics' }, { status: 500 });
  }
}
