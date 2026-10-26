import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';
import crypto from 'node:crypto';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = getDb();

    const exams = db.prepare(`
      SELECT 
        e.*,
        COUNT(DISTINCT eq.question_id) as questions_count,
        COUNT(DISTINCT ea.candidate_id) as candidates_count,
        COUNT(DISTINCT att.id) as attempts_count,
        AVG(att.score) as avg_score,
        SUM(CASE WHEN att.pass_status = 'passed' THEN 1 ELSE 0 END) as passed_count
      FROM exams e
      LEFT JOIN exam_questions eq ON eq.exam_id = e.id
      LEFT JOIN exam_assignments ea ON ea.exam_id = e.id
      LEFT JOIN attempts att ON att.exam_id = e.id AND att.status = 'submitted'
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `).all() as any[];

    return NextResponse.json({ exams });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const {
      title,
      code,
      description,
      department,
      durationMinutes,
      passMarks,
      negativeMarkingEnabled,
      shuffleQuestions,
      allowBackNavigation,
      showAnswerKey,
      randomQuestionCount,
      enableFullscreen,
      enableAiDefense,
      instructions,
      questionIds,
      mandatoryQuestionIds,
      randomizeFromCategory,
      randomCount,
      candidateIds,
      assignDepartment,
      assignCollege,
    } = body;

    if (!title || !code) {
      return NextResponse.json({ error: 'Exam title and unique code are required' }, { status: 400 });
    }

    const db = getDb();

    const existingCode = db.prepare('SELECT id FROM exams WHERE code = ? COLLATE NOCASE').get(code.trim());
    if (existingCode) {
      return NextResponse.json({ error: `An exam with code "${code}" already exists` }, { status: 409 });
    }

    const examId = 'exam_' + crypto.randomUUID().slice(0, 8);
    const now = Date.now();
    const duration = durationMinutes ? parseInt(durationMinutes, 10) : 15;
    const passThreshold = passMarks ? parseFloat(passMarks) : 6.0;

    // Determine questions to attach
    let selectedQuestionIds: string[] = [];
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      selectedQuestionIds = questionIds;
    } else if (randomizeFromCategory && randomCount) {
      const randomQRows = db.prepare(`
        SELECT id FROM questions 
        WHERE (? = 'ALL' OR category = ?)
        ORDER BY RANDOM() 
        LIMIT ?
      `).all(randomizeFromCategory, randomizeFromCategory, parseInt(randomCount, 10)) as any[];
      selectedQuestionIds = randomQRows.map(r => r.id);
    } else {
      // Default: pick up to 10 available questions
      const allQ = db.prepare('SELECT id FROM questions ORDER BY created_at ASC LIMIT 10').all() as any[];
      selectedQuestionIds = allQ.map(q => q.id);
    }

    if (selectedQuestionIds.length === 0) {
      return NextResponse.json({ error: 'At least 1 question is required to create an exam' }, { status: 400 });
    }

    // Calculate total marks based on attached questions
    const marksSumRow = db.prepare(`
      SELECT SUM(marks) as total_marks 
      FROM questions 
      WHERE id IN (${selectedQuestionIds.map(() => '?').join(',')})
    `).get(...selectedQuestionIds) as any;

    const totalMarks = marksSumRow?.total_marks || selectedQuestionIds.length;

    db.prepare(`
      INSERT INTO exams (
        id, title, code, description, department, duration_minutes, pass_marks, total_marks,
        negative_marking_enabled, shuffle_questions, allow_back_navigation, show_answer_key,
        random_question_count, enable_fullscreen, enable_ai_defense, enable_anti_google,
        status, results_released, instructions, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, ?, ?, ?)
    `).run(
      examId,
      title.trim(),
      code.trim().toUpperCase(),
      description || '',
      department || 'General',
      duration,
      passThreshold,
      totalMarks,
      negativeMarkingEnabled === undefined || negativeMarkingEnabled ? 1 : 0,
      shuffleQuestions === undefined || shuffleQuestions ? 1 : 0,
      allowBackNavigation === undefined || allowBackNavigation ? 1 : 0,
      showAnswerKey === undefined || showAnswerKey ? 1 : 0,
      randomQuestionCount ? parseInt(randomQuestionCount, 10) : 0,
      enableFullscreen === undefined || enableFullscreen ? 1 : 0,
      enableAiDefense === undefined || enableAiDefense ? 1 : 0,
      body.enableAntiGoogle === undefined || body.enableAntiGoogle ? 1 : 0,
      instructions || '1. Read all questions carefully.\n2. Answers autosave automatically.\n3. Switching tabs will trigger security telemetry logs.',
      now,
      now
    );

    // Link Questions with mandatory flag
    const mandatorySet = new Set(Array.isArray(mandatoryQuestionIds) ? mandatoryQuestionIds : []);
    const linkStmt = db.prepare(`
      INSERT INTO exam_questions (id, exam_id, question_id, order_index, is_mandatory)
      VALUES (?, ?, ?, ?, ?)
    `);
    selectedQuestionIds.forEach((qId, idx) => {
      // Check if question itself is flagged as mandatory or specified in request
      const qRow = db.prepare('SELECT is_mandatory FROM questions WHERE id = ?').get(qId) as any;
      const isMandatory = mandatorySet.has(qId) || (qRow && qRow.is_mandatory) ? 1 : 0;
      linkStmt.run(`eq_${examId}_${idx}`, examId, qId, idx + 1, isMandatory);
    });

    // Assign candidates
    const assignStmt = db.prepare(`
      INSERT OR IGNORE INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status)
      VALUES (?, ?, ?, ?, 'assigned')
    `);

    if (Array.isArray(candidateIds) && candidateIds.length > 0) {
      candidateIds.forEach(cId => {
        assignStmt.run(`asg_${examId}_${cId}`, examId, cId, now);
      });
    } else if (assignDepartment) {
      const deptCandidates = db.prepare(`
        SELECT id FROM users 
        WHERE role = 'candidate' AND (? = 'ALL' OR department = ?)
      `).all(assignDepartment, assignDepartment) as any[];
      deptCandidates.forEach(c => {
        assignStmt.run(`asg_${examId}_${c.id}`, examId, c.id, now);
      });
    }

    // Log admin audit
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, 'create_exam', 'exam', ?, ?, ?)
    `).run('aud_' + crypto.randomUUID().slice(0, 8), admin.id, examId, `Created exam ${title} (${code})`, now);

    return NextResponse.json({
      success: true,
      exam: {
        id: examId,
        title,
        code: code.trim().toUpperCase(),
        questionsCount: selectedQuestionIds.length,
        totalMarks,
        durationMinutes: duration,
        status: 'draft',
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create exam' }, { status: 500 });
  }
}
