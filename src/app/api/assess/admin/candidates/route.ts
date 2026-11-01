import { NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';
import { getAuthContext } from '@/lib/auth/rbac';
import crypto from 'node:crypto';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const authCtx = await getAuthContext(request);
    const db = getDb();

    let sql = `
      SELECT 
        u.id, u.email, u.name, u.department, u.college, u.status, u.created_at, u.organization_id,
        COUNT(DISTINCT ea.exam_id) as assigned_exams_count,
        COUNT(DISTINCT att.id) as attempts_count,
        MAX(att.score) as highest_score,
        (SELECT status FROM attempts WHERE candidate_id = u.id ORDER BY created_at DESC LIMIT 1) as latest_attempt_status
      FROM users u
      LEFT JOIN exam_assignments ea ON ea.candidate_id = u.id
      LEFT JOIN exams e ON e.id = ea.exam_id
      LEFT JOIN attempts att ON att.candidate_id = u.id
      WHERE u.role = 'candidate'
    `;
    const params: any[] = [];

    // Enforce strict multi-tenant boundary for non-superadmins
    if (authCtx?.role !== 'super_admin' && authCtx?.organizationId) {
      params.push(authCtx.organizationId);
      sql += ` AND (u.organization_id = $${params.length} OR e.organization_id = $${params.length})`;
    }

    sql += `
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;

    const result = await db.query<any>(sql, params);
    return NextResponse.json({ candidates: result.rows });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const authCtx = await getAuthContext(request);
    const body = await request.json();
    const { name, email, password, department, college, assignExamId } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and initial password are required' }, { status: 400 });
    }

    const db = getDb();
    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    if (existing) {
      return NextResponse.json({ error: 'A candidate with this email already exists' }, { status: 409 });
    }

    const userId = 'usr_cand_' + crypto.randomUUID().slice(0, 8);
    const { hash, salt } = hashPassword(password);
    const now = Date.now();
    const orgId = authCtx?.organizationId || null;

    await db.execute(`
      INSERT INTO users (id, email, password_hash, salt, role, name, department, college, status, created_at, organization_id)
      VALUES ($1, $2, $3, $4, 'candidate', $5, $6, $7, 'active', $8, $9)
    `, [userId, email.trim().toLowerCase(), hash, salt, name.trim(), department || 'General', college || '', now, orgId]);

    // Optional immediate exam assignment
    if (assignExamId) {
      const exam = await db.queryOne<{ id: string; organization_id: string }>('SELECT id, organization_id FROM exams WHERE id = $1', [assignExamId]);
      if (exam) {
        // Enforce that admin can only assign candidates to their own organization exams
        if (authCtx?.role !== 'super_admin' && orgId && exam.organization_id && exam.organization_id !== orgId) {
          return NextResponse.json({ error: 'Forbidden: Cannot assign candidates to other organizations examinations' }, { status: 403 });
        }

        await db.execute(`
          INSERT INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status)
          VALUES ($1, $2, $3, $4, 'assigned')
          ON CONFLICT (exam_id, candidate_id) DO NOTHING
        `, [`asg_${assignExamId}_${userId}`, assignExamId, userId, now]);
      }
    }

    // Log administrative audit action
    await db.execute(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
      VALUES ($1, $2, 'create_candidate', 'user', $3, $4, $5)
    `, ['aud_' + crypto.randomUUID().slice(0, 8), admin.id, userId, `Created candidate ${email}`, now]);

    return NextResponse.json({
      success: true,
      candidate: {
        id: userId,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        department: department || 'General',
        college: college || '',
        organizationId: orgId,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to create candidate' }, { status: 500 });
  }
}
