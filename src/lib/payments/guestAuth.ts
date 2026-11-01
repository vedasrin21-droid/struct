/**
 * STRUCT GUEST ENTITLEMENT IDENTITY & TOKEN SYSTEM
 * 
 * Secure entitlement identity rules:
 * 1. Prefer linking purchases to authenticated user IDs.
 * 2. If guest checkout is used, require verified ownership via cryptographically signed tokens.
 * 3. Never grant access to a guest's credits based solely on an unverified submitted email.
 * 4. Normalize all emails consistently to lowercase trimmed strings.
 * 5. Allow seamless claiming of guest purchases upon account registration.
 */

import crypto from 'node:crypto';
import { verifySession, AssessUser, COOKIE_NAME as ASSESS_COOKIE_NAME } from '@/lib/assess/auth';
import { getDb, DbClient } from '@/lib/assess/db';

const GUEST_COOKIE_NAME = 'struct_guest_token';
const GUEST_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function getSecretKey(): string {
  return process.env.ASSESS_SESSION_SECRET || 'talvyn_assess_secure_session_secret_2026_key';
}

export interface EntitlementIdentity {
  email: string;
  userId: string | null;
  isGuest: boolean;
}

export interface GuestTokenPayload {
  email: string;
  exp: number;
}

/**
 * Creates a cryptographically signed guest access token
 */
export function createGuestEntitlementToken(email: string): string {
  const norm = normalizeEmail(email);
  const payload: GuestTokenPayload = {
    email: norm,
    exp: Date.now() + GUEST_TOKEN_TTL_MS,
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSecretKey())
    .update(payloadStr)
    .digest('base64url');

  return `${payloadStr}.${signature}`;
}

/**
 * Verifies a guest entitlement token signature and expiration
 */
export function verifyGuestEntitlementToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadStr, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getSecretKey())
    .update(payloadStr)
    .digest('base64url');

  try {
    const isSigValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSig, 'utf8')
    );
    if (!isSigValid) return null;

    const payload: GuestTokenPayload = JSON.parse(
      Buffer.from(payloadStr, 'base64url').toString('utf8')
    );

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return normalizeEmail(payload.email);
  } catch {
    return null;
  }
}

/**
 * Resolves user identity from either:
 * 1. Authenticated session cookie (highest priority)
 * 2. Cryptographically signed guest entitlement token (cookie or header)
 */
export async function resolveEntitlementIdentity(
  request: Request
): Promise<EntitlementIdentity | null> {
  const cookieHeader = request.headers.get('cookie') || '';
  const parsedCookies = parseCookies(cookieHeader);

  // 1. Check authenticated user session
  const assessToken = parsedCookies[ASSESS_COOKIE_NAME];
  if (assessToken) {
    const user = await verifySession(assessToken);
    if (user) {
      return {
        email: normalizeEmail(user.email),
        userId: user.id,
        isGuest: false,
      };
    }
  }

  // 2. Check signed guest token from cookie or X-Guest-Token header
  const guestToken =
    parsedCookies[GUEST_COOKIE_NAME] ||
    request.headers.get('x-guest-token') ||
    '';

  if (guestToken) {
    const verifiedEmail = verifyGuestEntitlementToken(guestToken);
    if (verifiedEmail) {
      return {
        email: verifiedEmail,
        userId: null,
        isGuest: true,
      };
    }
  }

  return null;
}

/**
 * Atomically merges guest purchases to an authenticated user account.
 * Requires cryptographic proof of ownership (signed guest token).
 * Email alone is NEVER accepted as proof of ownership.
 */
export async function claimGuestEntitlements(
  paramsOrUserId:
    | {
        userId: string;
        userEmail: string;
        guestToken: string;
        customDb?: DbClient;
      }
    | string,
  userEmailArg?: string,
  guestTokenArg?: string,
  customDbArg?: DbClient
): Promise<{
  success: boolean;
  claimedCount: number;
  alreadyClaimed: boolean;
}> {
  let userId: string;
  let userEmail: string;
  let guestToken: string;
  let customDb: DbClient | undefined;

  if (typeof paramsOrUserId === 'object') {
    userId = paramsOrUserId.userId;
    userEmail = paramsOrUserId.userEmail;
    guestToken = paramsOrUserId.guestToken;
    customDb = paramsOrUserId.customDb;
  } else {
    userId = paramsOrUserId;
    userEmail = userEmailArg || '';
    guestToken = guestTokenArg || '';
    customDb = customDbArg;
  }

  // 1. Enforce that a guest token must be provided (Email alone is NOT sufficient proof)
  if (!guestToken || typeof guestToken !== 'string') {
    throw new Error(
      'GUEST_TOKEN_REQUIRED: A cryptographically signed guest token is required to claim purchases. Email alone is not proof of ownership.'
    );
  }

  // 2. Cryptographically verify guest token signature and expiration
  const tokenEmail = verifyGuestEntitlementToken(guestToken);
  if (!tokenEmail) {
    throw new Error(
      'INVALID_GUEST_TOKEN: The provided guest token is invalid, altered, or expired.'
    );
  }

  const normEmail = normalizeEmail(userEmail);
  if (tokenEmail !== normEmail) {
    throw new Error(
      'GUEST_TOKEN_EMAIL_MISMATCH: The guest token does not belong to the authenticated account email.'
    );
  }

  const db = customDb || getDb();

  return await db.transaction(async (tx) => {
    // 3. Verify that the authenticated user exists
    const user = await tx.queryOne<any>('SELECT id FROM users WHERE id = $1', [userId]);
    if (!user) {
      throw new Error(`USER_NOT_FOUND: User ID "${userId}" does not exist.`);
    }

    // 4. Verify that the guest purchase hasn't already been claimed by a different account
    const existingEnt = await tx.queryOne<any>(
      'SELECT id, user_id FROM user_entitlements WHERE LOWER(email) = LOWER($1)',
      [normEmail]
    );

    if (existingEnt && existingEnt.user_id) {
      if (existingEnt.user_id !== userId) {
        throw new Error(
          'ALREADY_CLAIMED_BY_ANOTHER_ACCOUNT: This guest purchase has already been claimed by a different account.'
        );
      }
      // Repeated claim by the same account is idempotent
      return {
        success: true,
        claimedCount: 0,
        alreadyClaimed: true,
      };
    }

    // 5. Link unassociated orders matching email
    await tx.execute(
      `UPDATE payment_orders
       SET user_id = $1, updated_at = $2
       WHERE LOWER(email) = LOWER($3) AND user_id IS NULL`,
      [userId, Date.now(), normEmail]
    );

    // 6. Link unassociated user_entitlements matching email
    const updated = await tx.execute(
      `UPDATE user_entitlements
       SET user_id = $1, updated_at = $2
       WHERE LOWER(email) = LOWER($3) AND user_id IS NULL`,
      [userId, Date.now(), normEmail]
    );

    if (updated.rowCount > 0 && existingEnt) {
      await tx.execute(
        `INSERT INTO entitlement_ledger (id, entitlement_id, delta, reason, reference_id, created_at)
         VALUES ($1, $2, 0, 'account_claim_merge', $3, $4)`,
        ['led_' + crypto.randomUUID().slice(0, 8), existingEnt.id, userId, Date.now()]
      );
    }

    return {
      success: true,
      claimedCount: updated.rowCount,
      alreadyClaimed: false,
    };
  });
}

function parseCookies(cookieStr: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieStr) return out;
  cookieStr.split(';').forEach((pair) => {
    const [k, v] = pair.trim().split('=');
    if (k && v) out[k] = decodeURIComponent(v);
  });
  return out;
}
