import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function seedPractice() {
  // 1. Update exam_public_practice_2026 to be is_practice = 1 and status = published
  await pool.query(`
    UPDATE exams 
    SET is_practice = 1, status = 'published', duration_minutes = 15, total_marks = 10, pass_marks = 6
    WHERE id = 'exam_public_practice_2026'
  `);

  // 2. Link the 10 core questions to exam_public_practice_2026
  const qIds = [
    'q_ts_1', 'q_react_1', 'q_next_1', 'q_sql_1', 'q_sys_1',
    'q_perf_1', 'q_sec_1', 'q_ts_2', 'q_alg_1', 'q_net_1'
  ];

  for (let i = 0; i < qIds.length; i++) {
    const qId = qIds[i];
    await pool.query(`
      INSERT INTO exam_questions (id, exam_id, question_id, order_index, is_mandatory)
      VALUES ($1, 'exam_public_practice_2026', $2, $3, 1)
      ON CONFLICT (exam_id, question_id) DO NOTHING
    `, [`eq_prac_${i+1}`, qId, i + 1]);
  }

  console.log('Successfully configured exam_public_practice_2026 with 10 questions!');
}

seedPractice()
  .then(() => pool.end())
  .catch(err => {
    console.error(err);
    pool.end();
  });
