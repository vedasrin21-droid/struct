import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireSuperAdmin } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);
    const db = getDb();

    const { rows } = await db.query(`
      SELECT id, code, discount_type, discount_value, max_uses, current_uses,
             expires_at, restrictions_json, credit_grant_feature, credit_grant_amount,
             is_active, created_at
      FROM promo_codes
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      promos: rows,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Super Administrator privilege required' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to list promo codes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request);
    const body = await request.json();
    const {
      code,
      discountType,
      discountValue,
      maxUses = 100,
      expiresAt,
      restrictions = {},
      creditGrantFeature = '',
      creditGrantAmount = 0,
    } = body;

    if (!code || !discountType || discountValue === undefined) {
      return NextResponse.json({ error: 'code, discountType, and discountValue are required' }, { status: 400 });
    }

    if (discountType !== 'percent' && discountType !== 'fixed') {
      return NextResponse.json({ error: 'discountType must be "percent" or "fixed"' }, { status: 400 });
    }

    const numDiscount = Number(discountValue);
    if (isNaN(numDiscount) || numDiscount <= 0) {
      return NextResponse.json({ error: 'discountValue must be a positive number' }, { status: 400 });
    }

    const db = getDb();
    const normalizedCode = code.trim().toUpperCase();

    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM promo_codes WHERE UPPER(code) = $1',
      [normalizedCode]
    );

    if (existing) {
      return NextResponse.json({ error: `Promo code "${normalizedCode}" already exists` }, { status: 409 });
    }

    const promoId = 'promo_' + Math.random().toString(36).substring(2, 10);
    const now = Date.now();

    await db.execute(
      `INSERT INTO promo_codes (
        id, code, discount_type, discount_value, max_uses, current_uses,
        expires_at, restrictions_json, credit_grant_feature, credit_grant_amount,
        is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9, 1, $10)`,
      [
        promoId,
        normalizedCode,
        discountType,
        numDiscount,
        Number(maxUses) || 100,
        expiresAt ? Number(expiresAt) : null,
        JSON.stringify(restrictions),
        creditGrantFeature,
        Number(creditGrantAmount) || 0,
        now,
      ]
    );

    await db.execute(
      `INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
       VALUES ($1, $2, 'create_promo_code', 'promo_code', $3, $4, $5)`,
      [
        'aud_' + Math.random().toString(36).substring(2, 10),
        admin.userId,
        promoId,
        `Created promo ${normalizedCode}`,
        now,
      ]
    );

    return NextResponse.json({
      success: true,
      promoId,
      code: normalizedCode,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message.includes('SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Super Administrator privilege required' }, { status: 403 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to create promo code' }, { status: 500 });
  }
}
