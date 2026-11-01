import { getDb } from '@/lib/assess/db';

export interface PromoValidationResult {
  isValid: boolean;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  discountedAmountPaise: number;
  creditGrant?: {
    feature: string;
    amount: number;
  };
  error?: string;
}

/**
 * Validates a promo code strictly server-side for an order amount and optional target plan.
 */
export async function validatePromoCode(params: {
  code: string;
  amountPaise: number;
  planId?: string;
  userId?: string;
  organizationId?: string;
}): Promise<PromoValidationResult> {
  const db = getDb();
  const normalizedCode = params.code.trim().toUpperCase();

  const promo = await db.queryOne<{
    id: string;
    code: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    max_uses: number;
    current_uses: number;
    expires_at: number | null;
    restrictions_json: string;
    credit_grant_feature: string;
    credit_grant_amount: number;
    is_active: number;
  }>('SELECT * FROM promo_codes WHERE UPPER(code) = $1', [normalizedCode]);

  if (!promo) {
    return {
      isValid: false,
      code: normalizedCode,
      discountType: 'fixed',
      discountValue: 0,
      discountedAmountPaise: params.amountPaise,
      error: 'INVALID_PROMO_CODE: The code entered does not exist.',
    };
  }

  if (!promo.is_active) {
    return {
      isValid: false,
      code: normalizedCode,
      discountType: promo.discount_type,
      discountValue: 0,
      discountedAmountPaise: params.amountPaise,
      error: 'PROMO_INACTIVE: This code is currently inactive.',
    };
  }

  if (promo.expires_at && Date.now() > Number(promo.expires_at)) {
    return {
      isValid: false,
      code: normalizedCode,
      discountType: promo.discount_type,
      discountValue: 0,
      discountedAmountPaise: params.amountPaise,
      error: 'PROMO_EXPIRED: This code has expired.',
    };
  }

  if (promo.current_uses >= promo.max_uses) {
    return {
      isValid: false,
      code: normalizedCode,
      discountType: promo.discount_type,
      discountValue: 0,
      discountedAmountPaise: params.amountPaise,
      error: 'PROMO_LIMIT_REACHED: This code has reached its maximum redemptions.',
    };
  }

  // Parse restrictions
  try {
    const restrictions = JSON.parse(promo.restrictions_json || '{}');
    if (restrictions.allowedPlans && params.planId && !restrictions.allowedPlans.includes(params.planId)) {
      return {
        isValid: false,
        code: normalizedCode,
        discountType: promo.discount_type,
        discountValue: 0,
        discountedAmountPaise: params.amountPaise,
        error: 'PLAN_NOT_ELIGIBLE: This promo code cannot be applied to this plan.',
      };
    }
  } catch {}

  // Calculate discount
  let discountPaise = 0;
  if (promo.discount_type === 'percent') {
    discountPaise = Math.round((params.amountPaise * promo.discount_value) / 100);
  } else {
    // Fixed amount is stored in Rupees
    discountPaise = promo.discount_value * 100;
  }

  // Cap discount at total amount (never negative)
  discountPaise = Math.min(discountPaise, params.amountPaise);
  const discountedAmountPaise = Math.max(0, params.amountPaise - discountPaise);

  return {
    isValid: true,
    code: normalizedCode,
    discountType: promo.discount_type,
    discountValue: promo.discount_value,
    discountedAmountPaise,
    creditGrant:
      promo.credit_grant_feature && promo.credit_grant_amount > 0
        ? {
            feature: promo.credit_grant_feature,
            amount: promo.credit_grant_amount,
          }
        : undefined,
  };
}

/**
 * Increment promo usage count atomically upon confirmed payment.
 */
export async function redeemPromoCode(code: string, userId?: string): Promise<boolean> {
  const db = getDb();
  const normalizedCode = code.trim().toUpperCase();
  const res = await db.execute(
    `UPDATE promo_codes
     SET current_uses = current_uses + 1
     WHERE UPPER(code) = $1 AND current_uses < max_uses AND is_active = 1`,
    [normalizedCode]
  );
  return res.rowCount > 0;
}
