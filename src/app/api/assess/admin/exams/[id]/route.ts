import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';
import crypto from 'node:crypto';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const db = getDb();

    const exam = await db.queryOne<any>('SELECT * FROM exams WHERE id = $1', [id]);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const qResult = await db.query<any>(`
      SELECT q.*, eq.order_index
      FROM exam_questions eq
      JOIN questions q ON q.id = eq.question_id
      WHERE eq.exam_id = $1
      ORDER BY eq.order_index ASC
    `, [id]);
    const questions = qResult.rows;

    const candResult = await db.query<any>(`
      SELECT 
        u.id, u.name, u.email, u.department, u.college,
        ea.assigned_at, ea.status as assignment_status,
        att.id as attempt_id, att.score, att.pass_status, att.status as attempt_status,
        att.start_time, att.submitted_at
      FROM exam_assignments ea
      JOIN users u ON u.id = ea.candidate_id
      LEFT JOIN attempts att ON att.exam_id = ea.exam_id AND att.candidate_id = u.id
      WHERE ea.exam_id = $1
      ORDER BY u.name ASC
    `, [id]);
    const candidates = candResult.rows;

    return NextResponse.json({
      exam: {
        ...exam,
        questions: questions.map(q => ({
          ...q,
          options: JSON.parse(q.options_json),
        })),
        candidates,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch exam details' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    const body = await request.json();
    const {
      status,
      title,
      description,
      durationMinutes,
      passMarks,
      instructions,
      allowBackNavigation,
      showAnswerKey,
      enableFullscreen,
      enableAiDefense,
      randomQuestionCount,
    } = body;

    const db = getDb();
    const exam = await db.queryOne<any>('SELECT * FROM exams WHERE id = $1', [id]);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Status transition validation
    if (status && !['draft', 'published', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid exam status' }, { status: 400 });
    }

    const newStatus = status || exam.status;
    const newTitle = title || exam.title;
    const newDesc = description !== undefined ? description : exam.description;
    const newDuration = durationMinutes ? parseInt(durationMinutes, 10) : exam.duration_minutes;
    const newPassMarks = passMarks !== undefined ? parseFloat(passMarks) : exam.pass_marks;
    const newInstructions = instructions !== undefined ? instructions : exam.instructions;
    const newAllowBack = allowBackNavigation !== undefined ? (allowBackNavigation ? 1 : 0) : exam.allow_back_navigation;
    const newShowAnsKey = showAnswerKey !== undefined ? (showAnswerKey ? 1 : 0) : exam.show_answer_key;
    const newFullscreen = enableFullscreen !== undefined ? (enableFullscreen ? 1 : 0) : exam.enable_fullscreen;
    const newAiDefense = enableAiDefense !== undefined ? (enableAiDefense ? 1 : 0) : exam.enable_ai_defense;
    const newAntiGoogle = body.enableAntiGoogle !== undefined ? (body.enableAntiGoogle ? 1 : 0) : (exam.enable_anti_google !== undefined ? exam.enable_anti_google : 1);
    const newRandomCount = randomQuestionCount !== undefined ? parseInt(randomQuestionCount, 10) : (exam.random_question_count || 0);
    const now = Date.now();

    await db.execute(`
      UPDATE exams 
      SET status = $1, title = $2, description = $3, duration_minutes = $4, pass_marks = $5, instructions = $6,
          allow_back_navigation = $7, show_answer_key = $8, enable_fullscreen = $9, enable_ai_defense = $10, enable_anti_google = $11, random_question_count = $12,
          updated_at = $13
      WHERE id = $14
    `, [
      newStatus, newTitle, newDesc, newDuration, newPassMarks, newInstructions,
      newAllowBack, newShowAnsKey, newFullscreen, newAiDefense, newAntiGoogle, newRandomCount,
      now, id
    ]);

    await db.execute(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
      VALUES ($1, $2, 'update_exam', 'exam', $3, $4, $5)
    `, ['aud_' + crypto.randomUUID().slice(0, 8), admin.id, id, `Updated exam to status=${newStatus}`, now]);

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update exam' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    const db = getDb();

    // Prevent deletion if students have already attempted the exam
    const hasAttempts = await db.queryOne('SELECT id FROM attempts WHERE exam_id = $1 LIMIT 1', [id]);
    if (hasAttempts) {
      return NextResponse.json({
        error: 'Cannot delete exam with existing candidate submissions. You can set the status to "closed" instead.'
      }, { status: 409 });
    }

    await db.execute('DELETE FROM exams WHERE id = $1', [id]);

    await db.execute(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
      VALUES ($1, $2, 'delete_exam', 'exam', $3, 'Deleted exam', $4)
    `, ['aud_' + crypto.randomUUID().slice(0, 8), admin.id, id, Date.now()]);

    return NextResponse.json({ success: true, message: 'Exam deleted successfully' });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete exam' }, { status: 500 });
  }
}
