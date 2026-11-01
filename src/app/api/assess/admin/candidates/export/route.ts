import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';
import { getAuthContext } from '@/lib/auth/rbac';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const authCtx = await getAuthContext(request);
    const db = getDb();

    const aggFunc = db.isPostgres() ? "STRING_AGG(DISTINCT e.title, ', ')" : "GROUP_CONCAT(DISTINCT e.title)";
    
    let sql = `
      SELECT 
        u.name, u.email, u.department, u.college, u.status,
        COALESCE(${aggFunc}, 'None') as assigned_exams,
        MAX(att.score) as highest_score,
        MAX(att.pass_status) as pass_status
      FROM users u
      LEFT JOIN exam_assignments ea ON ea.candidate_id = u.id
      LEFT JOIN exams e ON e.id = ea.exam_id
      LEFT JOIN attempts att ON att.candidate_id = u.id
      WHERE u.role = 'candidate'
    `;
    const params: any[] = [];

    // Organization scoping: Organization admins only export their organization's assigned candidates
    if (authCtx?.role !== 'super_admin' && authCtx?.organizationId) {
      params.push(authCtx.organizationId);
      sql += ` AND (e.organization_id = $${params.length} OR ea.id IS NULL)`;
    }

    sql += `
      GROUP BY u.id
      ORDER BY u.name ASC
    `;

    const result = await db.query<any>(sql, params);
    const candidates = result.rows;

    // Build CSV
    const rows = [
      ['Name', 'Email', 'Department', 'College', 'Status', 'Assigned Exams', 'Highest Score', 'Pass Status']
    ];

    for (const c of candidates) {
      rows.push([
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${(c.department || '').replace(/"/g, '""')}"`,
        `"${(c.college || '').replace(/"/g, '""')}"`,
        `"${c.status}"`,
        `"${(c.assigned_exams || '').replace(/"/g, '""')}"`,
        c.highest_score !== null && c.highest_score !== undefined ? String(c.highest_score) : 'N/A',
        c.pass_status || 'N/A',
      ]);
    }

    const csvContent = rows.map(r => r.join(',')).join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="struct_candidates_roster.csv"',
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to export candidates' }, { status: 500 });
  }
}
