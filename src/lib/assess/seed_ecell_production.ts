import fs from 'fs';
import path from 'path';
import { getDb, hashPassword } from './db';

// Helper to parse CSV properly handling quotes and commas
function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: string[][] = [];

  for (const line of lines) {
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
    rows.push(row);
  }
  return rows;
}

export async function seedProductionData() {
  const db = getDb();
  console.log('[Seed] Initializing 11 ECELL departments, 240 questions, and student directory...');

  // 0. Ensure schema migrations
  await db.execute(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(64) DEFAULT '';
  `);
  await db.execute(`
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS department VARCHAR(128) DEFAULT '';
  `);
  await db.execute(`
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(64) DEFAULT 'department';
  `);

  // Ensure exam_ecell_round1_2026 exists in exams
  const now = Date.now();
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

  // 1. Setup 11 Departments
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
      is_active INT DEFAULT 1,
      created_at BIGINT
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
  console.log('[Seed] 11 active departments updated in database.');

  // 2. Parse and seed Questions from CSV
  const questionsPath = path.join(process.cwd(), 'src/data/ecell_questions.csv');
  const questionsText = fs.readFileSync(questionsPath, 'utf8');
  const qRows = parseCSV(questionsText);
  // Header: Category,Department,Question,Option A,Option B,Option C,Option D,Correct Answer,Difficulty,Explanation,Active
  const header = qRows[0];
  console.log('[Seed] Header:', header);

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

  // Clean old questions for ECELL exam
  await db.execute(`DELETE FROM questions WHERE id LIKE 'ecell_q_%'`);

  let qCount = 0;
  for (let i = 1; i < qRows.length; i++) {
    const r = qRows[i];
    if (r.length < 8) continue;

    const rawDept = r[1]?.trim().toLowerCase();
    const questionText = r[2]?.trim();
    const optA = r[3]?.trim();
    const optB = r[4]?.trim();
    const optC = r[5]?.trim();
    const optD = r[6]?.trim();
    const correctLetter = r[7]?.trim().toUpperCase();
    const difficulty = r[8]?.trim().toLowerCase() || 'medium';
    const explanation = r[9]?.trim() || '';

    if (!questionText || !optA || !correctLetter) continue;

    const correctIndex = correctLetter === 'A' ? 0 : correctLetter === 'B' ? 1 : correctLetter === 'C' ? 2 : 3;
    const deptCode = deptMap[rawDept] || 'TECHNICAL';
    const questionType = deptCode === 'ENTREPRENEURSHIP' ? 'entrepreneurship' : 'department';
    const qId = `ecell_q_${deptCode.toLowerCase()}_${i}`;

    const optionsJson = JSON.stringify([optA, optB, optC, optD]);

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
        questionText,
        deptCode,
        difficulty,
        explanation,
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
      [`eq_${qId}`, qId, i]
    );

    qCount++;
  }
  console.log(`[Seed] Successfully seeded ${qCount} production questions into bank.`);

  // 3. Parse and seed Students from CSV
  const studentsPath = path.join(process.cwd(), 'src/data/ecell_students.csv');
  const studentsText = fs.readFileSync(studentsPath, 'utf8');
  const sRows = parseCSV(studentsText);

  // Pre-hash default candidate password once
  const defaultPass = 'Ecellhirings2026!';
  const { hash: defaultHash, salt: defaultSalt } = hashPassword(defaultPass);

  const seenEmails = new Set<string>();
  let studentCount = 0;

  for (let i = 1; i < sRows.length; i++) {
    const r = sRows[i];
    if (r.length < 2) continue;

    const email = r[0]?.trim().toLowerCase();
    const name = r[1]?.trim() || 'Candidate';
    const phone = r[2]?.trim() || '';
    const pass = r[3]?.trim() || defaultPass;

    if (!email || !email.includes('@')) continue;
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);

    // Roll number or email prefix
    const emailPrefix = email.split('@')[0];
    const candidateId = `usr_${emailPrefix.replace(/[^a-zA-Z0-9_]/g, '_')}`;

    let hash = defaultHash;
    let salt = defaultSalt;
    if (pass !== defaultPass) {
      const computed = hashPassword(pass);
      hash = computed.hash;
      salt = computed.salt;
    }

    await db.execute(
      `INSERT INTO users (
        id, email, password_hash, salt, role, name, phone, college, status, created_at
      ) VALUES ($1, $2, $3, $4, 'candidate', $5, $6, 'Vishnu Educational Development', 'active', $7)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        password_hash = EXCLUDED.password_hash,
        salt = EXCLUDED.salt,
        status = 'active'`,
      [candidateId, email, hash, salt, name, phone, now]
    );
    studentCount++;
  }

  // Ensure candidate@talvyn.com is available for testing
  const candTest = hashPassword('CandidatePass123!');
  await db.execute(
    `INSERT INTO users (id, email, password_hash, salt, role, name, phone, status, created_at)
     VALUES ('usr_cand_demo', 'candidate@talvyn.com', $1, $2, 'candidate', 'Demo Candidate', '9999999999', 'active', $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = $1, salt = $2, status = 'active'`,
    [candTest.hash, candTest.salt, now]
  );

  console.log(`[Seed] Successfully seeded ${studentCount} verified student records.`);
}

if (require.main === module) {
  seedProductionData()
    .then(() => {
      console.log('Production seeding completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
