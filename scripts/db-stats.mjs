import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('data/talvyn_assess.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();

console.log('TABLE ROW COUNTS:');
for (const t of tables) {
  const count = db.prepare(`SELECT count(*) as c FROM ${t.name}`).get().c;
  console.log(`- ${t.name}: ${count}`);
}

