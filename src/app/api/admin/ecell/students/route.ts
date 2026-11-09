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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.trim().toLowerCase() || '';
    const deptFilter = searchParams.get('department')?.trim().toUpperCase() || '';

    const db = getDb();

    let sql = `
      SELECT u.id, u.name, u.email, u.phone, u.department as user_department, u.college, u.status as user_status,
             a.id as attempt_id, a.status as attempt_status, a.department as attempt_department,
             a.score, a.start_time, a.submitted_at
      FROM users u
      LEFT JOIN attempts a ON u.id = a.candidate_id AND a.exam_id = $1
      WHERE u.role = 'candidate'
    `;
    const params: any[] = [ECELL_EXAM_ID];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length} OR LOWER(u.id) LIKE $${params.length} OR (u.phone IS NOT NULL AND u.phone LIKE $${params.length}))`;
    }

    if (deptFilter && deptFilter !== 'ALL') {
      params.push(deptFilter);
      sql += ` AND (UPPER(a.department) = $${params.length} OR (a.department IS NULL AND UPPER(u.department) = $${params.length}))`;
    }

    sql += ` ORDER BY 
      CASE WHEN a.status = 'submitted' THEN 0 WHEN a.status = 'in_progress' THEN 1 ELSE 2 END,
      a.score DESC NULLS LAST,
      u.name ASC
      LIMIT 1000`;

    const result = await db.query(sql, params);

    const students = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || '',
      department: row.attempt_department || row.user_department || 'Not Selected',
      college: row.college || '',
      attemptStatus: row.attempt_status || 'not_started',
      attemptId: row.attempt_id,
      score: row.score !== null ? Number(row.score) : null,
      startTime: row.start_time ? Number(row.start_time) : null,
      submittedAt: row.submitted_at ? Number(row.submitted_at) : null,
    }));

    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    console.error('[Admin ECELL Students GET Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch students' }, { status: 500 });
  }
}
