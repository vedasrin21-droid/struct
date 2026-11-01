import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';
import { getAuthContext } from '@/lib/auth/rbac';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const authCtx = await getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');

    const db = getDb();
    const isSuperAdmin = authCtx?.role === 'super_admin';
    const orgId = authCtx?.organizationId;

    // 1. Overview counts scoped to organization
    let totalCandidatesRow: any;
    let totalExamsRow: any;
    let totalAttemptsRow: any;
    let passRow: any;
    let avgScoreRow: any;
    let securityCountRow: any;

    if (!isSuperAdmin && orgId) {
      totalCandidatesRow = await db.queryOne<any>(
        `SELECT COUNT(DISTINCT u.id) as count
         FROM users u
         LEFT JOIN exam_assignments ea ON ea.candidate_id = u.id
         LEFT JOIN exams e ON e.id = ea.exam_id
         WHERE u.role = 'candidate' AND (u.organization_id = $1 OR e.organization_id = $1)`,
        [orgId]
      );
      totalExamsRow = await db.queryOne<any>(
        `SELECT COUNT(*) as count FROM exams WHERE organization_id = $1`,
        [orgId]
      );
      totalAttemptsRow = await db.queryOne<any>(
        `SELECT COUNT(att.id) as count
         FROM attempts att
         JOIN exams e ON e.id = att.exam_id
         WHERE att.status = 'submitted' AND e.organization_id = $1`,
        [orgId]
      );
      passRow = await db.queryOne<any>(
        `SELECT COUNT(att.id) as passed
         FROM attempts att
         JOIN exams e ON e.id = att.exam_id
         WHERE att.status = 'submitted' AND att.pass_status = 'passed' AND e.organization_id = $1`,
        [orgId]
      );
      avgScoreRow = await db.queryOne<any>(
        `SELECT AVG(att.score) as avg_score
         FROM attempts att
         JOIN exams e ON e.id = att.exam_id
         WHERE att.status = 'submitted' AND e.organization_id = $1`,
        [orgId]
      );
      securityCountRow = await db.queryOne<any>(
        `SELECT COUNT(se.id) as count
         FROM security_events se
         JOIN exams e ON e.id = se.exam_id
         WHERE e.organization_id = $1`,
        [orgId]
      );
    } else {
      totalCandidatesRow = await db.queryOne<any>("SELECT COUNT(*) as count FROM users WHERE role = 'candidate'");
      totalExamsRow = await db.queryOne<any>("SELECT COUNT(*) as count FROM exams");
      totalAttemptsRow = await db.queryOne<any>("SELECT COUNT(*) as count FROM attempts WHERE status = 'submitted'");
      passRow = await db.queryOne<any>("SELECT COUNT(*) as passed FROM attempts WHERE status = 'submitted' AND pass_status = 'passed'");
      avgScoreRow = await db.queryOne<any>("SELECT AVG(score) as avg_score FROM attempts WHERE status = 'submitted'");
      securityCountRow = await db.queryOne<any>("SELECT COUNT(*) as count FROM security_events");
    }

    const totalAttemptsCount = Number(totalAttemptsRow?.count || 0);
    const passedCount = Number(passRow?.passed || 0);
    const passRate = totalAttemptsCount > 0 ? (passedCount / totalAttemptsCount) * 100 : 0;

    // 2. Leaderboard scoped to organization
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
    if (!isSuperAdmin && orgId) {
      params.push(orgId);
      leaderboardQuery += ` AND e.organization_id = $${params.length}`;
    }
    if (examId) {
      params.push(examId);
      leaderboardQuery += ` AND e.id = $${params.length}`;
    }
    leaderboardQuery += `
      GROUP BY att.id, u.id, u.name, u.email, u.department, u.college, e.id, e.title, e.total_marks, e.pass_marks, att.score, att.pass_status, att.start_time, att.submitted_at
      ORDER BY att.score DESC, (att.submitted_at - att.start_time) ASC
      LIMIT 100
    `;

    const leaderboardResult = await db.query<any>(leaderboardQuery, params);
    const leaderboard = leaderboardResult.rows.map((row, index) => {
      const startTime = Number(row.start_time);
      const submittedAt = Number(row.submitted_at);
      const totalMarks = Number(row.total_marks);
      const score = Number(row.score);
      const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
      const durationSeconds = (submittedAt > startTime) ? Math.floor((submittedAt - startTime) / 1000) : 0;

      return {
        rank: index + 1,
        attemptId: row.attempt_id,
        candidateId: row.candidate_id,
        candidateName: row.candidate_name,
        candidateEmail: row.email,
        department: row.department,
        college: row.college,
        examId: row.exam_id,
        examTitle: row.exam_title,
        score,
        totalMarks,
        percentage: parseFloat(percentage.toFixed(1)),
        passStatus: row.pass_status,
        durationSeconds,
        securityViolations: Number(row.security_violations_count || 0),
        submittedAt,
      };
    });

    // 3. Department performance statistics
    let deptQuery = `
      SELECT 
        u.department,
        COUNT(DISTINCT att.id) as total_attempts,
        AVG(att.score) as avg_score,
        SUM(CASE WHEN att.pass_status = 'passed' THEN 1 ELSE 0 END) as passed_count
      FROM attempts att
      JOIN users u ON u.id = att.candidate_id
      JOIN exams e ON e.id = att.exam_id
      WHERE att.status = 'submitted'
    `;
    const deptParams: any[] = [];
    if (!isSuperAdmin && orgId) {
      deptParams.push(orgId);
      deptQuery += ` AND e.organization_id = $${deptParams.length}`;
    }
    deptQuery += `
      GROUP BY u.department
      ORDER BY avg_score DESC
    `;

    const deptResult = await db.query<any>(deptQuery, deptParams);
    const departmentStats = deptResult.rows.map(d => {
      const totalAttempts = Number(d.total_attempts || 0);
      const dPassed = Number(d.passed_count || 0);
      const avgScore = Number(d.avg_score || 0);
      return {
        ...d,
        avg_score: avgScore ? parseFloat(avgScore.toFixed(2)) : 0,
        pass_rate: totalAttempts > 0 ? parseFloat(((dPassed / totalAttempts) * 100).toFixed(1)) : 0,
      };
    });

    return NextResponse.json({
      summary: {
        totalCandidates: Number(totalCandidatesRow?.count || 0),
        totalExams: Number(totalExamsRow?.count || 0),
        totalAttempts: totalAttemptsCount,
        averageScore: avgScoreRow?.avg_score ? parseFloat(Number(avgScoreRow.avg_score).toFixed(2)) : 0,
        passRate: parseFloat(passRate.toFixed(1)),
        securityEventsCount: Number(securityCountRow?.count || 0),
      },
      leaderboard,
      departmentStats,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to generate administrative report' }, { status: 500 });
  }
}
