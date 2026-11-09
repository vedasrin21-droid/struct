import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/assess/auth';
import { getDb } from '@/lib/assess/db';
import crypto from 'node:crypto';

const ECELL_EXAM_ID = 'exam_ecell_round1_2026';
const EXAM_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required to start examination' }, { status: 401 });
    }

    const db = getDb();
    const now = Date.now();

    // 1. Verify examination exists and is open
    const exam = await db.queryOne<{ id: string; title: string; status: string; duration_minutes: number }>(
      'SELECT id, title, status, duration_minutes FROM exams WHERE id = $1',
      [ECELL_EXAM_ID]
    );

    if (!exam) {
      return NextResponse.json({ error: 'ECELL Examination record not found' }, { status: 404 });
    }

    if (exam.status === 'closed') {
      return NextResponse.json(
        { error: 'This examination is currently closed by the administrators.' },
        { status: 403 }
      );
    }

    // 2. Check if an attempt already exists
    const existingAttempt = await db.queryOne<{
      id: string;
      status: string;
      department: string;
      start_time: number | bigint;
      deadline_time: number | bigint;
    }>('SELECT id, status, department, start_time, deadline_time FROM attempts WHERE candidate_id = $1 AND exam_id = $2', [
      user.id,
      ECELL_EXAM_ID,
    ]);

    if (existingAttempt) {
      const deadline = Number(existingAttempt.deadline_time);
      const remainingSeconds = Math.max(0, Math.floor((deadline - now) / 1000));

      if (existingAttempt.status === 'submitted' || remainingSeconds <= 0) {
        if (existingAttempt.status !== 'submitted') {
          await db.execute(
            `UPDATE attempts SET status = 'submitted', submitted_at = $1 WHERE id = $2`,
            [now, existingAttempt.id]
          );
        }
        return NextResponse.json(
          {
            error: 'You have already submitted your examination. Multiple attempts are strictly prohibited.',
            isSubmitted: true,
            attemptId: existingAttempt.id,
          },
          { status: 403 }
        );
      }

      // Resume existing in-progress attempt
      return NextResponse.json({
        success: true,
        attemptId: existingAttempt.id,
        remainingSeconds,
        department: existingAttempt.department,
        message: 'Resuming existing examination attempt',
      });
    }

    // 3. Verify user has selected a valid department
    const userRecord = await db.queryOne<{ department: string }>(
      'SELECT department FROM users WHERE id = $1',
      [user.id]
    );

    const chosenDept = userRecord?.department?.trim().toUpperCase();
    if (!chosenDept) {
      return NextResponse.json(
        { error: 'Please select your department before starting the examination.', needsDepartment: true },
        { status: 400 }
      );
    }

    const deptValid = await db.queryOne<{ id: string }>(
      'SELECT id FROM ecell_departments WHERE UPPER(code) = $1 AND is_active = 1',
      [chosenDept]
    );

    if (!deptValid) {
      return NextResponse.json(
        { error: `Department "${chosenDept}" is invalid. Please select an active department.`, needsDepartment: true },
        { status: 400 }
      );
    }

    // 4. Select exactly 20 questions atomically:
    // 15 Department-specific questions + 5 Entrepreneurship questions
    const deptResult = await db.query<{ id: string }>(
      `SELECT id FROM questions WHERE category = $1 AND question_type = 'department' ORDER BY RANDOM() LIMIT 15`,
      [chosenDept]
    );

    const entResult = await db.query<{ id: string }>(
      `SELECT id FROM questions WHERE question_type = 'entrepreneurship' ORDER BY RANDOM() LIMIT 5`
    );

    const deptIds = deptResult.rows.map((r) => r.id);
    const entIds = entResult.rows.map((r) => r.id);

    let selectedQuestionIds: string[] = [...deptIds, ...entIds];

    if (selectedQuestionIds.length < 20) {
      console.warn(
        `[ECELL Start] Shortfall in questions for ${chosenDept}: dept=${deptResult.rowCount}, ent=${entResult.rowCount}. Backfilling with available questions.`
      );
      // Backfill with other available questions if needed so candidate is never blocked
      const backfill = await db.query<{ id: string }>(
        `SELECT id FROM questions WHERE id NOT IN (${selectedQuestionIds.map((_, i) => `$${i + 1}`).join(',')}) ORDER BY RANDOM() LIMIT ${20 - selectedQuestionIds.length}`,
        selectedQuestionIds.length > 0 ? selectedQuestionIds : []
      );
      for (const row of backfill.rows) {
        selectedQuestionIds.push(row.id);
      }
    }

    // Shuffle the combined 20 questions (Fisher-Yates) for unpredictability
    for (let i = selectedQuestionIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selectedQuestionIds[i], selectedQuestionIds[j]] = [selectedQuestionIds[j], selectedQuestionIds[i]];
    }

    // 5. Create attempt record with unique constraint guard
    const attemptId = 'att_' + crypto.randomUUID();
    const deadlineTime = now + EXAM_DURATION_MS;

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';

    try {
      await db.execute(
        `INSERT INTO attempts (
          id, exam_id, candidate_id, start_time, deadline_time, status, department,
          ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'in_progress', $6, $7, $8, $9)`,
        [
          attemptId,
          ECELL_EXAM_ID,
          user.id,
          now,
          deadlineTime,
          chosenDept,
          ipAddress,
          userAgent,
          now,
        ]
      );
    } catch (insertErr: any) {
      // If a race condition caused duplicate attempt creation, fetch the winning attempt
      if (insertErr?.message && (insertErr.message.includes('unique') || insertErr.message.includes('duplicate'))) {
        const raceAttempt = await db.queryOne<{ id: string; deadline_time: number | bigint }>(
          'SELECT id, deadline_time FROM attempts WHERE candidate_id = $1 AND exam_id = $2',
          [user.id, ECELL_EXAM_ID]
        );
        if (raceAttempt) {
          const remSec = Math.max(0, Math.floor((Number(raceAttempt.deadline_time) - now) / 1000));
          return NextResponse.json({
            success: true,
            attemptId: raceAttempt.id,
            remainingSeconds: remSec,
            department: chosenDept,
          });
        }
      }
      throw insertErr;
    }

    // 6. Freeze the question set in attempt_questions
    let order = 1;
    for (const qId of selectedQuestionIds) {
      await db.execute(
        `INSERT INTO attempt_questions (id, attempt_id, question_id, order_index, is_mandatory)
         VALUES ($1, $2, $3, $4, 0)
         ON CONFLICT (attempt_id, question_id) DO NOTHING`,
        [`atq_${attemptId}_${order}`, attemptId, qId, order]
      );
      order++;
    }

    // 7. Update exam_assignments status to in_progress
    await db.execute(
      `INSERT INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status)
       VALUES ($1, $2, $3, $4, 'in_progress')
       ON CONFLICT (exam_id, candidate_id) DO UPDATE SET status = 'in_progress'`,
      [`asg_${ECELL_EXAM_ID}_${user.id}`, ECELL_EXAM_ID, user.id, now]
    );

    return NextResponse.json({
      success: true,
      attemptId,
      remainingSeconds: 900,
      department: chosenDept,
      totalQuestions: selectedQuestionIds.length,
    });
  } catch (error: any) {
    console.error('[ECELL Attempt Start Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to start examination attempt' }, { status: 500 });
  }
}
