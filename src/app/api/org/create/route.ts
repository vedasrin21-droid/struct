import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireUser } from '@/lib/auth/rbac';
import crypto from 'node:crypto';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const { name, slug: customSlug, domain, logoUrl } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Organization name must be at least 2 characters' }, { status: 400 });
    }

    const db = getDb();
    let slug: string;

    if (customSlug && typeof customSlug === 'string' && customSlug.trim()) {
      slug = customSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (slug.length < 2) {
        return NextResponse.json({ error: 'Organization slug must be at least 2 characters' }, { status: 400 });
      }
      const existing = await db.queryOne('SELECT id FROM organizations WHERE LOWER(slug) = LOWER($1)', [slug]);
      if (existing) {
        return NextResponse.json({ error: 'Organization slug is already taken. Please choose another slug.' }, { status: 409 });
      }
    } else {
      const rawSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'org';
      slug = rawSlug;
      let suffix = 1;

      while (await db.queryOne('SELECT id FROM organizations WHERE slug = $1', [slug])) {
        slug = `${rawSlug}-${suffix++}`;
      }
    }

    const orgId = 'org_' + crypto.randomUUID().slice(0, 8);
    const memberId = 'mem_' + crypto.randomUUID().slice(0, 8);
    const now = Date.now();

    await db.transaction(async (tx) => {
      // 1. Insert organization
      await tx.execute(
        `INSERT INTO organizations (id, name, slug, domain, logo_url, plan_tier, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'recruit_free', $6, $7)`,
        [orgId, name.trim(), slug, domain ? domain.trim() : '', logoUrl ? logoUrl.trim() : '', now, now]
      );

      // 2. Insert organization owner
      await tx.execute(
        `INSERT INTO organization_members (id, organization_id, user_id, role, created_at)
         VALUES ($1, $2, $3, 'owner', $4)`,
        [memberId, orgId, user.userId, now]
      );

      // 3. Update user organization and elevate role to admin if currently user
      await tx.execute(
        "UPDATE users SET organization_id = $1, role = CASE WHEN role = 'user' THEN 'admin' ELSE role END WHERE id = $2",
        [orgId, user.userId]
      );

      // 4. Audit log
      await tx.execute(
        `INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
         VALUES ($1, $2, 'create_organization', 'organization', $3, $4, $5)`,
        [
          'aud_' + crypto.randomUUID().slice(0, 8),
          user.userId,
          orgId,
          `Created organization ${name.trim()} (${slug})`,
          now,
        ]
      );
    });

    return NextResponse.json({
      success: true,
      organization: {
        id: orgId,
        name: name.trim(),
        slug,
        domain: domain ? domain.trim() : '',
        logo_url: logoUrl ? logoUrl.trim() : '',
        plan_tier: 'recruit_free',
        created_at: now,
      },
    }, { status: 201 });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (err.message.includes('EXAM_ONLY') || err.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to create an organization' }, { status: 403 });
    }
    return NextResponse.json({ error: err?.message || 'Failed to create organization' }, { status: 500 });
  }
}
