import { NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';
import crypto from 'node:crypto';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = getDb();

    const candidates = db.prepare(`
      SELECT 
        u.id, u.email, u.name, u.department, u.college, u.status, u.created_at,
        COUNT(DISTINCT ea.exam_id) as assigned_exams_count,
        COUNT(DISTINCT att.id) as attempts_count,
        MAX(att.score) as highest_score,
        (SELECT status FROM attempts WHERE candidate_id = u.id ORDER BY created_at DESC LIMIT 1) as latest_attempt_status
      FROM users u
      LEFT JOIN exam_assignments ea ON ea.candidate_id = u.id
      LEFT JOIN attempts att ON att.candidate_id = u.id
      WHERE u.role = 'candidate'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();

    return NextResponse.json({ candidates });
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
    const body = await request.json();
    const { name, email, password, department, college, assignExamId } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and initial password are required' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email.trim());
    if (existing) {
      return NextResponse.json({ error: 'A candidate with this email already exists' }, { status: 409 });
    }

    const userId = 'usr_cand_' + crypto.randomUUID().slice(0, 8);
    const { hash, salt } = hashPassword(password);
    const now = Date.now();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, role, name, department, college, status, created_at)
      VALUES (?, ?, ?, ?, 'candidate', ?, ?, ?, 'active', ?)
    `).run(userId, email.trim().toLowerCase(), hash, salt, name.trim(), department || 'General', college || '', now);

    // Optional immediate exam assignment
    if (assignExamId) {
      const exam = db.prepare('SELECT id FROM exams WHERE id = ?').get(assignExamId);
      if (exam) {
        db.prepare(`
          INSERT OR IGNORE INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status)
          VALUES (?, ?, ?, ?, 'assigned')
        `).run(`asg_${assignExamId}_${userId}`, assignExamId, userId, now);
      }
    }

    // Log administrative audit action
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, 'create_candidate', 'user', ?, ?, ?)
    `).run('aud_' + crypto.randomUUID().slice(0, 8), admin.id, userId, `Created candidate ${email}`, now);

    return NextResponse.json({
      success: true,
      candidate: {
        id: userId,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        department: department || 'General',
        college: college || '',
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create candidate' }, { status: 500 });
  }
}
