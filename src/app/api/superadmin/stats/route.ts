import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireSuperAdmin } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);
    const db = getDb();

    // Aggregate statistics
    const totalUsers = await db.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM users WHERE role != 'candidate'"
    );
    const totalCandidates = await db.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM users WHERE role = 'candidate'"
    );
    const totalExams = await db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM exams'
    );
    const totalAttempts = await db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM attempts'
    );
    const totalOrgs = await db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM organizations'
    );
    const revenueStats = await db.queryOne<{ total_paise: number }>(
      "SELECT SUM(amount) as total_paise FROM payment_orders WHERE status = 'paid'"
    );
    const activeSubscriptions = await db.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'"
    );

    const totalRevenueInr = Math.round((Number(revenueStats?.total_paise) || 0) / 100);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: Number(totalUsers?.count) || 0,
        totalCandidates: Number(totalCandidates?.count) || 0,
        totalExams: Number(totalExams?.count) || 0,
        totalAttempts: Number(totalAttempts?.count) || 0,
        totalOrganizations: Number(totalOrgs?.count) || 0,
        activeSubscriptions: Number(activeSubscriptions?.count) || 0,
        totalRevenueInr,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Super Administrator privilege required' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to fetch platform metrics' }, { status: 500 });
  }
}
