import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/assess/auth';
import { getDb, hashPassword } from '@/lib/assess/db';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Administrative privileges required' }, { status: 403 });
    }

    const body = await request.json();
    const { students } = body; // Array of { id, name, email, password, department, college }

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'Array of student records is required' }, { status: 400 });
    }

    const db = getDb();
    const now = Date.now();
    let imported = 0;
    let skipped = 0;

    for (const s of students) {
      const email = (s.email || '').trim().toLowerCase();
      const rawPassword = s.password || 'ecell2026';
      const name = (s.name || '').trim();
      const studentId = (s.id || s.registrationId || '').trim() || 'std_' + Math.random().toString(36).substring(2, 9);
      const department = (s.department || '').trim().toUpperCase();
      const college = (s.college || '').trim();

      if (!email || !email.includes('@')) {
        skipped++;
        continue;
      }

      const { hash, salt } = hashPassword(rawPassword);

      try {
        await db.execute(
          `INSERT INTO users (
            id, email, password_hash, salt, role, name, department, college, status, must_change_password, created_at
          ) VALUES ($1, $2, $3, $4, 'candidate', $5, $6, $7, 'active', 0, $8)
          ON CONFLICT (LOWER(email)) DO UPDATE SET
            name = EXCLUDED.name,
            department = CASE WHEN EXCLUDED.department != '' THEN EXCLUDED.department ELSE users.department END,
            college = CASE WHEN EXCLUDED.college != '' THEN EXCLUDED.college ELSE users.college END`,
          [studentId, email, hash, salt, name, department, college, now]
        );
        imported++;
      } catch (err) {
        console.warn(`[Admin Import] Skipped record ${email}:`, err);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      message: `Successfully processed ${imported} student record(s).`,
    });
  } catch (error: any) {
    console.error('[Admin ECELL Students Import Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to import students' }, { status: 500 });
  }
}
