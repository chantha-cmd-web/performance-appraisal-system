import pg from 'pg';
const { Pool } = pg;
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/performance_system',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "employees" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "khmerName" TEXT DEFAULT '',
  "campus" TEXT DEFAULT '',
  "department" TEXT DEFAULT '',
  "position" TEXT DEFAULT '',
  "category" TEXT DEFAULT '',
  "supervisorId" TEXT DEFAULT '',
  "supporterId" TEXT DEFAULT '',
  "evalModel" TEXT DEFAULT '',
  "evalPeriod" TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "evaluations" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "employeeName" TEXT NOT NULL,
  "campus" TEXT NOT NULL,
  "department" TEXT DEFAULT '',
  "position" TEXT NOT NULL,
  "appraiser" TEXT NOT NULL,
  "supporter" TEXT DEFAULT '',
  "reviewDate" TEXT NOT NULL,
  "weightScheme" TEXT NOT NULL,
  "evaluationType" TEXT DEFAULT 'management',
  "evalPeriod" TEXT DEFAULT '',
  "totalSelf" REAL NOT NULL DEFAULT 0,
  "totalSuper" REAL NOT NULL DEFAULT 0,
  "overallScore" REAL NOT NULL DEFAULT 0,
  "evaluatorComments" TEXT DEFAULT '',
  "status" TEXT DEFAULT 'Draft',
  "createdBy" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "criteria_scores" (
  "id" SERIAL PRIMARY KEY,
  "evaluationId" INTEGER REFERENCES "evaluations"("id") ON DELETE CASCADE,
  "criteriaId" INTEGER,
  "selfScore" REAL DEFAULT 0,
  "superScore" REAL DEFAULT 0,
  "supporterScore" REAL DEFAULT 0,
  "managementScore" REAL DEFAULT 0,
  "aspScore" REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "peer_feedback" (
  "id" SERIAL PRIMARY KEY,
  "evaluationId" INTEGER REFERENCES "evaluations"("id") ON DELETE CASCADE,
  "peerName" TEXT,
  "feedback" TEXT,
  "score" REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" SERIAL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "timestamp" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" TEXT PRIMARY KEY,
  "value" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT DEFAULT 'info',
  "title" TEXT DEFAULT '',
  "message" TEXT NOT NULL,
  "khMessage" TEXT DEFAULT '',
  "link" TEXT DEFAULT '',
  "evaluationId" TEXT,
  "read" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_evaluations_employeeId" ON "evaluations"("employeeId");
CREATE INDEX IF NOT EXISTS "idx_evaluations_appraiser" ON "evaluations"("appraiser");
CREATE INDEX IF NOT EXISTS "idx_evaluations_supporter" ON "evaluations"("supporter");
CREATE INDEX IF NOT EXISTS "idx_evaluations_createdBy" ON "evaluations"("createdBy");
CREATE INDEX IF NOT EXISTS "idx_evaluations_status" ON "evaluations"("status");
CREATE INDEX IF NOT EXISTS "idx_evaluations_createdAt" ON "evaluations"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_criteria_scores_evaluationId" ON "criteria_scores"("evaluationId");
CREATE INDEX IF NOT EXISTS "idx_peer_feedback_evaluationId" ON "peer_feedback"("evaluationId");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_timestamp" ON "audit_logs"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_notifications_userId" ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS "idx_notifications_read" ON "notifications"("read");
CREATE INDEX IF NOT EXISTS "idx_employees_supervisorId" ON "employees"("supervisorId");
CREATE INDEX IF NOT EXISTS "idx_employees_supporterId" ON "employees"("supporterId");
`;

const SEED_SETTINGS_SQL = `
INSERT INTO "app_settings" ("key", "value")
VALUES ('evaluation_config', $1)
ON CONFLICT ("key") DO NOTHING;
`;

const SEED_USERS_SQL = `
INSERT INTO "users" ("id", "name", "password", "role")
VALUES ($1, $2, $3, $4)
ON CONFLICT ("id") DO NOTHING;
`;

const DEFAULT_EVAL_CONFIG = JSON.stringify({
  types: [
    { id: 'management', label: 'Management / ការគ្រប់គ្រង' },
    { id: 'teacher', label: 'Teacher / គ្រូបង្រៀន' },
    { id: 'operations', label: 'Operations / ប្រតិបត្តិការ' }
  ],
  weightingSchemes: [
    { id: 'campus_60_40', label: 'Direct Supervisor 60% (campus) / Supporter 40% (central)' },
    { id: 'campus_50_50', label: 'Direct Supervisor 50% (campus) / Supporter 50% (central)' },
    { id: 'campus_100', label: 'Direct Supervisor (campus) 100%' },
    { id: 'central_100', label: 'Direct Supervisor 100% (central)' },
    { id: 'management_100', label: 'Management 100%' },
    { id: 'asp_100', label: 'ASP 100%' }
  ],
  sections: {
    management: [
      { id: 'mgmt_perf', name: 'Work Performance', khName: 'សមិទ្ធផលការងារ' },
      { id: 'mgmt_lead', name: 'Leadership', khName: 'ភាពជាអ្នកដឹកនាំ' },
      { id: 'mgmt_prof', name: 'Professional Development', khName: 'ការអភិវឌ្ឍន៍វិជ្ជាជីវៈ' },
    ],
    teacher: [
      { id: 'teach_skill', name: 'Teaching Skills', khName: 'ជំនាញបង្រៀន' },
      { id: 'teach_mgmt', name: 'Classroom Management', khName: 'ការគ្រប់គ្រងថ្នាក់រៀន' },
      { id: 'teach_prof', name: 'Professional Conduct', khName: 'វិជ្ជាជីវៈ' },
    ],
    operations: [
      { id: 'ops_quality', name: 'Service Quality', khName: 'គុណភាពសេវាកម្ម' },
      { id: 'ops_eff', name: 'Work Efficiency', khName: 'ប្រសិទ្ធភាពការងារ' },
      { id: 'ops_prof', name: 'Professional Conduct', khName: 'វិជ្ជាជីវៈ' },
    ]
  },
  criteriaSets: {
    management: [
      { id: 1, kh: 'អាកប្បកិរិយា', khDesc: 'ចំណាប់អារម្មណ៍ និងភាពសាទរ', en: 'Attitude', desc: 'Enthusiasm and dedication', max: 10, sectionId: 'mgmt_perf' },
      { id: 2, kh: 'ចំណេះដឹងការងារ', khDesc: 'ការយល់ដឹងអំពីការងារ', en: 'Job Knowledge', desc: 'Understanding of work and skills', max: 10, sectionId: 'mgmt_perf' },
      { id: 3, kh: 'គំនិតផ្តួចផ្តើម', khDesc: 'ការអភិវឌ្ឍន៍ និងដោះស្រាយបញ្ហា', en: 'Initiative', desc: 'Proactive thinking and development', max: 10, sectionId: 'mgmt_perf' },
      { id: 4, kh: 'ការវិនិច្ឆ័យ និងការយល់ដឹង', khDesc: 'ការសម្រេចចិត្ត', en: 'Judgment and Awareness', desc: 'Problem-solving and decision making', max: 10, sectionId: 'mgmt_perf' },
      { id: 5, kh: 'ការអភិវឌ្ឍន៍បុគ្គលិក', khDesc: 'ការកសាងសមត្ថភាព', en: 'Employee Development', desc: 'Effectiveness of capacity building', max: 10, sectionId: 'mgmt_lead' },
      { id: 6, kh: 'ការចូលរួមក្នុងការគ្រប់គ្រង់ផ្នែក', khDesc: 'ការអនុលោមតាមទិសដៅ', en: 'Participation in Management', desc: 'Adherence to work directives', max: 10, sectionId: 'mgmt_lead' },
      { id: 7, kh: 'វិន័យបុគ្គលិក', khDesc: 'ការគោរពវិន័យ', en: 'Employee Discipline', desc: 'Adherence to discipline', max: 10, sectionId: 'mgmt_lead' },
      { id: 8, kh: 'ការទំនាក់ទំនង', khDesc: 'ការទំនាក់ទំនងជាមួយមិត្តរួមការងារ', en: 'Communication', desc: 'Interactions with colleagues', max: 10, sectionId: 'mgmt_lead' },
      { id: 9, kh: 'ភាពជាអ្នកដឹកនាំ', khDesc: 'ការកសាងក្រុម', en: 'Leadership', desc: 'Leadership qualities and team building', max: 10, sectionId: 'mgmt_lead' },
      { id: 10, kh: 'ការប្រើប្រាស់ប្រព័ន្ធបច្ចេកវិទ្យា', khDesc: 'ជំនាញបច្ចេកវិទ្យា', en: 'Technology Use', desc: 'Proficiency in office technology', max: 10, sectionId: 'mgmt_prof' },
    ],
    teacher: [
      { id: 11, kh: 'ការរៀបចំមេរៀន', khDesc: 'ការរៀបចំផែនការបង្រៀន', en: 'Lesson Preparation', desc: 'Planning and preparing lessons', max: 10, sectionId: 'teach_skill' },
      { id: 12, kh: 'វិធីសាស្ត្របង្រៀន', khDesc: 'ប្រសិទ្ធភាពនៃការបង្រៀន', en: 'Teaching Methodology', desc: 'Effective teaching methods', max: 10, sectionId: 'teach_skill' },
      { id: 13, kh: 'ការគ្រប់គ្រងថ្នាក់រៀន', khDesc: 'ការគ្រប់គ្រងសិស្ស', en: 'Classroom Management', desc: 'Managing student behavior', max: 10, sectionId: 'teach_skill' },
      { id: 14, kh: 'ការវាយតម្លៃសិស្ស', khDesc: 'ការតាមដានការសិក្សា', en: 'Student Assessment', desc: 'Evaluating student progress', max: 10, sectionId: 'teach_mgmt' },
      { id: 15, kh: 'ទំនាក់ទំនងជាមួយមាតាបិតា', khDesc: 'ការប្រាស្រ័យទាក់ទង', en: 'Parent Communication', desc: 'Engaging with parents', max: 10, sectionId: 'teach_mgmt' },
      { id: 16, kh: 'វិន័យនិងអាកប្បកិរិយា', khDesc: 'ក្រមសីលធម៌វិជ្ជាជីវៈ', en: 'Discipline & Attitude', desc: 'Professional conduct', max: 10, sectionId: 'teach_mgmt' },
      { id: 17, kh: 'ការប្រើប្រាស់សម្ភារៈ', khDesc: 'ការប្រើប្រាស់សម្ភារៈឧបទ្ទេស', en: 'Use of Materials', desc: 'Effective use of teaching aids', max: 10, sectionId: 'teach_prof' },
      { id: 18, kh: 'ការចូលរួមសកម្មភាពសាលា', khDesc: 'ការចូលរួមកម្មវិធី', en: 'School Activity Participation', desc: 'Involvement in school events', max: 10, sectionId: 'teach_prof' },
      { id: 19, kh: 'ការអភិវឌ្ឍន៍ខ្លួន', khDesc: 'ការសិក្សាបន្ត', en: 'Self-Development', desc: 'Continuous learning', max: 10, sectionId: 'teach_prof' },
      { id: 20, kh: 'ការសហការជាមួយមិត្តរួមការងារ', khDesc: 'ការធ្វើការងារជាក្រុម', en: 'Collaboration', desc: 'Teamwork with peers', max: 10, sectionId: 'teach_prof' },
    ],
    operations: [
      { id: 21, kh: 'គុណភាពសេវាកម្ម', khDesc: 'ការផ្តល់សេវាកម្ម', en: 'Service Quality', desc: 'Delivering high-quality service', max: 10, sectionId: 'ops_quality' },
      { id: 22, kh: 'ការអនុលោមតាមនីតិវិធី', khDesc: 'ការគោរពតាមគោលការណ៍', en: 'Compliance', desc: 'Following rules and protocols', max: 10, sectionId: 'ops_quality' },
      { id: 23, kh: 'ប្រសិទ្ធភាពការងារ', khDesc: 'ល្បឿននិងភាពត្រឹមត្រូវ', en: 'Operational Efficiency', desc: 'Speed and accuracy of work', max: 10, sectionId: 'ops_eff' },
      { id: 24, kh: 'ការដោះស្រាយបញ្ហា', khDesc: 'ការដោះស្រាយបញ្ហាជាក់ស្តែង', en: 'Problem Solving', desc: 'Handling operational issues', max: 10, sectionId: 'ops_eff' },
      { id: 25, kh: 'សុវត្ថិភាពនិងអនាម័យ', khDesc: 'ការរក្សាបរិស្ថានល្អ', en: 'Safety & Hygiene', desc: 'Maintaining a safe environment', max: 10, sectionId: 'ops_eff' },
      { id: 26, kh: 'ការថែទាំឧបករណ៍', khDesc: 'ការថែរក្សាសម្ភារៈ', en: 'Equipment Maintenance', desc: 'Proper care of tools and equipment', max: 10, sectionId: 'ops_eff' },
      { id: 27, kh: 'ការធ្វើការជាក្រុម', khDesc: 'ការសហការ', en: 'Teamwork', desc: 'Working well with others', max: 10, sectionId: 'ops_prof' },
      { id: 28, kh: 'ភាពជឿជាក់និងការទទួលខុសត្រូវ', khDesc: 'ការទទួលខុសត្រូវ', en: 'Reliability & Responsibility', desc: 'Dependability in duties', max: 10, sectionId: 'ops_prof' },
      { id: 29, kh: 'ការទំនាក់ទំនងអតិថិជន', khDesc: 'ការបម្រើអតិថិជន', en: 'Customer Communication', desc: 'Interacting with clients effectively', max: 10, sectionId: 'ops_prof' },
      { id: 30, kh: 'ការគ្រប់គ្រងពេលវេលា', khDesc: 'ការបំពេញការងារទាន់ពេល', en: 'Time Management', desc: 'Completing tasks on time', max: 10, sectionId: 'ops_prof' },
    ]
  }
});

export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(SCHEMA_SQL);

    await client.query(SEED_USERS_SQL, ['superadmin', 'Super Administrator', bcrypt.hashSync('super@2026', 10), 'superadmin']);
    await client.query(SEED_USERS_SQL, ['admin', 'Administrator', bcrypt.hashSync('admin@123', 10), 'admin']);

    await client.query(SEED_SETTINGS_SQL, [DEFAULT_EVAL_CONFIG]);

    await client.query('COMMIT');
    console.log('PostgreSQL migration and seeding completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PostgreSQL migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

export function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  return pool.connect().then(async (client) => {
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });
}

export { pool };
