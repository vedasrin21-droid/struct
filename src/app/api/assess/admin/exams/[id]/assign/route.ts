import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';
import crypto from 'node:crypto';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id: examId } = await context.params;
    const db = getDb();

    const exam = await db.queryOne<any>('SELECT id, title, code, department FROM exams WHERE id = $1', [examId]);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Get all candidates and check if assigned to this exam
    const candResult = await db.query<any>(`
      SELECT 
        u.id, u.name, u.email, u.department, u.college, u.status as user_status,
        ea.id as assignment_id,
        ea.assigned_at,
        ea.status as assignment_status,
        att.id as attempt_id,
        att.status as attempt_status,
        att.score
      FROM users u
      LEFT JOIN exam_assignments ea ON ea.candidate_id = u.id AND ea.exam_id = $1
      LEFT JOIN attempts att ON att.candidate_id = u.id AND att.exam_id = $2
      WHERE u.role = 'candidate'
      ORDER BY u.name ASC
    `, [examId, examId]);

    const deptResult = await db.query<any>("SELECT DISTINCT department FROM users WHERE role = 'candidate' AND department != '' ORDER BY department ASC");
    const colResult = await db.query<any>("SELECT DISTINCT college FROM users WHERE role = 'candidate' AND college != '' ORDER BY college ASC");

    return NextResponse.json({
      exam,
      candidates: candResult.rows.map(c => ({
        ...c,
        isAssigned: Boolean(c.assignment_id),
      })),
      departments: deptResult.rows.map(d => d.department),
      colleges: colResult.rows.map(c => c.college),
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
    const exam = await db.queryOne<any>('SELECT id, title, code FROM exams WHERE id = $1', [examId]);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const now = Date.now();
    let targetCandidateIds: string[] = [];

    if (assignAll) {
      const allCandResult = await db.query<any>("SELECT id FROM users WHERE role = 'candidate' AND status = 'active'");
      targetCandidateIds = allCandResult.rows.map(c => c.id);
    } else if (department) {
      const deptCandResult = await db.query<any>("SELECT id FROM users WHERE role = 'candidate' AND department = $1", [department]);
      targetCandidateIds = deptCandResult.rows.map(c => c.id);
    } else if (college) {
      const colCandResult = await db.query<any>("SELECT id FROM users WHERE role = 'candidate' AND college = $1", [college]);
      targetCandidateIds = colCandResult.rows.map(c => c.id);
    } else if (Array.isArray(candidateIds)) {
      targetCandidateIds = candidateIds;
    }

    if (action === 'unassign') {
      if (targetCandidateIds.length > 0) {
        const placeholders = targetCandidateIds.map((_, i) => `$${i + 2}`).join(',');
        await db.execute(`
          DELETE FROM exam_assignments 
          WHERE exam_id = $1 AND candidate_id IN (${placeholders})
          AND status = 'assigned'
        `, [examId, ...targetCandidateIds]);
      }
    } else {
      // Assign
      for (const cId of targetCandidateIds) {
        await db.execute(`
          INSERT INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status)
          VALUES ($1, $2, $3, $4, 'assigned')
          ON CONFLICT (exam_id, candidate_id) DO NOTHING
        `, [`asg_${examId}_${cId}`, examId, cId, now]);
      }
    }

    // Audit log
    await db.execute(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
      VALUES ($1, $2, 'update_assignments', 'exam', $3, $4, $5)
    `, ['aud_' + crypto.randomUUID().slice(0, 8), admin.id, examId, `${action || 'assign'} ${targetCandidateIds.length} candidate(s) for exam ${exam.code}`, now]);

    const totalAssignedRow = await db.queryOne<any>('SELECT COUNT(*) as count FROM exam_assignments WHERE exam_id = $1', [examId]);

    return NextResponse.json({
      success: true,
      message: `Successfully updated exam assignments`,
      totalAssigned: Number(totalAssignedRow?.count || 0),
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update assignments' }, { status: 500 });
  }
}
