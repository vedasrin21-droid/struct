import { NextRequest, NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';
import { getAuthContext } from '@/lib/auth/rbac';
import crypto from 'node:crypto';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const authCtx = await getAuthContext(request);
    const orgId = authCtx?.organizationId || null;
    const body = await request.json();
    const {
      prefix = 'cand',
      domain = 'company.in',
      count = 5,
      department = 'Engineering',
      college = '',
      examIds = [],
    } = body;

    const numCount = Math.min(Math.max(Number(count) || 1, 1), 200); // 1 - 200 candidates per batch
    const sanitizedPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'cand';
    const sanitizedDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase() || 'company.in';

    const db = getDb();
    const now = Date.now();
    const generatedCandidates: Array<{
      id: string;
      email: string;
      passwordPlain: string;
      name: string;
      department: string;
      college: string;
    }> = [];

    // Run inside database transaction for atomicity
    await db.transaction(async (tx) => {
      for (let i = 1; i <= numCount; i++) {
        const randomPin = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-char temporary password
        const tempPassword = `St#${randomPin}`;
        const email = `${sanitizedPrefix}${i}_${Date.now().toString(36).slice(-4)}@${sanitizedDomain}`;
        const name = `Candidate ${sanitizedPrefix.toUpperCase()}-${i}`;
        const userId = 'usr_cand_' + crypto.randomUUID().slice(0, 8);

        const { hash, salt } = hashPassword(tempPassword);

        await tx.execute(
          `INSERT INTO users (id, email, password_hash, salt, role, name, department, college, must_change_password, status, created_at, organization_id)
           VALUES ($1, $2, $3, $4, 'candidate', $5, $6, $7, 1, 'active', $8, $9)`,
          [userId, email, hash, salt, name, department, college, now, orgId]
        );

        // Assign to specified exams
        for (const examId of examIds) {
          await tx.execute(
            `INSERT INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status)
             VALUES ($1, $2, $3, $4, 'assigned')
             ON CONFLICT (exam_id, candidate_id) DO NOTHING`,
            [`asg_${examId}_${userId}`, examId, userId, now]
          );
        }

        generatedCandidates.push({
          id: userId,
          email,
          passwordPlain: tempPassword,
          name,
          department,
          college,
        });
      }

      // Record administrative audit log
      await tx.execute(
        `INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
         VALUES ($1, $2, 'generate_exam_credentials', 'users', $3, $4, $5)`,
        [
          'aud_' + crypto.randomUUID().slice(0, 8),
          admin.id,
          `${numCount}_candidates`,
          `Generated ${numCount} Mode B exam-only credentials with domain ${sanitizedDomain}`,
          now,
        ]
      );
    });

    return NextResponse.json({
      success: true,
      count: generatedCandidates.length,
      candidates: generatedCandidates,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to generate credentials' }, { status: 500 });
  }
}
