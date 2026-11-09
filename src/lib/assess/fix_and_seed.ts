import fs from 'fs';
import path from 'path';
import { getDb, hashPassword } from './db';

// Robust CSV parser
function parseCSVLine(line: string): string[] {
  const row: string[] = [];
  let insideQuote = false;
  let entry = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuote && line[i + 1] === '"') {
        entry += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      row.push(entry.trim());
      entry = '';
    } else {
      entry += char;
    }
  }
  row.push(entry.trim());
  return row;
}

export async function run() {
  const qPath = path.join(process.cwd(), 'src/data/ecell_questions.csv');
  const lines = fs.readFileSync(qPath, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);

  console.log(`Processing ${lines.length - 1} question rows...`);

  interface QuestionData {
    category: string;
    department: string;
    question: string;
    optA: string;
    optB: string;
    optC: string;
    optD: string;
    correctLetter: string;
    difficulty: string;
    explanation: string;
  }

  const cleanedQuestions: QuestionData[] = [];

  for (let idx = 1; idx < lines.length; idx++) {
    const rawTokens = parseCSVLine(lines[idx]);

    // Find the correctLetter and difficulty by scanning tokens
    // difficulty is one of 'easy', 'medium', 'hard'
    let diffIdx = -1;
    for (let j = rawTokens.length - 1; j >= 0; j--) {
      const lower = rawTokens[j].toLowerCase();
      if (['easy', 'medium', 'hard'].includes(lower)) {
        diffIdx = j;
        break;
      }
    }

    if (diffIdx === -1) {
      console.warn(`Line ${idx} has no valid difficulty:`, lines[idx]);
      continue;
    }

    const difficulty = rawTokens[diffIdx].toLowerCase();
    const correctLetter = rawTokens[diffIdx - 1]?.trim().toUpperCase();
    const explanation = rawTokens[diffIdx + 1]?.trim() || '';

    // Everything before correctLetter:
    // token 0 = Category
    // token 1 = Department
    // token 2 = Question
    // tokens 3 to (diffIdx - 2) = Options!
    const category = rawTokens[0];
    const department = rawTokens[1];
    const question = rawTokens[2];

    const optTokens = rawTokens.slice(3, diffIdx - 1);
    let optA = '', optB = '', optC = '', optD = '';

    if (optTokens.length === 4) {
      [optA, optB, optC, optD] = optTokens;
    } else {
      // Unquoted commas happened inside options (e.g. Rs 1, 000)
      console.log(`Line ${idx}: optTokens has ${optTokens.length} elements:`, optTokens);
      // Reassemble smartly
      // If 5 elements, two adjacent were parts of a number like "Rs 1" and "000"
      const recombined: string[] = [];
      for (let k = 0; k < optTokens.length; k++) {
        const cur = optTokens[k];
        if (/^\d{3}$/.test(cur) && recombined.length > 0) {
          recombined[recombined.length - 1] = `${recombined[recombined.length - 1]},${cur}`;
        } else {
          recombined.push(cur);
        }
      }
      if (recombined.length === 4) {
        [optA, optB, optC, optD] = recombined;
      } else {
        // Fallback
        optA = recombined[0] || '';
        optB = recombined[1] || '';
        optC = recombined[2] || '';
        optD = recombined.slice(3).join(', ') || '';
      }
    }

    cleanedQuestions.push({
      category,
      department,
      question,
      optA,
      optB,
      optC,
      optD,
      correctLetter,
      difficulty,
      explanation
    });
  }

  console.log(`Successfully parsed and normalized ${cleanedQuestions.length} questions.`);

  const db = getDb();
  const now = Date.now();

  // 1. Ensure migrations
  await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(64) DEFAULT '';`);
  await db.execute(`ALTER TABLE attempts ADD COLUMN IF NOT EXISTS department VARCHAR(128) DEFAULT '';`);
  await db.execute(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(64) DEFAULT 'department';`);

  // Ensure exam record
  await db.execute(
    `INSERT INTO exams (
      id, title, code, description, department, duration_minutes, pass_marks, total_marks,
      negative_marking_enabled, shuffle_questions, allow_back_navigation, show_answer_key,
      random_question_count, enable_fullscreen, enable_ai_defense, enable_anti_google,
      auth_mode, access_scope, max_attempts, is_practice, status, results_released, instructions,
      created_at, updated_at
    ) VALUES (
      'exam_ecell_round1_2026',
      'ECELL Hiring — Round 1',
      'ECELL-R1-2026',
      'Official ECELL Recruitment Online Assessment 2026',
      'All Departments',
      15,
      8.0,
      20.0,
      0,
      1,
      1,
      0,
      20,
      1,
      1,
      1,
      'exam_only',
      'single',
      1,
      0,
      'published',
      0,
      '20 Questions. 15 Minutes. 15 Department Questions + 5 Entrepreneurship Questions. Single Attempt.',
      $1,
      $1
    ) ON CONFLICT (id) DO UPDATE SET
      status = 'published',
      duration_minutes = 15,
      total_marks = 20.0,
      instructions = EXCLUDED.instructions`,
    [now]
  );

  // 2. Setup 11 Departments
  const departments = [
    { code: 'TECHNICAL', name: 'Technical', desc: 'Web development, software engineering, systems, and technical infrastructure.', order: 1 },
    { code: 'DESIGN', name: 'Design', desc: 'Graphic design, UI/UX, visual branding, typography, and creative identity.', order: 2 },
    { code: 'MARKETING', name: 'Marketing & Outreach', desc: 'Campaign strategies, student acquisition, branding, and conversion funnels.', order: 3 },
    { code: 'EVENTS', name: 'Event Management', desc: 'Planning, scheduling, speaker coordination, budgeting, and event rundowns.', order: 4 },
    { code: 'CONTENT_MEDIA', name: 'Content & Media', desc: 'Social media storytelling, copywriting, calendars, and editorial production.', order: 5 },
    { code: 'VIDEOGRAPHY', name: 'Videography', desc: 'Shooting, composition, sound engineering, B-roll, and video editing.', order: 6 },
    { code: 'INCUBATION', name: 'Incubation & Innovation', desc: 'Startup mentoring, prototyping, MVPs, venture validation, and pitch decks.', order: 7 },
    { code: 'PR_HR', name: 'PR & HR', desc: 'Public relations, internal culture, team onboarding, and talent evaluations.', order: 8 },
    { code: 'SPONSORSHIP', name: 'Sponsorship', desc: 'Corporate partnerships, sponsorship packages, deliverables, and relationship management.', order: 9 },
    { code: 'LOGISTICS', name: 'Logistics & Operations', desc: 'Venue coordination, inventory tracking, equipment management, and contingency planning.', order: 10 },
    { code: 'OFFSTAGE', name: 'Off-Stage', desc: 'Backstage readiness, prop management, cue cards, and performer transitions.', order: 11 },
  ];

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ecell_departments (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      order_index INT DEFAULT 0,
      is_active INT DEFAULT 1
    )
  `);

  await db.execute(`DELETE FROM ecell_departments`);

  for (const dept of departments) {
    await db.execute(
      `INSERT INTO ecell_departments (id, name, code, description, order_index, is_active)
       VALUES ($1, $2, $3, $4, $5, 1)
       ON CONFLICT (id) DO UPDATE SET
         code = EXCLUDED.code,
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         order_index = EXCLUDED.order_index,
         is_active = 1`,
      [`dept_${dept.code.toLowerCase()}`, dept.name, dept.code, dept.desc, dept.order]
    );
  }
  console.log('[Seed] 11 active departments updated.');

  // 3. Clear and seed Questions
  await db.execute(`DELETE FROM questions WHERE id LIKE 'ecell_q_%'`);

  const deptMap: Record<string, string> = {
    'marketing & outreach': 'MARKETING',
    'design': 'DESIGN',
    'event management': 'EVENTS',
    'videography': 'VIDEOGRAPHY',
    'content & media': 'CONTENT_MEDIA',
    'incubation & innovation': 'INCUBATION',
    'pr & hr': 'PR_HR',
    'sponsorship': 'SPONSORSHIP',
    'logistics & operations': 'LOGISTICS',
    'off-stage': 'OFFSTAGE',
    'technical': 'TECHNICAL',
    'entrepreneurship': 'ENTREPRENEURSHIP',
  };

  let qCount = 0;
  for (let i = 0; i < cleanedQuestions.length; i++) {
    const q = cleanedQuestions[i];
    const deptKey = q.department.toLowerCase().trim();
    const deptCode = deptMap[deptKey] || 'TECHNICAL';
    const questionType = deptCode === 'ENTREPRENEURSHIP' ? 'entrepreneurship' : 'department';
    const qId = `ecell_q_${deptCode.toLowerCase()}_${i + 1}`;

    const correctIndex = q.correctLetter === 'A' ? 0 : q.correctLetter === 'B' ? 1 : q.correctLetter === 'C' ? 2 : 3;
    const optionsJson = JSON.stringify([q.optA, q.optB, q.optC, q.optD]);

    await db.execute(
      `INSERT INTO questions (
        id, text, category, difficulty, marks, negative_marks, explanation,
        options_json, correct_option_index, is_mandatory, created_at, question_type
      ) VALUES ($1, $2, $3, $4, 1.0, 0.0, $5, $6, $7, 0, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        text = EXCLUDED.text,
        category = EXCLUDED.category,
        difficulty = EXCLUDED.difficulty,
        explanation = EXCLUDED.explanation,
        options_json = EXCLUDED.options_json,
        correct_option_index = EXCLUDED.correct_option_index,
        question_type = EXCLUDED.question_type`,
      [
        qId,
        q.question,
        deptCode,
        q.difficulty,
        q.explanation,
        optionsJson,
        correctIndex,
        now,
        questionType,
      ]
    );

    await db.execute(
      `INSERT INTO exam_questions (id, exam_id, question_id, order_index, is_mandatory)
       VALUES ($1, 'exam_ecell_round1_2026', $2, $3, 0)
       ON CONFLICT (exam_id, question_id) DO NOTHING`,
      [`eq_${qId}`, qId, i + 1]
    );

    qCount++;
  }
  console.log(`[Seed] Successfully inserted ${qCount} questions into database.`);

  // 4. Seed Students
  const sPath = path.join(process.cwd(), 'src/data/ecell_students.csv');
  const sLines = fs.readFileSync(sPath, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);

  const defaultPass = 'Ecellhirings2026!';
  const { hash: defaultHash, salt: defaultSalt } = hashPassword(defaultPass);

  const seenEmails = new Set<string>();
  let studentCount = 0;

  for (let i = 1; i < sLines.length; i++) {
    const r = parseCSVLine(sLines[i]);
    if (r.length < 2) continue;

    const email = r[0]?.trim().toLowerCase();
    const name = r[1]?.trim() || 'Candidate';
    const phone = r[2]?.trim() || '';
    const pass = r[3]?.trim() || defaultPass;

    if (!email || !email.includes('@')) continue;
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);

    const emailPrefix = email.split('@')[0];
    const candidateId = `usr_${emailPrefix.replace(/[^a-zA-Z0-9_]/g, '_')}`;

    let hash = defaultHash;
    let salt = defaultSalt;
    if (pass !== defaultPass) {
      const computed = hashPassword(pass);
      hash = computed.hash;
      salt = computed.salt;
    }

    const existing = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing) {
      await db.execute(
        `UPDATE users SET name = $1, phone = $2, password_hash = $3, salt = $4, status = 'active' WHERE id = $5`,
        [name, phone, hash, salt, existing.id]
      );
    } else {
      await db.execute(
        `INSERT INTO users (id, email, password_hash, salt, role, name, phone, college, status, created_at)
         VALUES ($1, $2, $3, $4, 'candidate', $5, $6, 'Vishnu Educational Development', 'active', $7)`,
        [candidateId, email, hash, salt, name, phone, now]
      );
    }
    studentCount++;
  }

  // Ensure candidate@talvyn.com is available for testing
  const candTest = hashPassword('CandidatePass123!');
  const demoExists = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', ['candidate@talvyn.com']);
  if (demoExists) {
    await db.execute(`UPDATE users SET password_hash = $1, salt = $2, status = 'active' WHERE id = $3`, [candTest.hash, candTest.salt, demoExists.id]);
  } else {
    await db.execute(
      `INSERT INTO users (id, email, password_hash, salt, role, name, phone, status, created_at)
       VALUES ('usr_cand_demo', 'candidate@talvyn.com', $1, $2, 'candidate', 'Demo Candidate', '9999999999', 'active', $3)`,
      [candTest.hash, candTest.salt, now]
    );
  }

  console.log(`[Seed] Successfully seeded ${studentCount} verified student records.`);
  process.exit(0);
}

run().catch((e) => {
  console.error('[Seed Error]', e);
  process.exit(1);
});
