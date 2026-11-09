import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import crypto from 'node:crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, college } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || '').trim().slice(0, 100);
    const cleanCollege = (college || '').trim().slice(0, 150);
    const db = getDb();
    const now = Date.now();

    // Check if already subscribed
    const existing = await db.queryOne<{ id: string; email: string }>(
      'SELECT id, email FROM waitlist_subscribers WHERE LOWER(email) = LOWER($1)',
      [cleanEmail]
    );

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyJoined: true,
        message: 'You are already on the priority launch waitlist! We will notify you on November 16, 2026.',
      });
    }

    const id = 'wtl_' + crypto.randomUUID();
    await db.execute(
      `INSERT INTO waitlist_subscribers (id, email, name, college, source, created_at)
       VALUES ($1, $2, $3, $4, 'launch_page', $5)
       ON CONFLICT (LOWER(email)) DO NOTHING`,
      [id, cleanEmail, cleanName, cleanCollege, now]
    );

    return NextResponse.json({
      success: true,
      message: 'Welcome to the STRUCT Launch Waitlist! You will receive early access on 16 November 2026.',
    });
  } catch (error: any) {
    console.error('[Waitlist POST Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to join waitlist' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDb();
    const countResult = await db.queryOne<{ count: string | number }>(
      'SELECT count(*) as count FROM waitlist_subscribers'
    );
    return NextResponse.json({
      success: true,
      totalSubscribers: Number(countResult?.count || 0),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch waitlist count' }, { status: 500 });
  }
}
