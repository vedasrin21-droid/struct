import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
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
    `;
    const params: any[] = [];

    // Enforce organization scoping if not super_admin
    if (authCtx?.role !== 'super_admin' && authCtx?.organizationId) {
      params.push(authCtx.organizationId);
      sql += ` WHERE (e.organization_id = $${params.length} OR e.organization_id IS NULL)`;
    }

    sql += `
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `;

    const result = await db.query<any>(sql, params);
    return NextResponse.json({ exams: result.rows });
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
    const authCtx = await getAuthContext(request);
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
      authMode = 'exam_only',
      accessScope = 'single',
      maxAttempts = 1,
      organizationId,
    } = body;

    if (!title || !code) {
      return NextResponse.json({ error: 'Exam title and unique code are required' }, { status: 400 });
    }

    const db = getDb();

    const existingCode = await db.queryOne<{ id: string }>(
      'SELECT id FROM exams WHERE LOWER(code) = LOWER($1)',
      [code.trim()]
    );
    if (existingCode) {
      return NextResponse.json({ error: `An exam with code "${code}" already exists` }, { status: 409 });
    }

    const examId = 'exam_' + crypto.randomUUID().slice(0, 8);
    const now = Date.now();
    const duration = durationMinutes ? parseInt(durationMinutes, 10) : 15;
    const passThreshold = passMarks ? parseFloat(passMarks) : 6.0;

    // Organization scoping: use admin's org or provided org
    const targetOrgId = organizationId || authCtx?.organizationId || null;

    // Determine questions to attach
    let selectedQuestionIds: string[] = [];
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      selectedQuestionIds = questionIds;
    } else if (randomizeFromCategory && randomCount) {
      const isAll = randomizeFromCategory === 'ALL';
      const qQuery = isAll
        ? 'SELECT id FROM questions ORDER BY RANDOM() LIMIT $1'
        : 'SELECT id FROM questions WHERE category = $1 ORDER BY RANDOM() LIMIT $2';
      const qParams = isAll ? [parseInt(randomCount, 10)] : [randomizeFromCategory, parseInt(randomCount, 10)];
      const randomQResult = await db.query<any>(qQuery, qParams);
      selectedQuestionIds = randomQResult.rows.map(r => r.id);
    } else {
      // Default: pick up to 10 available questions
      const allQ = await db.query<any>('SELECT id FROM questions ORDER BY created_at ASC LIMIT 10');
      selectedQuestionIds = allQ.rows.map(q => q.id);
    }

    if (selectedQuestionIds.length === 0) {
      return NextResponse.json({ error: 'At least 1 question is required to create an exam' }, { status: 400 });
    }

    // Calculate total marks based on attached questions
    const marksPlaceholders = selectedQuestionIds.map((_, i) => `$${i + 1}`).join(',');
    const marksSumRow = await db.queryOne<any>(`
      SELECT SUM(marks) as total_marks 
      FROM questions 
      WHERE id IN (${marksPlaceholders})
    `, selectedQuestionIds);

    const totalMarks = marksSumRow?.total_marks ? parseFloat(marksSumRow.total_marks) : selectedQuestionIds.length;

    await db.transaction(async (tx) => {
      await tx.execute(`
        INSERT INTO exams (
          id, organization_id, title, code, description, department, duration_minutes, pass_marks, total_marks,
          negative_marking_enabled, shuffle_questions, allow_back_navigation, show_answer_key,
          random_question_count, enable_fullscreen, enable_ai_defense, enable_anti_google,
          auth_mode, access_scope, max_attempts,
          status, results_released, instructions, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15, $16, $17,
          $18, $19, $20,
          'draft', 0, $21, $22, $23
        )
      `, [
        examId,
        targetOrgId,
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
        ['clerk', 'exam_only', 'both'].includes(authMode) ? authMode : 'exam_only',
        ['single', 'multiple'].includes(accessScope) ? accessScope : 'single',
        Math.max(1, parseInt(maxAttempts, 10) || 1),
        instructions || '1. Read all questions carefully.\n2. Answers autosave automatically.\n3. Switching tabs will trigger security telemetry logs.',
        now,
        now
      ]);

      // Link Questions with mandatory flag
      const mandatorySet = new Set(Array.isArray(mandatoryQuestionIds) ? mandatoryQuestionIds : []);
      for (let idx = 0; idx < selectedQuestionIds.length; idx++) {
        const qId = selectedQuestionIds[idx];
        const qRow = await tx.queryOne<any>('SELECT is_mandatory FROM questions WHERE id = $1', [qId]);
        const isMandatory = mandatorySet.has(qId) || (qRow && Number(qRow.is_mandatory) === 1) ? 1 : 0;
        await tx.execute(`
          INSERT INTO exam_questions (id, exam_id, question_id, order_index, is_mandatory)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (exam_id, question_id) DO NOTHING
        `, [`eq_${examId}_${idx}`, examId, qId, idx + 1, isMandatory]);
      }

      // Assign candidates
      if (Array.isArray(candidateIds) && candidateIds.length > 0) {
        for (const cId of candidateIds) {
          await tx.execute(`
            INSERT INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status)
            VALUES ($1, $2, $3, $4, 'assigned')
            ON CONFLICT (exam_id, candidate_id) DO NOTHING
          `, [`asg_${examId}_${cId}`, examId, cId, now]);
        }
      } else if (assignDepartment) {
        const isAllDept = assignDepartment === 'ALL';
        const deptQuery = isAllDept
          ? "SELECT id FROM users WHERE role = 'candidate'"
          : "SELECT id FROM users WHERE role = 'candidate' AND department = $1";
        const deptParams = isAllDept ? [] : [assignDepartment];
        const deptCandidates = await tx.query<any>(deptQuery, deptParams);
        for (const c of deptCandidates.rows) {
          await tx.execute(`
            INSERT INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status)
            VALUES ($1, $2, $3, $4, 'assigned')
            ON CONFLICT (exam_id, candidate_id) DO NOTHING
          `, [`asg_${examId}_${c.id}`, examId, c.id, now]);
        }
      }

      // Record administrative audit log
      await tx.execute(`
        INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
        VALUES ($1, $2, 'create_exam', 'exam', $3, $4, $5)
      `, ['aud_' + crypto.randomUUID().slice(0, 8), admin.id, examId, `Created exam ${title} (${code})`, now]);
    });

    return NextResponse.json({
      success: true,
      examId,
      code: code.trim().toUpperCase(),
      questionsCount: selectedQuestionIds.length,
      totalMarks,
      authMode,
      accessScope,
      organizationId: targetOrgId,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create exam' }, { status: 500 });
  }
}
