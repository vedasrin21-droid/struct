import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';
import { getAuthContext } from '@/lib/auth/rbac';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const authCtx = await getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const examId = searchParams.get('examId');

    const db = getDb();
    const isSuperAdmin = authCtx?.role === 'super_admin';
    const orgId = authCtx?.organizationId;

    let query = `
      SELECT 
        se.id, se.event_type, se.severity, se.details, se.created_at,
        u.id as candidate_id, u.name as candidate_name, u.email as candidate_email, u.department,
        e.id as exam_id, e.title as exam_title,
        att.id as attempt_id, att.status as attempt_status
      FROM security_events se
      JOIN users u ON u.id = se.candidate_id
      JOIN exams e ON e.id = se.exam_id
      LEFT JOIN attempts att ON att.id = se.attempt_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Enforce tenant boundary for non-superadmins
    if (!isSuperAdmin && orgId) {
      params.push(orgId);
      query += ` AND e.organization_id = $${params.length}`;
    }

    if (severity) {
      params.push(severity);
      query += ` AND se.severity = $${params.length}`;
    }
    if (examId) {
      params.push(examId);
      query += ` AND se.exam_id = $${params.length}`;
    }

    query += ' ORDER BY se.created_at DESC LIMIT 200';

    const result = await db.query<any>(query, params);

    return NextResponse.json({ events: result.rows });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch security events' }, { status: 500 });
  }
}
