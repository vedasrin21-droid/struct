import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireCandidate } from '@/lib/assess/auth';
import crypto from 'node:crypto';

export async function POST(request: Request) {
  try {
    const candidate = await requireCandidate(request);
    const body = await request.json();
    const { attemptId, examId, eventType, severity, details } = body;

    if (!attemptId || !examId || !eventType) {
      return NextResponse.json({ error: 'Attempt ID, Exam ID, and event type are required' }, { status: 400 });
    }

    const db = getDb();

    // Verify candidate owns this attempt
    const attempt = await db.queryOne<any>(
      'SELECT id, status FROM attempts WHERE id = $1 AND candidate_id = $2',
      [attemptId, candidate.id]
    );
    if (!attempt) {
      return NextResponse.json({ error: 'Invalid attempt reference' }, { status: 403 });
    }

    const eventId = 'ev_' + crypto.randomUUID().slice(0, 8);
    const validSeverity = ['low', 'medium', 'high'].includes(severity) ? severity : 'low';
    const now = Date.now();

    await db.execute(`
      INSERT INTO security_events (id, attempt_id, candidate_id, exam_id, event_type, severity, details, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      eventId,
      attemptId,
      candidate.id,
      examId,
      eventType.slice(0, 50),
      validSeverity,
      details ? String(details).slice(0, 500) : '',
      now
    ]);

    return NextResponse.json({ success: true, eventId, loggedAt: now });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_CANDIDATE_REQUIRED') {
      return NextResponse.json({ error: 'Candidate login required' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }
}
