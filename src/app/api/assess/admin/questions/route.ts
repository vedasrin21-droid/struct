import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';
import crypto from 'node:crypto';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = getDb();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const search = searchParams.get('search');

    let query = 'SELECT * FROM questions WHERE 1=1';
    const params: any[] = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (difficulty) {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }
    if (search) {
      query += ' AND (text LIKE ? OR category LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const rawQuestions = db.prepare(query).all(...params) as any[];

    const questions = rawQuestions.map(q => ({
      ...q,
      options: JSON.parse(q.options_json),
    }));

    // Categories list for filter dropdown
    const categories = db.prepare('SELECT DISTINCT category FROM questions ORDER BY category ASC').all() as any[];

    return NextResponse.json({
      questions,
      categories: categories.map(c => c.category),
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const { text, category, difficulty, marks, negativeMarks, explanation, options, correctOptionIndex, isMandatory } = body;

    if (!text || !category || !options || !Array.isArray(options) || options.length !== 4) {
      return NextResponse.json({ error: 'Question text, category, and exactly 4 options are required' }, { status: 400 });
    }

    if (correctOptionIndex === undefined || correctOptionIndex < 0 || correctOptionIndex > 3) {
      return NextResponse.json({ error: 'Valid correct option index (0 to 3) is required' }, { status: 400 });
    }

    const db = getDb();
    const qId = 'q_' + crypto.randomUUID().slice(0, 8);
    const now = Date.now();

    db.prepare(`
      INSERT INTO questions (
        id, text, category, difficulty, marks, negative_marks, explanation,
        options_json, correct_option_index, is_mandatory, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      qId,
      text.trim(),
      category.trim(),
      ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
      marks !== undefined ? Number(marks) : 1.0,
      negativeMarks !== undefined ? Number(negativeMarks) : 0.25,
      explanation ? explanation.trim() : '',
      JSON.stringify(options.map(o => String(o).trim())),
      Number(correctOptionIndex),
      isMandatory ? 1 : 0,
      now
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, 'create_question', 'question', ?, ?, ?)
    `).run('aud_' + crypto.randomUUID().slice(0, 8), admin.id, qId, `Created question in ${category}`, now);

    return NextResponse.json({
      success: true,
      question: {
        id: qId,
        text,
        category,
        difficulty,
        marks: marks || 1.0,
        negative_marks: negativeMarks || 0.25,
        explanation: explanation || '',
        options,
        correct_option_index: correctOptionIndex,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    const db = getDb();

    // Check if question is used in any published or in-progress exam
    const activeUsage = db.prepare(`
      SELECT e.title 
      FROM exam_questions eq
      JOIN exams e ON e.id = eq.exam_id
      WHERE eq.question_id = ? AND e.status = 'published'
      LIMIT 1
    `).get(id) as any;

    if (activeUsage) {
      return NextResponse.json({
        error: `Cannot delete question: it is assigned to the active exam "${activeUsage.title}". Please unassign or close the exam first.`
      }, { status: 409 });
    }

    db.prepare('DELETE FROM questions WHERE id = ?').run(id);

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, 'delete_question', 'question', ?, 'Deleted question', ?)
    `).run('aud_' + crypto.randomUUID().slice(0, 8), admin.id, id, Date.now());

    return NextResponse.json({ success: true, message: 'Question deleted successfully' });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
