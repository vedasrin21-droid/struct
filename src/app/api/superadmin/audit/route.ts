import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireSuperAdmin } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);
    const db = getDb();
    const action = request.nextUrl.searchParams.get('action');

    let sql = `
      SELECT 
        a.id,
        a.user_id,
        a.action,
        a.target_type,
        a.target_id,
        a.details,
        a.ip_address,
        a.created_at,
        u.email as user_email,
        u.name as user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (action) {
      params.push(action);
      sql += ` AND a.action = $${params.length}`;
    }

    sql += ` ORDER BY a.created_at DESC LIMIT 100`;

    const result = await db.query(sql, params);
    return NextResponse.json({
      success: true,
      logs: result.rows,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message?.includes('SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Super Administrator privilege required' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to list audit logs' }, { status: 500 });
  }
}
