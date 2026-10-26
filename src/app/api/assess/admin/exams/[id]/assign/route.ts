import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';
import crypto from 'node:crypto';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id: examId } = await context.params;
    const db = getDb();

    const exam = db.prepare('SELECT id, title, code, department FROM exams WHERE id = ?').get(examId) as any;
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Get all candidates and check if assigned to this exam
    const candidates = db.prepare(`
      SELECT 
        u.id, u.name, u.email, u.department, u.college, u.status as user_status,
        ea.id as assignment_id,
        ea.assigned_at,
        ea.status as assignment_status,
        att.id as attempt_id,
        att.status as attempt_status,
        att.score
      FROM users u
      LEFT JOIN exam_assignments ea ON ea.candidate_id = u.id AND ea.exam_id = ?
      LEFT JOIN attempts att ON att.candidate_id = u.id AND att.exam_id = ?
      WHERE u.role = 'candidate'
      ORDER BY u.name ASC
    `).all(examId, examId) as any[];

    const departments = db.prepare("SELECT DISTINCT department FROM users WHERE role = 'candidate' AND department != '' ORDER BY department ASC").all() as any[];
    const colleges = db.prepare("SELECT DISTINCT college FROM users WHERE role = 'candidate' AND college != '' ORDER BY college ASC").all() as any[];

    return NextResponse.json({
      exam,
      candidates: candidates.map(c => ({
        ...c,
        isAssigned: Boolean(c.assignment_id),
      })),
      departments: departments.map(d => d.department),
      colleges: colleges.map(c => c.college),
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id: examId } = await context.params;
    const body = await request.json();
    const { action, candidateIds, department, college, assignAll } = body;

    const db = getDb();
    const exam = db.prepare('SELECT id, title, code FROM exams WHERE id = ?').get(examId) as any;
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const now = Date.now();
    let targetCandidateIds: string[] = [];

    if (assignAll) {
      const allCand = db.prepare("SELECT id FROM users WHERE role = 'candidate' AND status = 'active'").all() as any[];
      targetCandidateIds = allCand.map(c => c.id);
    } else if (department) {
      const deptCand = db.prepare("SELECT id FROM users WHERE role = 'candidate' AND department = ?").all(department) as any[];
      targetCandidateIds = deptCand.map(c => c.id);
    } else if (college) {
      const colCand = db.prepare("SELECT id FROM users WHERE role = 'candidate' AND college = ?").all(college) as any[];
      targetCandidateIds = colCand.map(c => c.id);
    } else if (Array.isArray(candidateIds)) {
      targetCandidateIds = candidateIds;
    }

    if (action === 'unassign') {
      if (targetCandidateIds.length > 0) {
        const placeholders = targetCandidateIds.map(() => '?').join(',');
        db.prepare(`
          DELETE FROM exam_assignments 
          WHERE exam_id = ? AND candidate_id IN (${placeholders})
          AND status = 'assigned' -- Don't delete if attempt already started or completed
        `).run(examId, ...targetCandidateIds);
      }
    } else {
      // Assign
      const assignStmt = db.prepare(`
        INSERT OR IGNORE INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status)
        VALUES (?, ?, ?, ?, 'assigned')
      `);

      targetCandidateIds.forEach(cId => {
        assignStmt.run(`asg_${examId}_${cId}`, examId, cId, now);
      });
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, 'update_assignments', 'exam', ?, ?, ?)
    `).run('aud_' + crypto.randomUUID().slice(0, 8), admin.id, examId, `${action || 'assign'} ${targetCandidateIds.length} candidate(s) for exam ${exam.code}`, now);

    const totalAssigned = db.prepare('SELECT COUNT(*) as count FROM exam_assignments WHERE exam_id = ?').get(examId) as any;

    return NextResponse.json({
      success: true,
      message: `Successfully updated exam assignments`,
      totalAssigned: totalAssigned.count,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update assignments' }, { status: 500 });
  }
}
