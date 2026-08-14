import { pool } from './db.js';

async function test() {
  try {
    const res = await pool.query(
      `INSERT INTO "employees" ("id","name","khmerName","campus","department","position","category","supervisorId","supporterId","evalModel","evalPeriod")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT ("id") DO UPDATE SET "name"=EXCLUDED."name"`,
      ['test1234', 'John Doe', '', '', '', '', '', '', '', '', '']
    );
    console.log('Insert response:', res);
  } catch (err) {
    console.error('Insert failed:', err);
  }
}

test();
