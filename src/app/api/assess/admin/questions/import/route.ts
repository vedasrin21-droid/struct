import { NextResponse } from 'next/server';
import { getDb } from '@/lib/assess/db';
import { requireAdmin } from '@/lib/assess/auth';
import crypto from 'node:crypto';

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const { csvText } = body;

    if (!csvText || typeof csvText !== 'string') {
      return NextResponse.json({ error: 'Valid CSV content is required' }, { status: 400 });
    }

    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must include a header and at least one question row' }, { status: 400 });
    }

    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const textIdx = header.findIndex(h => h === 'text' || h === 'question');
    const catIdx = header.findIndex(h => h === 'category' || h === 'topic');
    const diffIdx = header.indexOf('difficulty');
    const opt1Idx = header.findIndex(h => h === 'option1' || h === 'option_1' || h === 'a');
    const opt2Idx = header.findIndex(h => h === 'option2' || h === 'option_2' || h === 'b');
    const opt3Idx = header.findIndex(h => h === 'option3' || h === 'option_3' || h === 'c');
    const opt4Idx = header.findIndex(h => h === 'option4' || h === 'option_4' || h === 'd');
    const correctIdx = header.findIndex(h => h === 'correct' || h === 'answer' || h === 'correct_option');
    const expIdx = header.indexOf('explanation');

    if (textIdx === -1 || opt1Idx === -1 || opt2Idx === -1 || opt3Idx === -1 || opt4Idx === -1 || correctIdx === -1) {
      return NextResponse.json({
        error: 'CSV header must include: text, option1, option2, option3, option4, correct (optional: category, difficulty, explanation)'
      }, { status: 400 });
    }

    const db = getDb();
    const now = Date.now();
    const errors: Array<{ row: number; error: string }> = [];
    const createdQuestions: any[] = [];

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
      const text = cells[textIdx] || '';
      const category = catIdx !== -1 ? (cells[catIdx] || 'General') : 'General';
      let difficulty = diffIdx !== -1 ? (cells[diffIdx] || 'medium').toLowerCase() : 'medium';
      if (!['easy', 'medium', 'hard'].includes(difficulty)) difficulty = 'medium';

      const opt1 = cells[opt1Idx] || '';
      const opt2 = cells[opt2Idx] || '';
      const opt3 = cells[opt3Idx] || '';
      const opt4 = cells[opt4Idx] || '';
      const options = [opt1, opt2, opt3, opt4];

      const rawCorrect = (cells[correctIdx] || '').trim();
      let correctIndex = -1;
      if (['1', '2', '3', '4'].includes(rawCorrect)) {
        correctIndex = parseInt(rawCorrect, 10) - 1;
      } else if (['0', '1', '2', '3'].includes(rawCorrect)) {
        correctIndex = parseInt(rawCorrect, 10);
      } else if (['a', 'b', 'c', 'd'].includes(rawCorrect.toLowerCase())) {
        correctIndex = { a: 0, b: 1, c: 2, d: 3 }[rawCorrect.toLowerCase()]!;
      }

      const explanation = expIdx !== -1 ? (cells[expIdx] || '') : '';

      if (!text) {
        errors.push({ row: rowNum, error: 'Empty question text' });
        continue;
      }
      if (options.some(o => !o)) {
        errors.push({ row: rowNum, error: 'All 4 options must be filled' });
        continue;
      }
      if (correctIndex < 0 || correctIndex > 3) {
        errors.push({ row: rowNum, error: `Invalid correct option identifier: "${rawCorrect}". Use 1-4, 0-3, or A-D.` });
        continue;
      }

      const qId = 'q_' + crypto.randomUUID().slice(0, 8);
      try {
        await db.execute(`
          INSERT INTO questions (
            id, text, category, difficulty, marks, negative_marks, explanation,
            options_json, correct_option_index, created_at
          ) VALUES ($1, $2, $3, $4, 1.0, 0.25, $5, $6, $7, $8)
        `, [
          qId,
          text,
          category,
          difficulty,
          explanation,
          JSON.stringify(options),
          correctIndex,
          now
        ]);
        createdQuestions.push({ id: qId, text, category });
      } catch (err: any) {
        errors.push({ row: rowNum, error: err.message || 'Database insert failed' });
      }
    }

    await db.execute(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
      VALUES ($1, $2, 'csv_import_questions', 'question', 'batch', $3, $4)
    `, [
      'aud_' + crypto.randomUUID().slice(0, 8),
      admin.id,
      `Imported ${createdQuestions.length} questions, ${errors.length} errors`,
      now
    ]);

    return NextResponse.json({
      success: true,
      totalRows: lines.length - 1,
      importedCount: createdQuestions.length,
      errorsCount: errors.length,
      errors,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN_ADMIN_REQUIRED') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to import questions' }, { status: 500 });
  }
}
