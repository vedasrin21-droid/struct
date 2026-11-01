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
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (difficulty) {
      params.push(difficulty);
      query += ` AND difficulty = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      const p1 = params.length;
      params.push(`%${search}%`);
      const p2 = params.length;
      query += ` AND (text ILIKE $${p1} OR category ILIKE $${p2})`;
    }

    query += ' ORDER BY created_at DESC';

    const rawResult = await db.query<any>(query, params);
    const questions = rawResult.rows.map(q => ({
      ...q,
      options: JSON.parse(q.options_json),
    }));

    // Categories list for filter dropdown
    const catResult = await db.query<any>('SELECT DISTINCT category FROM questions ORDER BY category ASC');

    return NextResponse.json({
      questions,
      categories: catResult.rows.map(c => c.category),
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

    await db.execute(`
      INSERT INTO questions (
        id, text, category, difficulty, marks, negative_marks, explanation,
        options_json, correct_option_index, is_mandatory, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
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
    ]);

    await db.execute(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
      VALUES ($1, $2, 'create_question', 'question', $3, $4, $5)
    `, ['aud_' + crypto.randomUUID().slice(0, 8), admin.id, qId, `Created question in ${category}`, now]);

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
    return NextResponse.json({ error: error.message || 'Failed to create question' }, { status: 500 });
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
    const activeUsage = await db.queryOne<any>(`
      SELECT e.title 
      FROM exam_questions eq
      JOIN exams e ON e.id = eq.exam_id
      WHERE eq.question_id = $1 AND e.status = 'published'
      LIMIT 1
    `, [id]);

    if (activeUsage) {
      return NextResponse.json({
        error: `Cannot delete question: it is assigned to the active exam "${activeUsage.title}". Please unassign or close the exam first.`
      }, { status: 409 });
    }

    await db.execute('DELETE FROM questions WHERE id = $1', [id]);

    await db.execute(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
      VALUES ($1, $2, 'delete_question', 'question', $3, 'Deleted question', $4)
    `, ['aud_' + crypto.randomUUID().slice(0, 8), admin.id, id, Date.now()]);

    return NextResponse.json({ success: true, message: 'Question deleted successfully' });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
