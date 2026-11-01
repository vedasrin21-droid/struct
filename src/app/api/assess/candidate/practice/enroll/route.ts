import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireCandidate } from '@/lib/assess/auth';
import { reserveEntitlement, settleEntitlementReservation } from '@/lib/payments/service';
import crypto from 'node:crypto';

export async function POST(request: Request) {
  try {
    const candidate = await requireCandidate(request);
    const body = await request.json();
    const { examId } = body;

    if (!examId || typeof examId !== 'string') {
      return NextResponse.json({ error: 'Valid examId is required' }, { status: 400 });
    }

    const db = getDb();

    // 1. Verify exam existence, active published status, and public practice configuration
    // Explicit security guard: Never allow enrollment in private organization assessments!
    const exam = await db.queryOne<any>(`
      SELECT id, title, code, status, organization_id, COALESCE(is_practice, 0) as is_practice
      FROM exams
      WHERE id = $1 AND (COALESCE(is_practice, 0) = 1 OR organization_id IS NULL)
    `, [examId]);

    if (!exam) {
      return NextResponse.json({ error: 'Assessment not found or is not a public practice assessment' }, { status: 404 });
    }

    if (exam.status !== 'published') {
      return NextResponse.json({ error: 'This practice assessment is not currently published' }, { status: 403 });
    }

    // 2. Prevent duplicate enrollment
    const existingAssignment = await db.queryOne<any>(
      'SELECT id, status FROM exam_assignments WHERE exam_id = $1 AND candidate_id = $2',
      [examId, candidate.id]
    );

    if (existingAssignment) {
      return NextResponse.json({
        error: 'ALREADY_ENROLLED',
        message: 'You are already enrolled in this practice assessment.',
        assignmentId: existingAssignment.id,
      }, { status: 409 });
    }

    // 3. Prevent duplicate active or completed attempts
    const existingAttempt = await db.queryOne<any>(
      'SELECT id, status FROM attempts WHERE exam_id = $1 AND candidate_id = $2',
      [examId, candidate.id]
    );

    if (existingAttempt) {
      return NextResponse.json({
        error: 'ATTEMPT_EXISTS',
        message: 'An attempt record already exists for this examination.',
        attemptId: existingAttempt.id,
      }, { status: 409 });
    }

    // 4. Server-Side Entitlement Verification & Atomic Two-Phase Reservation
    const referenceId = `practice_enroll_${examId}_${candidate.id}`;
    const reserveRes = await reserveEntitlement({
      email: candidate.email,
      featureType: 'mock_assessment_attempt',
      referenceId,
    });

    if (!reserveRes.success) {
      return NextResponse.json({
        error: 'INSUFFICIENT_ENTITLEMENTS',
        message: 'You have no mock assessment attempts remaining. Please purchase credits or upgrade your plan on your Candidate Hub.',
        remainingBalance: reserveRes.remainingBalance,
      }, { status: 402 });
    }

    // Settle entitlement upon successful enrollment
    await settleEntitlementReservation({
      email: candidate.email,
      featureType: 'mock_assessment_attempt',
      referenceId,
    });

    // 5. Create official exam assignment for this candidate
    const assignmentId = 'ea_prac_' + crypto.randomUUID().slice(0, 10);
    const now = Date.now();

    await db.execute(
      `INSERT INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status)
       VALUES ($1, $2, $3, $4, 'assigned')`,
      [assignmentId, examId, candidate.id, now]
    );

    return NextResponse.json({
      success: true,
      enrolled: true,
      message: `Successfully enrolled in "${exam.title}". You may now start your assessment.`,
      examId: exam.id,
      assignmentId,
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN_CANDIDATE_REQUIRED') {
      return NextResponse.json({ error: 'Candidate access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to enroll in practice assessment' }, { status: 500 });
  }
}
