import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('data/talvyn_assess.db');

console.log('--- CLEARING DUMMY & TEST DATA ---');

db.exec(`
  PRAGMA foreign_keys = OFF;

  -- 1. Clear test attempts, answers, questions, telemetry
  DELETE FROM attempt_answers;
  DELETE FROM attempt_questions;
  DELETE FROM attempts;
  DELETE FROM security_events;
  DELETE FROM audit_logs;

  -- 2. Clear test sessions and login throttles
  DELETE FROM sessions;
  DELETE FROM login_attempts;

  -- 3. Clear all test payments, transactions, ledger, and entitlements
  DELETE FROM payment_transactions;
  DELETE FROM payment_orders;
  DELETE FROM entitlement_reservations;
  DELETE FROM entitlement_ledger;
  DELETE FROM user_entitlements;
  DELETE FROM subscriptions;

  -- 4. Clear test organizations and memberships
  DELETE FROM organization_members;
  DELETE FROM organizations;

  -- 5. Clear test exams and assignments, preserving canonical benchmarks
  DELETE FROM exam_assignments WHERE exam_id NOT IN ('exam_tech_2026', 'exam_public_practice_2026');
  DELETE FROM exam_questions WHERE exam_id NOT IN ('exam_tech_2026', 'exam_public_practice_2026');
  DELETE FROM exams WHERE id NOT IN ('exam_tech_2026', 'exam_public_practice_2026');

  -- 6. Clear test users, preserving canonical seed accounts
  DELETE FROM users WHERE id NOT IN ('usr_admin_root', 'usr_cand_demo', 'usr_superadmin_root');

  PRAGMA foreign_keys = ON;
`);

try {
  db.exec('VACUUM;');
} catch (e) {
  console.log('Vacuum skipped (WAL mode busy):', e.message);
}

console.log('Dummy data cleared successfully!\n');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();

console.log('POST-CLEANUP TABLE ROW COUNTS:');
for (const t of tables) {
  const count = db.prepare(`SELECT count(*) as c FROM ${t.name}`).get().c;
  console.log(`- ${t.name}: ${count}`);
}

