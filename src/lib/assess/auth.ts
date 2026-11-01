import { getDb } from './db';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export interface AssessUser {
  id: string;
  email: string;
  role: 'admin' | 'candidate' | 'user';
  name: string;
  department: string;
  college?: string;
  must_change_password?: number;
  status: 'active' | 'suspended';
  created_at: number;
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const COOKIE_NAME = 'struct_exam_token';
export const LEGACY_COOKIE_NAME = 'talvyn_assess_token';

export async function createSession(userId: string): Promise<{ token: string; expiresAt: number }> {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const sessionId = 'ses_' + crypto.randomUUID();

  await db.execute(
    `INSERT INTO sessions (id, token, user_id, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [sessionId, token, userId, expiresAt, Date.now()]
  );

  return { token, expiresAt };
}

export async function verifySession(token: string): Promise<AssessUser | null> {
  if (!token) return null;
  const db = getDb();

  const sessionRow = await db.queryOne<AssessUser & { expires_at: number | string }>(
    `SELECT s.expires_at, u.id, u.email, u.role, u.name, u.department, u.college, u.status, u.must_change_password, u.created_at
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = $1`,
    [token]
  );

  if (!sessionRow) return null;

  const expiresAtNum = Number(sessionRow.expires_at);
  if (Date.now() > expiresAtNum || sessionRow.status !== 'active') {
    // Session expired or suspended
    await db.execute('DELETE FROM sessions WHERE token = $1', [token]);
    return null;
  }

  return {
    id: sessionRow.id,
    email: sessionRow.email,
    role: sessionRow.role,
    name: sessionRow.name,
    department: sessionRow.department,
    college: sessionRow.college,
    must_change_password: Number(sessionRow.must_change_password || 0),
    status: sessionRow.status,
    created_at: Number(sessionRow.created_at),
  };
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  const db = getDb();
  await db.execute('DELETE FROM sessions WHERE token = $1', [token]);
}

export async function getSessionUser(request?: Request): Promise<AssessUser | null> {
  let token: string | undefined;

  // 1. Try Bearer header
  if (request) {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  // 2. Try canonical cookie first, then legacy cookie fallback
  if (!token) {
    try {
      const cookieStore = await cookies();
      const cookie = cookieStore.get(COOKIE_NAME) || cookieStore.get(LEGACY_COOKIE_NAME);
      if (cookie) {
        token = cookie.value;
      }
    } catch {
      // In standalone non-Next server context or scripts
    }
  }

  if (!token && request) {
    // Fallback: parse Cookie header manually if cookies() failed
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|; )(?:${COOKIE_NAME}|${LEGACY_COOKIE_NAME})=([^;]*)`));
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) return null;
  return await verifySession(token);
}

export async function requireAuth(request: Request): Promise<AssessUser> {
  const user = await getSessionUser(request);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireAdmin(request: Request): Promise<AssessUser> {
  const user = await requireAuth(request);
  if (user.role !== 'admin') {
    throw new Error('FORBIDDEN_ADMIN_REQUIRED');
  }
  return user;
}

export async function requireCandidate(request: Request): Promise<AssessUser> {
  const user = await requireAuth(request);
  if (user.role !== 'candidate' && user.role !== 'user') {
    throw new Error('FORBIDDEN_CANDIDATE_REQUIRED');
  }
  return user;
}
