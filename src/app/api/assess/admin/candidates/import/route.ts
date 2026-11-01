import { NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';
import crypto from 'node:crypto';

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const { csvText, assignExamId } = body;

    if (!csvText || typeof csvText !== 'string') {
      return NextResponse.json({ error: 'Valid CSV content is required' }, { status: 400 });
    }

    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must include a header and at least one candidate row' }, { status: 400 });
    }

    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const nameIdx = header.indexOf('name');
    const emailIdx = header.indexOf('email');
    const passwordIdx = header.indexOf('password');
    const deptIdx = header.indexOf('department');
    const collegeIdx = header.indexOf('college');

    if (nameIdx === -1 || emailIdx === -1) {
      return NextResponse.json({
        error: 'CSV header must include at least "name" and "email" columns (optional: password, department, college)'
      }, { status: 400 });
    }

    const db = getDb();
    const now = Date.now();
    const errors: Array<{ row: number; email?: string; error: string }> = [];
    const createdCandidates: Array<{ id: string; email: string; name: string }> = [];
    const seenEmailsInCsv = new Set<string>();

    // Parse lines (skipping header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cells: string[] = [];
      let current = '';
      let insideQuotes = false;
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          cells.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current.trim().replace(/^["']|["']$/g, ''));

      const rowNum = i + 1;
      const name = cells[nameIdx] || '';
      const email = (cells[emailIdx] || '').toLowerCase().trim();
      const rawPassword = passwordIdx !== -1 ? (cells[passwordIdx] || '') : 'TalvynCand2026!';
      const department = deptIdx !== -1 ? (cells[deptIdx] || 'General') : 'General';
      const college = collegeIdx !== -1 ? (cells[collegeIdx] || '') : '';

      if (!name) {
        errors.push({ row: rowNum, error: 'Missing candidate name' });
        continue;
      }
      if (!email || !email.includes('@') || !email.includes('.')) {
        errors.push({ row: rowNum, error: `Invalid email address format: "${email}"` });
        continue;
      }
      if (seenEmailsInCsv.has(email)) {
        errors.push({ row: rowNum, email, error: 'Duplicate email within uploaded CSV' });
        continue;
      }
      seenEmailsInCsv.add(email);

      // Check database duplicate
      const existing = await db.queryOne<{ id: string }>(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
      );
      if (existing) {
        errors.push({ row: rowNum, email, error: 'Candidate already exists in database' });
        continue;
      }

      const userId = 'usr_cand_' + crypto.randomUUID().slice(0, 8);
      const passwordToHash = rawPassword.length >= 6 ? rawPassword : 'TalvynCand2026!';
      const { hash, salt } = hashPassword(passwordToHash);

      try {
        await db.execute(`
          INSERT INTO users (id, email, password_hash, salt, role, name, department, college, status, created_at)
          VALUES ($1, $2, $3, $4, 'candidate', $5, $6, $7, 'active', $8)
        `, [userId, email, hash, salt, name, department, college, now]);

        if (assignExamId) {
          await db.execute(`
            INSERT INTO exam_assignments (id, exam_id, candidate_id, assigned_at, status)
            VALUES ($1, $2, $3, $4, 'assigned')
            ON CONFLICT (exam_id, candidate_id) DO NOTHING
          `, [`asg_${assignExamId}_${userId}`, assignExamId, userId, now]);
        }
        createdCandidates.push({ id: userId, email, name });
      } catch (err: any) {
        errors.push({ row: rowNum, email, error: err.message || 'Database insert failed' });
      }
    }

    // Log admin audit
    await db.execute(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
      VALUES ($1, $2, 'csv_import_candidates', 'user', 'batch', $3, $4)
    `, [
      'aud_' + crypto.randomUUID().slice(0, 8),
      admin.id,
      `Imported ${createdCandidates.length} candidates, ${errors.length} errors`,
      now
    ]);

    return NextResponse.json({
      success: true,
      totalRows: lines.length - 1,
      importedCount: createdCandidates.length,
      errorsCount: errors.length,
      errors,
      createdCandidates,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to process CSV import' }, { status: 500 });
  }
}
