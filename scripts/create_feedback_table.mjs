import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
CREATE TABLE IF NOT EXISTS exam_feedback (
  id VARCHAR(64) PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL,
  attempt_id VARCHAR(64),
  candidate_email VARCHAR(255) NOT NULL,
  candidate_name VARCHAR(255),
  overall_rating INTEGER NOT NULL,
  navigation_rating INTEGER NOT NULL,
  technical_issues VARCHAR(100),
  liked_aspects TEXT,
  improvement_suggestions TEXT,
  would_recommend VARCHAR(20),
  marketing_consent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exam_feedback_exam_id ON exam_feedback(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_feedback_email ON exam_feedback(candidate_email);
`;

try {
  await pool.query(sql);
  console.log('SUCCESS: exam_feedback table created/verified successfully.');
} catch (err) {
  console.error('ERROR creating exam_feedback table:', err);
  process.exit(1);
} finally {
  await pool.end();
}
