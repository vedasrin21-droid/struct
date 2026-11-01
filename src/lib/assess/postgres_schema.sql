-- STRUCT SAAS PLATFORM — POSTGRESQL PRODUCTION SCHEMA
-- Fully relational, multi-tenant, indexed, and normalized for enterprise recruitment & career prep

-- 1. Users table (Super Admins, Org Admins, Individual Users, and Candidates)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  clerk_user_id VARCHAR(128) UNIQUE,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  salt VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'user' CHECK(role IN ('super_admin', 'admin', 'user', 'candidate')),
  name VARCHAR(255) NOT NULL,
  department VARCHAR(128) DEFAULT 'General',
  college VARCHAR(255) DEFAULT '',
  must_change_password SMALLINT DEFAULT 0,
  status VARCHAR(16) DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
  created_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

-- 2. Organizations table (Multi-tenant employer accounts)
CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(128) UNIQUE NOT NULL,
  domain VARCHAR(255) DEFAULT '',
  logo_url TEXT DEFAULT '',
  plan_tier VARCHAR(64) NOT NULL DEFAULT 'recruit_free',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orgs_slug_lower ON organizations(LOWER(slug));

-- 3. Organization Members table (RBAC for enterprise teams)
CREATE TABLE IF NOT EXISTS organization_members (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
  created_at BIGINT NOT NULL,
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);

-- 4. Sessions table (Dual support for exam-only sandboxed tokens & platform sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  token VARCHAR(128) UNIQUE NOT NULL,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- 5. Plans Catalog table
CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(64) PRIMARY KEY,
  tier_code VARCHAR(64) UNIQUE NOT NULL,
  target VARCHAR(32) NOT NULL CHECK(target IN ('individual', 'organization')),
  name VARCHAR(128) NOT NULL,
  price_inr INTEGER NOT NULL,
  billing_cycle VARCHAR(32) NOT NULL DEFAULT 'monthly',
  limits_json TEXT NOT NULL,
  is_active SMALLINT NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plans_tier ON plans(tier_code);
CREATE INDEX IF NOT EXISTS idx_plans_target ON plans(target);

-- 6. Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE SET NULL,
  plan_id VARCHAR(64) NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  razorpay_subscription_id VARCHAR(64),
  razorpay_customer_id VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start BIGINT NOT NULL,
  current_period_end BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_rzp ON subscriptions(razorpay_subscription_id);

-- 7. Promo Codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(64) UNIQUE NOT NULL,
  discount_type VARCHAR(16) NOT NULL CHECK(discount_type IN ('percent', 'fixed')),
  discount_value INTEGER NOT NULL CHECK(discount_value > 0),
  max_uses INTEGER NOT NULL DEFAULT 100,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at BIGINT,
  restrictions_json TEXT DEFAULT '{}',
  credit_grant_feature VARCHAR(64) DEFAULT '',
  credit_grant_amount INTEGER DEFAULT 0,
  is_active SMALLINT NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_codes_upper ON promo_codes(UPPER(code));

-- 8. Question Bank
CREATE TABLE IF NOT EXISTS questions (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  category VARCHAR(128) NOT NULL,
  difficulty VARCHAR(16) NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
  marks DOUBLE PRECISION DEFAULT 1.0,
  negative_marks DOUBLE PRECISION DEFAULT 0.25,
  explanation TEXT DEFAULT '',
  options_json TEXT NOT NULL,
  correct_option_index SMALLINT NOT NULL CHECK(correct_option_index BETWEEN 0 AND 3),
  is_mandatory SMALLINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_org ON questions(organization_id);

-- 9. Examination Configurations
CREATE TABLE IF NOT EXISTS exams (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  code VARCHAR(64) NOT NULL,
  description TEXT DEFAULT '',
  department VARCHAR(128) DEFAULT 'Engineering',
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  pass_marks DOUBLE PRECISION NOT NULL DEFAULT 6.0,
  total_marks DOUBLE PRECISION NOT NULL DEFAULT 10.0,
  negative_marking_enabled SMALLINT NOT NULL DEFAULT 1,
  shuffle_questions SMALLINT NOT NULL DEFAULT 1,
  allow_back_navigation SMALLINT NOT NULL DEFAULT 1,
  show_answer_key SMALLINT NOT NULL DEFAULT 1,
  random_question_count INTEGER DEFAULT 0,
  enable_fullscreen SMALLINT NOT NULL DEFAULT 1,
  enable_ai_defense SMALLINT NOT NULL DEFAULT 1,
  enable_anti_google SMALLINT NOT NULL DEFAULT 1,
  auth_mode VARCHAR(32) NOT NULL DEFAULT 'exam_only' CHECK(auth_mode IN ('exam_only', 'clerk', 'both')),
  access_scope VARCHAR(32) NOT NULL DEFAULT 'single' CHECK(access_scope IN ('single', 'multiple')),
  max_attempts INTEGER NOT NULL DEFAULT 1,
  is_practice SMALLINT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'closed')),
  results_released SMALLINT NOT NULL DEFAULT 0,
  instructions TEXT DEFAULT '',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exams_code_lower ON exams(LOWER(code));
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_org ON exams(organization_id);
CREATE INDEX IF NOT EXISTS idx_exams_department ON exams(department);

-- 10. Exam to Question Mappings (Preserves frozen exam template question set)
CREATE TABLE IF NOT EXISTS exam_questions (
  id VARCHAR(64) PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  is_mandatory SMALLINT NOT NULL DEFAULT 0,
  UNIQUE(exam_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_question ON exam_questions(question_id);

-- 11. Candidate Exam Assignments
CREATE TABLE IF NOT EXISTS exam_assignments (
  id VARCHAR(64) PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  candidate_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned', 'in_progress', 'submitted', 'expired')),
  UNIQUE(exam_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_assignments_candidate ON exam_assignments(candidate_id);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_exam ON exam_assignments(exam_id);

-- 12. Examination Attempts (Enforces attempt bounds per candidate per exam)
CREATE TABLE IF NOT EXISTS attempts (
  id VARCHAR(64) PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  candidate_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time BIGINT NOT NULL,
  deadline_time BIGINT NOT NULL,
  submitted_at BIGINT,
  score DOUBLE PRECISION DEFAULT 0.0,
  max_score DOUBLE PRECISION DEFAULT 0.0,
  pass_status VARCHAR(16) DEFAULT 'pending' CHECK(pass_status IN ('pending', 'passed', 'failed')),
  status VARCHAR(16) NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'submitted', 'expired', 'terminated')),
  ip_address VARCHAR(128) DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at BIGINT NOT NULL,
  UNIQUE(exam_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_attempts_candidate_exam ON attempts(candidate_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_attempts_exam_id ON attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON attempts(status);

-- 13. Candidate Attempt Frozen Questions (Immutable order & pool selection per attempt)
CREATE TABLE IF NOT EXISTS attempt_questions (
  id VARCHAR(64) PRIMARY KEY,
  attempt_id VARCHAR(64) NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  is_mandatory SMALLINT NOT NULL DEFAULT 0,
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_attempt_questions_attempt ON attempt_questions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_questions_question ON attempt_questions(question_id);

-- 14. Candidate Saved Answers with Version Concurrency Control
CREATE TABLE IF NOT EXISTS attempt_answers (
  id VARCHAR(64) PRIMARY KEY,
  attempt_id VARCHAR(64) NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_index SMALLINT,
  is_marked_for_review SMALLINT NOT NULL DEFAULT 0,
  saved_at BIGINT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_question ON attempt_answers(question_id);

-- 15. Security Proctoring Telemetry Events
CREATE TABLE IF NOT EXISTS security_events (
  id VARCHAR(64) PRIMARY KEY,
  attempt_id VARCHAR(64) NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  candidate_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  severity VARCHAR(16) NOT NULL CHECK(severity IN ('low', 'medium', 'high')),
  details TEXT DEFAULT '',
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_events_attempt ON security_events(attempt_id);
CREATE INDEX IF NOT EXISTS idx_security_events_exam ON security_events(exam_id);
CREATE INDEX IF NOT EXISTS idx_security_events_candidate ON security_events(candidate_id);

-- 16. Administrative Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(64) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  details TEXT DEFAULT '',
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- 17. Payment Orders
CREATE TABLE IF NOT EXISTS payment_orders (
  id VARCHAR(64) PRIMARY KEY,
  razorpay_order_id VARCHAR(64) UNIQUE NOT NULL,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency VARCHAR(8) NOT NULL DEFAULT 'INR',
  status VARCHAR(32) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed', 'refunded')),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_email ON payment_orders(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_payment_orders_rzp_order ON payment_orders(razorpay_order_id);

-- 18. Payment Transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
  razorpay_payment_id VARCHAR(64) UNIQUE NOT NULL,
  razorpay_signature VARCHAR(255),
  amount INTEGER NOT NULL CHECK (amount > 0),
  status VARCHAR(32) NOT NULL CHECK (status IN ('authorized', 'captured', 'refunded', 'failed')),
  method VARCHAR(32) DEFAULT '',
  payload_json TEXT DEFAULT '',
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_rzp_pay ON payment_transactions(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions(order_id);

-- 19. User Entitlements (Active balance per email & feature)
CREATE TABLE IF NOT EXISTS user_entitlements (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  feature_type VARCHAR(64) NOT NULL CHECK (feature_type IN ('resume_ai_usage', 'mock_interview_attempt', 'mock_assessment_attempt')),
  total_granted INTEGER NOT NULL DEFAULT 0 CHECK (total_granted >= 0),
  total_consumed INTEGER NOT NULL DEFAULT 0 CHECK (total_consumed >= 0),
  remaining_balance INTEGER NOT NULL DEFAULT 0 CHECK (remaining_balance >= 0),
  updated_at BIGINT NOT NULL,
  UNIQUE(email, feature_type)
);

CREATE INDEX IF NOT EXISTS idx_user_entitlements_lookup ON user_entitlements(LOWER(email), feature_type);

-- 20. Entitlement Ledger (Immutable append-only balance audit trail)
CREATE TABLE IF NOT EXISTS entitlement_ledger (
  id VARCHAR(64) PRIMARY KEY,
  entitlement_id VARCHAR(64) NOT NULL REFERENCES user_entitlements(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason VARCHAR(64) NOT NULL CHECK (reason IN ('purchase', 'consume_ai_analysis', 'failed_ai_reversal', 'refund', 'admin_adjustment', 'account_claim_merge', 'reserve_ai_analysis', 'settle_ai_analysis', 'release_ai_reservation', 'plan_grant', 'promo_grant')),
  reference_id VARCHAR(64) DEFAULT '',
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entitlement_ledger_entitlement ON entitlement_ledger(entitlement_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_ledger_ref ON entitlement_ledger(reference_id);

-- 21. Entitlement Reservations (Durable distributed lease & heartbeat tracking)
CREATE TABLE IF NOT EXISTS entitlement_reservations (
  id VARCHAR(64) PRIMARY KEY,
  entitlement_id VARCHAR(64) NOT NULL REFERENCES user_entitlements(id) ON DELETE CASCADE,
  reference_id VARCHAR(64) UNIQUE NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('reserved', 'settled', 'released')),
  lease_expires_at BIGINT NOT NULL,
  heartbeat_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entitlement_reservations_ref ON entitlement_reservations(reference_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_reservations_status_lease ON entitlement_reservations(status, lease_expires_at);

-- 22. Login Rate Limiting & Account Lockout Tracker
CREATE TABLE IF NOT EXISTS login_attempts (
  email VARCHAR(255) PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64) REFERENCES organizations(id) ON DELETE SET NULL;

