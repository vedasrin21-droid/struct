import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

function hashPassword(password, providedSalt) {
  const salt = providedSalt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return { hash: derivedKey.toString('hex'), salt };
}

const db = new DatabaseSync('data/talvyn_assess.db');
const now = Date.now();

// Seed platform super admin
const checkSuper = db.prepare("SELECT id FROM users WHERE role = 'super_admin' LIMIT 1").get();
if (!checkSuper) {
  const superAdminId = 'usr_super_admin_root';
  const superPw = hashPassword('StructSuperAdmin2026!');
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, role, name, department, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(superAdminId, 'admin@struct.careers', superPw.hash, superPw.salt, 'super_admin', 'STRUCT Platform Administrator', 'Platform Ops', now);
  console.log('Seeded Super Admin: admin@struct.careers');
}

// Seed clean default organization
const checkOrg = db.prepare('SELECT id FROM organizations LIMIT 1').get();
if (!checkOrg) {
  const demoOrgId = 'org_talvyn_corp';
  db.prepare(`
    INSERT INTO organizations (id, name, slug, domain, plan_tier, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(demoOrgId, 'STRUCT Technologies Inc.', 'struct-corp', 'struct.careers', 'recruit_pro', now, now);

  db.prepare(`
    INSERT OR IGNORE INTO organization_members (id, organization_id, user_id, role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(`mem_${demoOrgId}_admin`, demoOrgId, 'usr_admin_root', 'owner', now);
  console.log('Seeded Default Organization: STRUCT Technologies Inc.');
}

console.log('\nCURRENT USERS:');
console.log(db.prepare('SELECT id, email, role FROM users').all());
console.log('\nCURRENT ORGANIZATIONS:');
console.log(db.prepare('SELECT id, name, slug FROM organizations').all());
console.log('\nCURRENT EXAMS:');
console.log(db.prepare('SELECT id, title, code, is_practice, status FROM exams').all());

