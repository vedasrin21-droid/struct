import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireOrgAdmin } from '@/lib/auth/rbac';
import { sendOrganizationInvite } from '@/lib/email/resend';
import crypto from 'node:crypto';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const targetOrgId = url.searchParams.get('orgId') || undefined;
    const authCtx = await requireOrgAdmin(request, targetOrgId);
    const db = getDb();

    const members = await db.query(
      `SELECT om.id, om.role, om.created_at, u.id as user_id, u.email, u.name, u.status
       FROM organization_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1
       ORDER BY om.created_at ASC`,
      [authCtx.organizationId]
    );

    return NextResponse.json({
      success: true,
      members: members.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list organization members' }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role = 'member', orgId: bodyOrgId } = body;
    const url = new URL(request.url);
    const targetOrgId = url.searchParams.get('orgId') || bodyOrgId || undefined;
    const authCtx = await requireOrgAdmin(request, targetOrgId);

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();

    // Check if user already exists
    const user = await db.queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM users WHERE LOWER(email) = LOWER($1)',
      [normalizedEmail]
    );

    const now = Date.now();
    let userId = user?.id;

    if (!userId) {
      // Create user placeholder for invited member
      userId = 'usr_' + crypto.randomUUID().slice(0, 8);
      await db.execute(
        `INSERT INTO users (id, email, password_hash, salt, role, name, created_at)
         VALUES ($1, $2, '', '', 'admin', $3, $4)`,
        [userId, normalizedEmail, normalizedEmail.split('@')[0], now]
      );
    }

    // Check if already member
    const existingMember = await db.queryOne(
      'SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [authCtx.organizationId, userId]
    );

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 409 });
    }

    const memberId = 'mem_' + crypto.randomUUID().slice(0, 8);
    await db.execute(
      `INSERT INTO organization_members (id, organization_id, user_id, role, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [memberId, authCtx.organizationId, userId, role === 'admin' ? 'admin' : 'member', now]
    );

    // Fetch org name for invitation email
    const org = await db.queryOne<{ name: string }>(
      'SELECT name FROM organizations WHERE id = $1',
      [authCtx.organizationId]
    );

    // Send transactional invite email via Resend
    await sendOrganizationInvite({
      toEmail: normalizedEmail,
      inviterName: authCtx.name,
      organizationName: org?.name || 'STRUCT Organization',
      role,
      inviteUrl: `${url.origin}/assess/admin?orgId=${authCtx.organizationId}`,
    });

    return NextResponse.json({
      success: true,
      member: {
        id: memberId,
        userId,
        email: normalizedEmail,
        role,
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (err.message.includes('FORBIDDEN') || err.message.includes('EXAM_ONLY')) {
      return NextResponse.json({ error: 'Forbidden: Organization admin privileges required' }, { status: 403 });
    }
    return NextResponse.json({ error: err?.message || 'Failed to add organization member' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authCtx = await requireOrgAdmin(request);
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    const db = getDb();
    const member = await db.queryOne<{ role: string; user_id: string }>(
      'SELECT role, user_id FROM organization_members WHERE id = $1 AND organization_id = $2',
      [memberId, authCtx.organizationId]
    );

    if (!member) {
      return NextResponse.json({ error: 'Member record not found in this organization' }, { status: 404 });
    }

    if (member.role === 'owner') {
      return NextResponse.json({ error: 'Organization owner cannot be removed' }, { status: 400 });
    }

    await db.execute('DELETE FROM organization_members WHERE id = $1', [memberId]);

    return NextResponse.json({ success: true, message: 'Member removed from organization' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to remove member' }, { status: 500 });
  }
}
