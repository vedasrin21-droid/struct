import { getDb } from './db';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export interface AssessUser {
  id: string;
  email: string;
  role: 'admin' | 'candidate';
  name: string;
  department: string;
  college?: string;
  must_change_password?: number;
  status: 'active' | 'suspended';
  created_at: number;
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const COOKIE_NAME = 'talvyn_assess_token';

export function createSession(userId: string): { token: string; expiresAt: number } {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const sessionId = 'ses_' + crypto.randomUUID();

  db.prepare(`
    INSERT INTO sessions (id, token, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(sessionId, token, userId, expiresAt, Date.now());

  return { token, expiresAt };
}

export function verifySession(token: string): AssessUser | null {
  if (!token) return null;
  const db = getDb();

  const sessionRow = db.prepare(`
    SELECT s.expires_at, u.id, u.email, u.role, u.name, u.department, u.college, u.status, u.created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `).get(token) as (AssessUser & { expires_at: number }) | undefined;

  if (!sessionRow) return null;

  if (Date.now() > sessionRow.expires_at || sessionRow.status !== 'active') {
    // Session expired or suspended
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }

  return {
    id: sessionRow.id,
    email: sessionRow.email,
    role: sessionRow.role,
    name: sessionRow.name,
    department: sessionRow.department,
    college: sessionRow.college,
    status: sessionRow.status,
    created_at: sessionRow.created_at,
  };
}

export function deleteSession(token: string): void {
  if (!token) return;
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
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

  // 2. Try cookie if header not provided
  if (!token) {
    try {
      const cookieStore = await cookies();
      const cookie = cookieStore.get(COOKIE_NAME);
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
    const match = cookieHeader.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) return null;
  return verifySession(token);
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
  if (user.role !== 'candidate') {
    throw new Error('FORBIDDEN_CANDIDATE_REQUIRED');
  }
  return user;
}
