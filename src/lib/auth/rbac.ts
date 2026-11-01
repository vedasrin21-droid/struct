import { getDb } from '@/lib/assess/db';
import { getSessionUser, AssessUser } from '@/lib/assess/auth';
import { currentUser } from '@clerk/nextjs/server';

export type UserRole = 'super_admin' | 'admin' | 'user' | 'candidate';

export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  isExamOnlyCandidate: boolean;
  clerkUserId?: string;
  organizationId?: string;
  orgRole?: 'owner' | 'admin' | 'member';
}

/**
 * Resolves the authenticated user identity with support for:
 * 1. Clerk session for normal users & organization admins
 * 2. Dedicated Mode B exam session tokens for exam-only candidates
 * 3. Database session tokens for fallback & testing
 */
export async function getAuthContext(request?: Request): Promise<AuthContext | null> {
  const db = getDb();

  // 1. Check for dedicated Mode B exam-only session cookie / header
  const assessUser = await getSessionUser(request);
  if (assessUser) {
    // If user is candidate, strictly isolated to exams
    if (assessUser.role === 'candidate') {
      return {
        userId: assessUser.id,
        email: assessUser.email,
        name: assessUser.name,
        role: 'candidate',
        isExamOnlyCandidate: true,
      };
    }

    // If local session has admin or super_admin
    const dbUser = await db.queryOne<{ id: string; email: string; role: string; name: string }>(
      'SELECT id, email, role, name FROM users WHERE id = $1',
      [assessUser.id]
    );

    const userRole = (dbUser?.role as UserRole) || (assessUser.role === 'admin' ? 'admin' : 'user');

    // Fetch org membership if exists
    const orgMembership = await db.queryOne<{ organization_id: string; role: 'owner' | 'admin' | 'member' }>(
      'SELECT organization_id, role FROM organization_members WHERE user_id = $1 LIMIT 1',
      [assessUser.id]
    );

    return {
      userId: assessUser.id,
      email: assessUser.email,
      name: assessUser.name,
      role: userRole,
      isExamOnlyCandidate: false,
      organizationId: orgMembership?.organization_id,
      orgRole: orgMembership?.role,
    };
  }

  // 2. Check for Clerk session if Clerk is configured
  if (process.env.CLERK_SECRET_KEY) {
    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress || '';
        const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'STRUCT User';

        // Find or sync user in database
        let userRow = await db.queryOne<{ id: string; email: string; role: string; name: string }>(
          'SELECT id, email, role, name FROM users WHERE clerk_user_id = $1 OR LOWER(email) = LOWER($2)',
          [clerkUser.id, primaryEmail]
        );

        if (!userRow) {
          const newUserId = 'usr_' + clerkUser.id.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 48);
          await db.execute(
            `INSERT INTO users (id, clerk_user_id, email, password_hash, salt, role, name, created_at)
             VALUES ($1, $2, $3, '', '', 'user', $4, $5)`,
            [newUserId, clerkUser.id, primaryEmail, name, Date.now()]
          );
          userRow = { id: newUserId, email: primaryEmail, role: 'user', name };
        } else if (!userRow.id.startsWith('usr_')) {
          await db.execute(
            'UPDATE users SET clerk_user_id = $1 WHERE id = $2',
            [clerkUser.id, userRow.id]
          );
        }

        const orgMembership = await db.queryOne<{ organization_id: string; role: 'owner' | 'admin' | 'member' }>(
          'SELECT organization_id, role FROM organization_members WHERE user_id = $1 LIMIT 1',
          [userRow.id]
        );

        return {
          userId: userRow.id,
          email: userRow.email,
          name: userRow.name,
          role: userRow.role as UserRole,
          isExamOnlyCandidate: false,
          clerkUserId: clerkUser.id,
          organizationId: orgMembership?.organization_id,
          orgRole: orgMembership?.role,
        };
      }
    } catch {
      // Non-Clerk environment or token error
    }
  }

  return null;
}

/**
 * Server-side authorization check: Require valid Super Admin.
 * Super Admin permissions are strictly limited to verified platform administrators.
 */
export async function requireSuperAdmin(request?: Request): Promise<AuthContext> {
  const ctx = await getAuthContext(request);
  if (!ctx) {
    throw new Error('UNAUTHORIZED');
  }
  if (ctx.role !== 'super_admin') {
    throw new Error('FORBIDDEN_SUPER_ADMIN_REQUIRED');
  }
  return ctx;
}

/**
 * Server-side authorization check: Require Organization Admin.
 * Verifies that the user is either a Super Admin OR an Admin/Owner of the specific organization.
 */
export async function requireOrgAdmin(request?: Request, targetOrgId?: string): Promise<AuthContext> {
  const ctx = await getAuthContext(request);
  if (!ctx) {
    throw new Error('UNAUTHORIZED');
  }

  if (ctx.role === 'super_admin') {
    return ctx;
  }

  if (!targetOrgId && ctx.organizationId) {
    targetOrgId = ctx.organizationId;
  }

  if (!targetOrgId) {
    throw new Error('FORBIDDEN_ORG_CONTEXT_MISSING');
  }

  const db = getDb();
  const membership = await db.queryOne<{ role: string }>(
    `SELECT role FROM organization_members
     WHERE organization_id = $1 AND user_id = $2`,
    [targetOrgId, ctx.userId]
  );

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    throw new Error('FORBIDDEN_ORG_ADMIN_REQUIRED');
  }

  return {
    ...ctx,
    organizationId: targetOrgId,
    orgRole: membership.role as 'owner' | 'admin',
  };
}

/**
 * Server-side authorization check: Require standard authenticated individual user or admin.
 * Blocks exam-only candidates from accessing individual resume builder / ATS tools.
 */
export async function requireUser(request?: Request): Promise<AuthContext> {
  const ctx = await getAuthContext(request);
  if (!ctx) {
    throw new Error('UNAUTHORIZED');
  }
  if (ctx.isExamOnlyCandidate) {
    throw new Error('FORBIDDEN_EXAM_ONLY_ACCOUNT');
  }
  return ctx;
}

/**
 * Server-side authorization check: Candidate access to specific assessment.
 * Verifies candidate exam assignment and access scope.
 */
export async function requireExamAccess(examId: string, request?: Request): Promise<AuthContext> {
  const ctx = await getAuthContext(request);
  if (!ctx) {
    throw new Error('UNAUTHORIZED');
  }

  // Admins & super admins can preview assessments
  if (ctx.role === 'super_admin' || ctx.role === 'admin') {
    return ctx;
  }

  const db = getDb();

  // Verify the exam exists and is published
  const exam = await db.queryOne<{ id: string; status: string; auth_mode?: string; access_scope?: string }>(
    'SELECT id, status, auth_mode, access_scope FROM exams WHERE id = $1',
    [examId]
  );

  if (!exam) {
    throw new Error('EXAM_NOT_FOUND');
  }

  if (exam.status !== 'published') {
    throw new Error('EXAM_NOT_ACCESSIBLE');
  }

  // Check candidate assignment
  const assignment = await db.queryOne<{ id: string; status: string }>(
    'SELECT id, status FROM exam_assignments WHERE exam_id = $1 AND candidate_id = $2',
    [examId, ctx.userId]
  );

  if (!assignment) {
    throw new Error('FORBIDDEN_EXAM_NOT_ASSIGNED');
  }

  return ctx;
}
