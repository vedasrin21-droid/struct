import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireCandidate } from '@/lib/assess/auth';
import crypto from 'node:crypto';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const candidate = await requireCandidate(request);
    const { id: examId } = await context.params;
    const db = getDb();

    // 1. Verify exam existence and status
    const exam = await db.queryOne<any>('SELECT * FROM exams WHERE id = $1', [examId]);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (exam.status !== 'published') {
      return NextResponse.json({ error: 'This exam is currently not active or published' }, { status: 403 });
    }

    // 2. Verify candidate assignment
    const assignment = await db.queryOne<any>(
      'SELECT * FROM exam_assignments WHERE exam_id = $1 AND candidate_id = $2',
      [examId, candidate.id]
    );
    if (!assignment) {
      return NextResponse.json({ error: 'You are not assigned to take this examination' }, { status: 403 });
    }

    const now = Date.now();

    // 3. Check existing attempt (single attempt rule)
    const existingAttempt = await db.queryOne<any>(
      'SELECT * FROM attempts WHERE exam_id = $1 AND candidate_id = $2',
      [examId, candidate.id]
    );

    if (existingAttempt) {
      const deadlineTime = Number(existingAttempt.deadline_time);
      if (existingAttempt.status === 'submitted') {
        return NextResponse.json({
          error: 'You have already completed and submitted this examination. Re-attempts are not permitted.',
          attemptId: existingAttempt.id,
          status: 'submitted',
        }, { status: 409 });
      }

      if (now > deadlineTime) {
        // Automatically mark expired if time has elapsed
        await db.execute("UPDATE attempts SET status = 'expired' WHERE id = $1", [existingAttempt.id]);
        await db.execute("UPDATE exam_assignments SET status = 'expired' WHERE exam_id = $1 AND candidate_id = $2", [examId, candidate.id]);
        return NextResponse.json({
          error: 'Your examination window has expired.',
          status: 'expired',
        }, { status: 403 });
      }

      // Return current in-progress attempt
      return NextResponse.json({
        success: true,
        attemptId: existingAttempt.id,
        startTime: Number(existingAttempt.start_time),
        deadlineTime: deadlineTime,
        remainingSeconds: Math.max(0, Math.floor((deadlineTime - now) / 1000)),
        isResumed: true,
      });
    }

    // 4. Create new attempt atomically in a transaction
    const attemptId = 'att_' + crypto.randomUUID().slice(0, 8);
    const deadlineTime = now + (Number(exam.duration_minutes) * 60 * 1000);

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Browser';

    await db.transaction(async (tx) => {
      await tx.execute(`
        INSERT INTO attempts (
          id, exam_id, candidate_id, start_time, deadline_time, status, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'in_progress', $6, $7, $8)
      `, [attemptId, examId, candidate.id, now, deadlineTime, ip, userAgent, now]);

      await tx.execute(
        "UPDATE exam_assignments SET status = 'in_progress' WHERE exam_id = $1 AND candidate_id = $2",
        [examId, candidate.id]
      );

      // Freeze Questions for this Attempt (Mandatory questions MUST be asked; pool questions randomly selected)
      const examQResult = await tx.query<any>(`
        SELECT eq.question_id, eq.order_index, COALESCE(eq.is_mandatory, 0) as is_mandatory
        FROM exam_questions eq
        WHERE eq.exam_id = $1
        ORDER BY eq.order_index ASC
      `, [examId]);

      const examQRows = examQResult.rows;
      const mandatoryQuestions = examQRows.filter(q => Number(q.is_mandatory) === 1);
      const poolQuestions = examQRows.filter(q => Number(q.is_mandatory) !== 1);

      let chosenPool: any[] = poolQuestions;
      const targetRandomCount = Number(exam.random_question_count || 0);

      if (targetRandomCount > 0 && targetRandomCount > mandatoryQuestions.length && poolQuestions.length > 0) {
        const neededFromPool = targetRandomCount - mandatoryQuestions.length;
        const shuffled = [...poolQuestions].sort(() => Math.random() - 0.5);
        chosenPool = shuffled.slice(0, neededFromPool);
      }

      let finalQuestions = [...mandatoryQuestions, ...chosenPool];
      if (exam.shuffle_questions) {
        finalQuestions = finalQuestions.sort(() => Math.random() - 0.5);
      }

      for (let idx = 0; idx < finalQuestions.length; idx++) {
        const q = finalQuestions[idx];
        await tx.execute(`
          INSERT INTO attempt_questions (id, attempt_id, question_id, order_index, is_mandatory)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (attempt_id, question_id) DO NOTHING
        `, [`attq_${attemptId}_${idx}`, attemptId, q.question_id, idx + 1, q.is_mandatory]);
      }
    });

    return NextResponse.json({
      success: true,
      attemptId,
      startTime: now,
      deadlineTime,
      remainingSeconds: Math.floor((deadlineTime - now) / 1000),
      isResumed: false,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_CANDIDATE_REQUIRED') {
      return NextResponse.json({ error: 'Candidate login required' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to start examination' }, { status: 500 });
  }
}
