import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireSuperAdmin } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);
    const db = getDb();
    const role = request.nextUrl.searchParams.get('role');
    const search = request.nextUrl.searchParams.get('search');

    let sql = `
      SELECT id, email, name, role, department, college, status, created_at
      FROM users
      WHERE 1=1
    `;
    const params: any[] = [];

    if (role) {
      params.push(role);
      sql += ` AND role = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(email) LIKE $${params.length} OR LOWER(name) LIKE $${params.length})`;
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await db.query(sql, params);
    return NextResponse.json({
      success: true,
      users: result.rows,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Super Administrator privilege required' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to list users' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const body = await request.json();
    const { userId, status, role } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = getDb();
    const existing = await db.queryOne<{ id: string; email: string; role: string }>(
      'SELECT id, email, role FROM users WHERE id = $1',
      [userId]
    );

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Protect root super admin from being demoted or suspended
    if (existing.email === 'admin@struct.careers' && (status === 'suspended' || (role && role !== 'super_admin'))) {
      return NextResponse.json({ error: 'Root platform super administrator cannot be modified' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (status && (status === 'active' || status === 'suspended')) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }

    if (role && ['super_admin', 'admin', 'user', 'candidate'].includes(role)) {
      params.push(role);
      updates.push(`role = $${params.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
    }

    params.push(userId);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`;
    await db.execute(sql, params);

    // Audit log
    await db.execute(
      `INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
       VALUES ($1, $2, 'update_user_status', 'user', $3, $4, $5)`,
      [
        'aud_' + Math.random().toString(36).substring(2, 10),
        admin.userId,
        userId,
        JSON.stringify({ status, role }),
        Date.now(),
      ]
    );

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Super Administrator privilege required' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to update user' }, { status: 500 });
  }
}
