import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');

    const db = getDb();

    // 1. Overview counts
    const totalCandidatesRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'candidate'").get() as any;
    const totalExamsRow = db.prepare("SELECT COUNT(*) as count FROM exams").get() as any;
    const totalAttemptsRow = db.prepare("SELECT COUNT(*) as count FROM attempts WHERE status = 'submitted'").get() as any;
    const passRow = db.prepare("SELECT COUNT(*) as passed FROM attempts WHERE status = 'submitted' AND pass_status = 'passed'").get() as any;
    const avgScoreRow = db.prepare("SELECT AVG(score) as avg_score FROM attempts WHERE status = 'submitted'").get() as any;
    const securityCountRow = db.prepare("SELECT COUNT(*) as count FROM security_events").get() as any;

    const passRate = totalAttemptsRow.count > 0 ? (passRow.passed / totalAttemptsRow.count) * 100 : 0;

    // 2. Leaderboard
    let leaderboardQuery = `
      SELECT 
        att.id as attempt_id,
        u.id as candidate_id,
        u.name as candidate_name,
        u.email,
        u.department,
        u.college,
        e.id as exam_id,
        e.title as exam_title,
        e.total_marks,
        e.pass_marks,
        att.score,
        att.pass_status,
        att.start_time,
        att.submitted_at,
        COUNT(se.id) as security_violations_count
      FROM attempts att
      JOIN users u ON u.id = att.candidate_id
      JOIN exams e ON e.id = att.exam_id
      LEFT JOIN security_events se ON se.attempt_id = att.id
      WHERE att.status = 'submitted'
    `;
    const params: any[] = [];
    if (examId) {
      leaderboardQuery += ' AND e.id = ?';
      params.push(examId);
    }
    leaderboardQuery += `
      GROUP BY att.id
      ORDER BY att.score DESC, (att.submitted_at - att.start_time) ASC
      LIMIT 100
    `;

    const leaderboardRaw = db.prepare(leaderboardQuery).all(...params) as any[];
    const leaderboard = leaderboardRaw.map((row, index) => ({
      rank: index + 1,
      ...row,
      percentage: row.total_marks > 0 ? ((row.score / row.total_marks) * 100).toFixed(1) : 0,
      durationMinutes: Math.round(((row.submitted_at - row.start_time) / (1000 * 60)) * 10) / 10,
    }));

    // 3. Department breakdown
    const deptRows = db.prepare(`
      SELECT 
        u.department,
        COUNT(DISTINCT u.id) as total_candidates,
        COUNT(DISTINCT att.id) as total_attempts,
        AVG(att.score) as avg_score,
        SUM(CASE WHEN att.pass_status = 'passed' THEN 1 ELSE 0 END) as passed_count
      FROM users u
      LEFT JOIN attempts att ON att.candidate_id = u.id AND att.status = 'submitted'
      WHERE u.role = 'candidate'
      GROUP BY u.department
      ORDER BY total_candidates DESC
    `).all() as any[];

    const departmentStats = deptRows.map(d => ({
      ...d,
      avg_score: d.avg_score ? parseFloat(d.avg_score.toFixed(2)) : 0,
      pass_rate: d.total_attempts > 0 ? parseFloat(((d.passed_count / d.total_attempts) * 100).toFixed(1)) : 0,
    }));

    // 4. Question performance statistics
    const questionStats = db.prepare(`
      SELECT 
        q.id, q.text, q.category, q.difficulty, q.marks,
        COUNT(aa.id) as total_responses,
        SUM(CASE WHEN aa.selected_option_index = q.correct_option_index THEN 1 ELSE 0 END) as correct_responses
      FROM questions q
      LEFT JOIN attempt_answers aa ON aa.question_id = q.id
      GROUP BY q.id
      HAVING total_responses > 0
      ORDER BY total_responses DESC
      LIMIT 20
    `).all() as any[];

    const questionAnalytics = questionStats.map(q => ({
      ...q,
      success_rate: q.total_responses > 0 ? parseFloat(((q.correct_responses / q.total_responses) * 100).toFixed(1)) : 0,
    }));

    return NextResponse.json({
      summary: {
        totalCandidates: totalCandidatesRow.count,
        totalExams: totalExamsRow.count,
        totalAttempts: totalAttemptsRow.count,
        averageScore: avgScoreRow.avg_score ? parseFloat(avgScoreRow.avg_score.toFixed(2)) : 0,
        passRate: parseFloat(passRate.toFixed(1)),
        securityEventsCount: securityCountRow.count,
      },
      leaderboard,
      departmentStats,
      questionAnalytics,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 });
  }
}
