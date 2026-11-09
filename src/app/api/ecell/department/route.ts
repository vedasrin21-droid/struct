import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/assess/auth';
import { getDb } from '@/lib/assess/db';

const ECELL_EXAM_ID = 'exam_ecell_round1_2026';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { department } = body;

    if (!department || typeof department !== 'string') {
      return NextResponse.json({ error: 'Valid department selection is required' }, { status: 400 });
    }

    const cleanDept = department.trim().toUpperCase();
    const db = getDb();

    // Verify department exists in active departments
    const deptRecord = await db.queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM ecell_departments WHERE UPPER(code) = $1 AND is_active = 1',
      [cleanDept]
    );

    if (!deptRecord) {
      return NextResponse.json({ error: 'Selected department is invalid or not active' }, { status: 400 });
    }

    // Check if an attempt already exists for this candidate
    const existingAttempt = await db.queryOne<{ id: string; status: string; department: string }>(
      'SELECT id, status, department FROM attempts WHERE candidate_id = $1 AND exam_id = $2',
      [user.id, ECELL_EXAM_ID]
    );

    if (existingAttempt) {
      return NextResponse.json(
        {
          error: `Department selection is locked to "${existingAttempt.department}" because an examination attempt already exists.`,
          locked: true,
          department: existingAttempt.department,
        },
        { status: 403 }
      );
    }

    // Update candidate's chosen department in users table
    await db.execute('UPDATE users SET department = $1 WHERE id = $2', [cleanDept, user.id]);

    return NextResponse.json({
      success: true,
      department: cleanDept,
      departmentName: deptRecord.name,
      message: 'Department selected successfully',
    });
  } catch (error: any) {
    console.error('[ECELL Department POST Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to save department' }, { status: 500 });
  }
}
