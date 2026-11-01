import { getDb } from '@/lib/assess/db';

export interface PlanLimitConfig {
  mockAssessmentsPerMonth?: number;
  aiInterviewCreditsPerMonth?: number; // V2 entitlement
  resumeAiCredits?: number;
  historyDays?: number;
  candidatesPerMonth?: number;
  maxDurationMinutes?: number;
  campaignsPerMonth?: number;
  adminSeats?: number;
  publicExamsOnly?: boolean;
  proctoringSignals?: boolean;
  csvExport?: boolean;
  advancedAnalytics?: boolean;
  companySpecificPrep?: boolean;
  careerRoadmap?: boolean;
}

export interface PlanDetails {
  id: string;
  tierCode: string;
  target: 'individual' | 'organization';
  name: string;
  priceInr: number;
  billingCycle: 'monthly' | 'annual';
  limits: PlanLimitConfig;
  isActive: boolean;
}

export const AUTHORITATIVE_PLANS: Record<string, PlanDetails> = {
  // Individual Plans
  struct_starter: {
    id: 'plan_starter',
    tierCode: 'struct_starter',
    target: 'individual',
    name: 'STRUCT Starter',
    priceInr: 99,
    billingCycle: 'monthly',
    limits: {
      mockAssessmentsPerMonth: 5,
      aiInterviewCreditsPerMonth: 2,
      resumeAiCredits: 3,
      historyDays: 30,
    },
    isActive: true,
  },
  struct_pro: {
    id: 'plan_pro',
    tierCode: 'struct_pro',
    target: 'individual',
    name: 'STRUCT Pro',
    priceInr: 249,
    billingCycle: 'monthly',
    limits: {
      mockAssessmentsPerMonth: 20,
      aiInterviewCreditsPerMonth: 8,
      resumeAiCredits: 10,
      historyDays: 90,
    },
    isActive: true,
  },
  struct_elite: {
    id: 'plan_elite',
    tierCode: 'struct_elite',
    target: 'individual',
    name: 'STRUCT Elite',
    priceInr: 499,
    billingCycle: 'monthly',
    limits: {
      mockAssessmentsPerMonth: 50,
      aiInterviewCreditsPerMonth: 20,
      resumeAiCredits: 25,
      historyDays: 180,
      companySpecificPrep: true,
      careerRoadmap: true,
    },
    isActive: true,
  },

  // Organization Plans
  recruit_free: {
    id: 'plan_recruit_free',
    tierCode: 'recruit_free',
    target: 'organization',
    name: 'Recruit Free',
    priceInr: 0,
    billingCycle: 'monthly',
    limits: {
      candidatesPerMonth: 0,
      maxDurationMinutes: 30,
      campaignsPerMonth: 0,
      adminSeats: 1,
      publicExamsOnly: true,
    },
    isActive: true,
  },
  recruit_pro: {
    id: 'plan_recruit_pro',
    tierCode: 'recruit_pro',
    target: 'organization',
    name: 'Recruit Pro',
    priceInr: 1499,
    billingCycle: 'monthly',
    limits: {
      candidatesPerMonth: 100,
      maxDurationMinutes: 60,
      campaignsPerMonth: 5,
      adminSeats: 3,
      proctoringSignals: true,
      csvExport: true,
    },
    isActive: true,
  },
  recruit_business: {
    id: 'plan_recruit_business',
    tierCode: 'recruit_business',
    target: 'organization',
    name: 'Recruit Business',
    priceInr: 4999,
    billingCycle: 'monthly',
    limits: {
      candidatesPerMonth: 500,
      maxDurationMinutes: 120,
      campaignsPerMonth: 20,
      adminSeats: 10,
      advancedAnalytics: true,
    },
    isActive: true,
  },
  recruit_enterprise: {
    id: 'plan_recruit_enterprise',
    tierCode: 'recruit_enterprise',
    target: 'organization',
    name: 'Recruit Enterprise',
    priceInr: 14999,
    billingCycle: 'monthly',
    limits: {
      candidatesPerMonth: 2000,
      maxDurationMinutes: 180,
      campaignsPerMonth: 100,
      adminSeats: 25,
      csvExport: true,
    },
    isActive: true,
  },
};

/**
 * Retrieve all active plans from database with fallback to authoritative constants.
 */
export async function getActivePlans(target?: 'individual' | 'organization'): Promise<PlanDetails[]> {
  const db = getDb();
  try {
    let sql = 'SELECT * FROM plans WHERE is_active = 1';
    const params: any[] = [];
    if (target) {
      sql += ' AND target = $1';
      params.push(target);
    }
    const { rows } = await db.query(sql, params);
    if (rows && rows.length > 0) {
      return rows.map((r: any) => ({
        id: r.id,
        tierCode: r.tier_code,
        target: r.target,
        name: r.name,
        priceInr: Number(r.price_inr),
        billingCycle: r.billing_cycle,
        limits: typeof r.limits_json === 'string' ? JSON.parse(r.limits_json) : r.limits_json || {},
        isActive: Boolean(r.is_active),
      }));
    }
  } catch {
    // Database table not initialized yet, use fallback
  }

  const list = Object.values(AUTHORITATIVE_PLANS).filter(p => p.isActive);
  if (target) {
    return list.filter(p => p.target === target);
  }
  return list;
}

/**
 * Get single plan by tier code.
 */
export async function getPlanByTier(tierCode: string): Promise<PlanDetails | null> {
  const db = getDb();
  try {
    const row = await db.queryOne(
      'SELECT * FROM plans WHERE LOWER(tier_code) = LOWER($1) AND is_active = 1',
      [tierCode]
    );
    if (row) {
      return {
        id: row.id,
        tierCode: row.tier_code,
        target: row.target,
        name: row.name,
        priceInr: Number(row.price_inr),
        billingCycle: row.billing_cycle,
        limits: typeof row.limits_json === 'string' ? JSON.parse(row.limits_json) : row.limits_json || {},
        isActive: Boolean(row.is_active),
      };
    }
  } catch {}

  return AUTHORITATIVE_PLANS[tierCode] || null;
}

/**
 * Activates a subscription and credits plan entitlements.
 */
export async function activateSubscription(params: {
  userId?: string;
  organizationId?: string;
  planTier: string;
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
}): Promise<{ subscriptionId: string; plan: PlanDetails }> {
  const plan = await getPlanByTier(params.planTier);
  if (!plan) {
    throw new Error(`INVALID_PLAN_TIER: Tier "${params.planTier}" does not exist.`);
  }

  const db = getDb();
  const now = Date.now();
  const periodEnd = now + 30 * 24 * 60 * 60 * 1000; // 30 days
  const subId = 'sub_' + Math.random().toString(36).substring(2, 12);

  await db.transaction(async (tx) => {
    // 1. Record subscription
    await tx.execute(
      `INSERT INTO subscriptions (
        id, user_id, organization_id, plan_id, razorpay_subscription_id,
        razorpay_customer_id, status, current_period_start, current_period_end,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10)`,
      [
        subId,
        params.userId || null,
        params.organizationId || null,
        plan.id,
        params.razorpaySubscriptionId || null,
        params.razorpayCustomerId || null,
        now,
        periodEnd,
        now,
        now,
      ]
    );

    // 2. If organization, update organization plan_tier
    if (params.organizationId) {
      await tx.execute(
        'UPDATE organizations SET plan_tier = $1, updated_at = $2 WHERE id = $3',
        [plan.tierCode, now, params.organizationId]
      );
    }

    // 3. If individual plan with resume AI credits, grant entitlements
    if (params.userId && plan.limits.resumeAiCredits) {
      const user = await tx.queryOne<{ email: string }>('SELECT email FROM users WHERE id = $1', [params.userId]);
      if (user?.email) {
        const email = user.email.toLowerCase();
        const ent = await tx.queryOne<{ id: string; remaining_balance: number; total_granted: number }>(
          `SELECT id, remaining_balance, total_granted FROM user_entitlements
           WHERE LOWER(email) = $1 AND feature_type = 'resume_ai_usage'`,
          [email]
        );

        const credits = plan.limits.resumeAiCredits;
        if (!ent) {
          const entId = 'ent_' + Math.random().toString(36).substring(2, 12);
          await tx.execute(
            `INSERT INTO user_entitlements (id, user_id, email, feature_type, total_granted, total_consumed, remaining_balance, updated_at)
             VALUES ($1, $2, $3, 'resume_ai_usage', $4, 0, $4, $5)`,
            [entId, params.userId, email, credits, now]
          );
          await tx.execute(
            `INSERT INTO entitlement_ledger (id, entitlement_id, delta, reason, reference_id, created_at)
             VALUES ($1, $2, $3, 'purchase', $4, $5)`,
            ['led_' + Math.random().toString(36).substring(2, 12), entId, credits, subId, now]
          );
        } else {
          await tx.execute(
            `UPDATE user_entitlements
             SET total_granted = total_granted + $1,
                 remaining_balance = remaining_balance + $1,
                 updated_at = $2
             WHERE id = $3`,
            [credits, now, ent.id]
          );
          await tx.execute(
            `INSERT INTO entitlement_ledger (id, entitlement_id, delta, reason, reference_id, created_at)
             VALUES ($1, $2, $3, 'purchase', $4, $5)`,
            ['led_' + Math.random().toString(36).substring(2, 12), ent.id, credits, subId, now]
          );
        }
      }
    }

    // 4. If individual plan with mock assessments, grant assessment attempts
    if (params.userId && plan.limits.mockAssessmentsPerMonth) {
      const user = await tx.queryOne<{ email: string }>('SELECT email FROM users WHERE id = $1', [params.userId]);
      if (user?.email) {
        const email = user.email.toLowerCase();
        const ent = await tx.queryOne<{ id: string; remaining_balance: number; total_granted: number }>(
          `SELECT id, remaining_balance, total_granted FROM user_entitlements
           WHERE LOWER(email) = $1 AND feature_type = 'mock_assessment_attempt'`,
          [email]
        );

        const credits = plan.limits.mockAssessmentsPerMonth;
        if (!ent) {
          const entId = 'ent_' + Math.random().toString(36).substring(2, 12);
          await tx.execute(
            `INSERT INTO user_entitlements (id, user_id, email, feature_type, total_granted, total_consumed, remaining_balance, updated_at)
             VALUES ($1, $2, $3, 'mock_assessment_attempt', $4, 0, $4, $5)`,
            [entId, params.userId, email, credits, now]
          );
          await tx.execute(
            `INSERT INTO entitlement_ledger (id, entitlement_id, delta, reason, reference_id, created_at)
             VALUES ($1, $2, $3, 'purchase', $4, $5)`,
            ['led_' + Math.random().toString(36).substring(2, 12), entId, credits, subId, now]
          );
        } else {
          await tx.execute(
            `UPDATE user_entitlements
             SET total_granted = total_granted + $1,
                 remaining_balance = remaining_balance + $1,
                 updated_at = $2
             WHERE id = $3`,
            [credits, now, ent.id]
          );
          await tx.execute(
            `INSERT INTO entitlement_ledger (id, entitlement_id, delta, reason, reference_id, created_at)
             VALUES ($1, $2, $3, 'purchase', $4, $5)`,
            ['led_' + Math.random().toString(36).substring(2, 12), ent.id, credits, subId, now]
          );
        }
      }
    }
  });

  return { subscriptionId: subId, plan };
}

/**
 * Checks an organization's active plan and evaluates whether an action is permitted under plan limits.
 */
export async function checkOrgActionAllowed(
  organizationId: string,
  action: 'create_exam' | 'add_candidate' | 'duration_check',
  meta?: { durationMinutes?: number }
): Promise<{ allowed: boolean; reason?: string }> {
  const db = getDb();
  const org = await db.queryOne<{ plan_tier: string }>(
    'SELECT plan_tier FROM organizations WHERE id = $1',
    [organizationId]
  );

  const planTier = org?.plan_tier || 'recruit_free';
  const plan = await getPlanByTier(planTier);
  if (!plan) return { allowed: true };

  if (action === 'duration_check' && meta?.durationMinutes) {
    const maxMinutes = plan.limits.maxDurationMinutes || 30;
    if (meta.durationMinutes > maxMinutes) {
      return {
        allowed: false,
        reason: `Assessment duration exceeds the ${plan.name} limit of ${maxMinutes} minutes. Upgrade to extend duration.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Renews an existing subscription upon recurring charge.
 */
export async function renewSubscription(params: {
  razorpaySubscriptionId: string;
  currentPeriodEnd?: number;
}): Promise<{ renewed: boolean; subscriptionId?: string }> {
  const db = getDb();
  const now = Date.now();
  const sub = await db.queryOne<any>(
    'SELECT * FROM subscriptions WHERE razorpay_subscription_id = $1 OR id = $1',
    [params.razorpaySubscriptionId]
  );

  if (!sub) {
    return { renewed: false };
  }

  const rawEnd = params.currentPeriodEnd;
  const newPeriodEnd = rawEnd
    ? (rawEnd < 10000000000 ? rawEnd * 1000 : rawEnd)
    : Math.max(Number(sub.current_period_end || now), now) + 30 * 24 * 60 * 60 * 1000;

  await db.transaction(async (tx) => {
    await tx.execute(
      `UPDATE subscriptions
       SET status = 'active', current_period_end = $1, updated_at = $2
       WHERE id = $3`,
      [newPeriodEnd, now, sub.id]
    );

    // If individual user with resume AI credits, grant monthly allowance
    if (sub.user_id && sub.plan_id) {
      const plan = await tx.queryOne<any>('SELECT * FROM plans WHERE id = $1 OR tier_code = $1', [sub.plan_id]);
      const limits = plan?.limits_json ? (typeof plan.limits_json === 'string' ? JSON.parse(plan.limits_json) : plan.limits_json) : {};
      const credits = limits.resumeAiCredits;

      if (credits && credits > 0) {
        const user = await tx.queryOne<any>('SELECT email FROM users WHERE id = $1', [sub.user_id]);
        if (user?.email) {
          const email = user.email.toLowerCase();
          const ent = await tx.queryOne<any>(
            `SELECT id FROM user_entitlements WHERE LOWER(email) = $1 AND feature_type = 'resume_ai_usage'`,
            [email]
          );
          if (ent) {
            await tx.execute(
              `UPDATE user_entitlements
               SET total_granted = total_granted + $1,
                   remaining_balance = remaining_balance + $1,
                   updated_at = $2
               WHERE id = $3`,
              [credits, now, ent.id]
            );
            await tx.execute(
              `INSERT INTO entitlement_ledger (id, entitlement_id, delta, reason, reference_id, created_at)
               VALUES ($1, $2, $3, 'subscription_renewal', $4, $5)`,
              ['led_' + Math.random().toString(36).substring(2, 12), ent.id, credits, sub.id, now]
            );
          }
        }
      }

      const assessCredits = limits.mockAssessmentsPerMonth;
      if (assessCredits && assessCredits > 0) {
        const user = await tx.queryOne<any>('SELECT email FROM users WHERE id = $1', [sub.user_id]);
        if (user?.email) {
          const email = user.email.toLowerCase();
          const ent = await tx.queryOne<any>(
            `SELECT id FROM user_entitlements WHERE LOWER(email) = $1 AND feature_type = 'mock_assessment_attempt'`,
            [email]
          );
          if (ent) {
            await tx.execute(
              `UPDATE user_entitlements
               SET total_granted = total_granted + $1,
                   remaining_balance = remaining_balance + $1,
                   updated_at = $2
               WHERE id = $3`,
              [assessCredits, now, ent.id]
            );
            await tx.execute(
              `INSERT INTO entitlement_ledger (id, entitlement_id, delta, reason, reference_id, created_at)
               VALUES ($1, $2, $3, 'subscription_renewal', $4, $5)`,
              ['led_' + Math.random().toString(36).substring(2, 12), ent.id, assessCredits, sub.id, now]
            );
          }
        }
      }
    }
  });

  return { renewed: true, subscriptionId: sub.id };
}

/**
 * Cancels a subscription and reverts organization to recruit_free.
 */
export async function cancelSubscription(params: {
  razorpaySubscriptionId: string;
}): Promise<{ canceled: boolean }> {
  const db = getDb();
  const now = Date.now();
  const sub = await db.queryOne<any>(
    'SELECT * FROM subscriptions WHERE razorpay_subscription_id = $1 OR id = $1',
    [params.razorpaySubscriptionId]
  );

  if (!sub) {
    return { canceled: false };
  }

  await db.transaction(async (tx) => {
    await tx.execute(
      `UPDATE subscriptions SET status = 'canceled', updated_at = $1 WHERE id = $2`,
      [now, sub.id]
    );

    if (sub.organization_id) {
      await tx.execute(
        `UPDATE organizations SET plan_tier = 'recruit_free', updated_at = $1 WHERE id = $2`,
        [now, sub.organization_id]
      );
    }
  });

  return { canceled: true };
}
