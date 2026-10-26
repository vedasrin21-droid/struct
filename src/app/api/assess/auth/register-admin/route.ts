import { NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/assess/db';
import crypto from 'node:crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, setupCode } = body;

    const expectedSetupCode = process.env.ASSESS_ADMIN_SETUP_CODE || 'Talvyn@Assess2026!';
    if (!setupCode || setupCode !== expectedSetupCode) {
      return NextResponse.json({ error: 'Invalid administrator setup authorization code' }, { status: 403 });
    }

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email.trim());
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const userId = 'usr_admin_' + crypto.randomUUID().slice(0, 8);
    const { hash, salt } = hashPassword(password);
    const now = Date.now();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, role, name, department, created_at)
      VALUES (?, ?, ?, ?, 'admin', ?, 'Administration', ?)
    `).run(userId, email.trim(), hash, salt, name.trim(), now);

    return NextResponse.json({
      success: true,
      message: 'Administrator account registered successfully. You may now log in.',
    });
  } catch (error: any) {
    console.error('Register admin error:', error);
    return NextResponse.json({ error: 'Failed to register administrator' }, { status: 500 });
  }
}
