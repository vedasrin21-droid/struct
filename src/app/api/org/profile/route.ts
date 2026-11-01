import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { getAuthContext, requireOrgAdmin } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  try {
    const authCtx = await getAuthContext(request);
    if (!authCtx) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const db = getDb();
    let orgId = authCtx.organizationId;

    // Fetch all organizations user is linked to
    const userOrgs = await db.query<{ id: string; name: string; slug: string; role: string; plan_tier: string }>(
      `SELECT o.id, o.name, o.slug, o.plan_tier, om.role
       FROM organizations o
       JOIN organization_members om ON om.organization_id = o.id
       WHERE om.user_id = $1
       ORDER BY o.created_at DESC`,
      [authCtx.userId]
    );

    const url = new URL(request.url);
    const queryOrgId = url.searchParams.get('orgId');
    if (queryOrgId) {
      const isMember = userOrgs.rows.some(o => o.id === queryOrgId);
      if (!isMember && authCtx.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this organization workspace' }, { status: 403 });
      }
      orgId = queryOrgId;
    } else if (!orgId && userOrgs.rows.length > 0) {
      orgId = userOrgs.rows[0].id;
    }

    if (!orgId || userOrgs.rows.length === 0) {
      return NextResponse.json({
        hasOrg: false,
        message: 'No organization linked to this account.',
        userOrganizations: [],
      });
    }

    const org = await db.queryOne<{
      id: string;
      name: string;
      slug: string;
      domain: string;
      logo_url: string;
      plan_tier: string;
      created_at: number;
    }>('SELECT * FROM organizations WHERE id = $1', [orgId]);

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Fetch team members
    const members = await db.query(
      `SELECT om.id, om.role, om.created_at, u.id as user_id, u.email, u.name
       FROM organization_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1
       ORDER BY om.created_at ASC`,
      [orgId]
    );

    // Fetch stats for this organization
    const examCount = await db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM exams WHERE organization_id = $1',
      [orgId]
    );

    const candidateCount = await db.queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT ea.candidate_id) as count
       FROM exam_assignments ea
       JOIN exams e ON e.id = ea.exam_id
       WHERE e.organization_id = $1`,
      [orgId]
    );

    return NextResponse.json({
      hasOrg: true,
      activeOrgId: orgId,
      organization: {
        ...org,
        stats: {
          exams: Number(examCount?.count || 0),
          candidates: Number(candidateCount?.count || 0),
          membersCount: members.rows.length,
        },
        members: members.rows,
      },
      userOrganizations: userOrgs.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch organization' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authCtx = await requireOrgAdmin(request);
    const body = await request.json();
    const { name, domain, logoUrl } = body;

    if (!authCtx.organizationId) {
      return NextResponse.json({ error: 'Organization context missing' }, { status: 400 });
    }

    const db = getDb();
    const updates: string[] = [];
    const params: any[] = [];

    if (name && typeof name === 'string') {
      params.push(name.trim());
      updates.push(`name = $${params.length}`);
    }

    if (domain !== undefined) {
      params.push(domain ? domain.trim() : '');
      updates.push(`domain = $${params.length}`);
    }

    if (logoUrl !== undefined) {
      params.push(logoUrl ? logoUrl.trim() : '');
      updates.push(`logo_url = $${params.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(Date.now());
    updates.push(`updated_at = $${params.length}`);

    params.push(authCtx.organizationId);
    const sql = `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${params.length}`;
    await db.execute(sql, params);

    return NextResponse.json({ success: true, message: 'Organization profile updated' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update organization profile' }, { status: 500 });
  }
}
