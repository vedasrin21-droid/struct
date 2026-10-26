import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const examId = searchParams.get('examId');

    const db = getDb();

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

    if (severity) {
      query += ' AND se.severity = ?';
      params.push(severity);
    }
    if (examId) {
      query += ' AND se.exam_id = ?';
      params.push(examId);
    }

    query += ' ORDER BY se.created_at DESC LIMIT 200';

    const events = db.prepare(query).all(...params);

    return NextResponse.json({ events });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch security events' }, { status: 500 });
  }
}
