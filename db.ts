import pg from 'pg';
const { Pool } = pg;
import bcrypt from 'bcryptjs';
import fs from 'fs';
import os from 'os';
import path from 'path';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/performance_system';
const isCloudDb = databaseUrl.includes('neon.tech') || databaseUrl.includes('supabase') || databaseUrl.includes('render.com') || databaseUrl.includes('railway.app') || databaseUrl.includes('aivencloud.com') || databaseUrl.includes('?sslmode=');

let useFallback = false;
let realPool: pg.Pool | null = null;

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || '';
const APPS_SCRIPT_SECRET = process.env.GOOGLE_APPS_SCRIPT_SECRET || 'staff-eval-secure-passphrase-2026';

if (APPS_SCRIPT_URL) {
  useFallback = true;
  console.log('[Google Sheets] GOOGLE_APPS_SCRIPT_URL is configured. Forcing mock DB router mode for Google Sheets synchronization.');
} else {
  try {
    realPool = new Pool({
      connectionString: databaseUrl,
      ssl: isCloudDb ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  } catch (err: any) {
    console.warn('PostgreSQL Pool initialization failed, entering Mock DB fallback mode:', err.message);
    useFallback = true;
  }
}

// File-persisted mock database path.
// Cloud Functions (GCF) has a read-only filesystem except /tmp, so use the
// temp directory there. Google Sheets remains the source of truth; this file
// is only a local cache.
const IS_FUNCTION_ENV =
  process.env.FIREBASE_FUNCTIONS === 'true' ||
  !!process.env.FUNCTION_TARGET ||
  !!process.env.K_SERVICE;
const MOCK_DB_PATH = path.join(IS_FUNCTION_ENV ? os.tmpdir() : process.cwd(), 'db.json');

// Tracks in-flight Google Sheets saves so the API can await them before
// responding. Without this, Cloud Functions may freeze the instance before a
// fire-and-forget save completes, losing writes to the spreadsheet.
const pendingSheetSaves: Promise<void>[] = [];

function sheetFetch(url: string, options: RequestInit, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return globalThis
    .fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

/**
 * Waits until every queued Google Sheets write has finished. Call this before
 * sending a response so the spreadsheet always receives the data.
 */
export async function flushGoogleSheets() {
  while (pendingSheetSaves.length > 0) {
    const batch = pendingSheetSaves.splice(0, pendingSheetSaves.length);
    await Promise.all(batch.map((p) => p.catch(() => {})));
  }
}

// Structure for mock DB
interface MockDb {
  users: any[];
  employees: any[];
  evaluations: any[];
  criteria_scores: any[];
  peer_feedback: any[];
  audit_logs: any[];
  app_settings: any[];
  notifications: any[];
}

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

let inMemoryDb: MockDb | null = null;
let lastDbString = '';

function readMockDb(): MockDb {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  if (!fs.existsSync(MOCK_DB_PATH)) {
    const initialDb: MockDb = {
      users: [
        { id: 'superadmin', name: 'Super Administrator', password: bcrypt.hashSync('super@2026', 10), role: 'superadmin' },
        { id: 'admin', name: 'Administrator', password: bcrypt.hashSync('admin@123', 10), role: 'admin' },
        { id: '201760', name: 'Chan Dara (Employee)', password: bcrypt.hashSync('emp@2026', 10), role: 'employee' },
        { id: 'sup001', name: 'Som Bopha (Supervisor)', password: bcrypt.hashSync('sup@2026', 10), role: 'supervisor' },
        { id: 'sup002', name: 'Keo Chantrea (Supporter)', password: bcrypt.hashSync('sup@2026', 10), role: 'supporter' }
      ],
      employees: [
        {
          id: '201760', name: 'Chan Dara', khmerName: 'ចន្រ្ត ដារ៉ា', campus: 'Main Campus',
          department: 'Operations', position: 'Accountant', category: 'Full-time',
          supervisorId: 'sup001', supporterId: 'sup002',
          evalModel: 'campus_60_40', evalPeriod: '2026'
        },
        {
          id: 'sup001', name: 'Som Bopha', khmerName: 'សុម បុប្ផា', campus: 'Main Campus',
          department: 'Management', position: 'Supervisor', category: 'Management',
          supervisorId: '', supporterId: '',
          evalModel: 'campus_60_40', evalPeriod: '2026'
        },
        {
          id: 'sup002', name: 'Keo Chantrea', khmerName: 'គាវ ចន្រ្តី', campus: 'Central Office',
          department: 'HR', position: 'HR Officer', category: 'Full-time',
          supervisorId: '', supporterId: '',
          evalModel: 'campus_60_40', evalPeriod: '2026'
        }
      ],
      evaluations: [],
      criteria_scores: [],
      peer_feedback: [],
      audit_logs: [],
      app_settings: [
        { key: 'evaluation_config', value: DEFAULT_EVAL_CONFIG }
      ],
      notifications: []
    };
    const dbStr = JSON.stringify(initialDb, null, 2);
    fs.writeFileSync(MOCK_DB_PATH, dbStr);
    inMemoryDb = initialDb;
    lastDbString = JSON.stringify(initialDb);
    return initialDb;
  }
  try {
    const fileContent = fs.readFileSync(MOCK_DB_PATH, 'utf8');
    inMemoryDb = JSON.parse(fileContent);
    lastDbString = JSON.stringify(inMemoryDb);
    return inMemoryDb!;
  } catch {
    const emptyDb = {
      users: [],
      employees: [],
      evaluations: [],
      criteria_scores: [],
      peer_feedback: [],
      audit_logs: [],
      app_settings: [],
      notifications: []
    };
    inMemoryDb = emptyDb;
    lastDbString = JSON.stringify(emptyDb);
    return emptyDb;
  }
}

export async function syncFromGoogleSheets() {
  if (!APPS_SCRIPT_URL) {
    console.log('[Google Sheets] No GOOGLE_APPS_SCRIPT_URL configured. Using local JSON file database.');
    return;
  }
  
  try {
    console.log('[Google Sheets] Synchronizing database state from Google Sheet...');
    const response = await sheetFetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: APPS_SCRIPT_SECRET,
        action: 'getData'
      })
    });
    
    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch (parseErr) {
      console.warn('[Google Sheets] Received a non-JSON (HTML/Text) response from Google Sheets. This usually means the Google Web App URL is either unauthorized or configured incorrectly. Please ensure your Google Apps Script is deployed as a Web App with access set to "Anyone" (even anonymous). Response starts with:', text.slice(0, 200));
      return;
    }

    if (result && result.success && result.data) {
      const currentDb = readMockDb();
      const sheetDb = result.data;
      
      // Map lowercase sheet keys back to the camelCase keys the app expects
      const CAMEL_KEYS: Record<string, string> = {
        userid: 'userId', username: 'userName',
        employeeid: 'employeeId', employeename: 'employeeName',
        khmername: 'khmerName',
        supervisorid: 'supervisorId', supporterid: 'supporterId',
        evalmodel: 'evalModel', evalperiod: 'evalPeriod',
        reviewdate: 'reviewDate', weightscheme: 'weightScheme',
        evaluationtype: 'evaluationType',
        totalself: 'totalSelf', totalsuper: 'totalSuper', overallscore: 'overallScore',
        evaluatorcomments: 'evaluatorComments',
        createdat: 'createdAt', createdbyname: 'createdByName',
        criteriaid: 'criteriaId', evaluationid: 'evaluationId',
        selfscore: 'selfScore', superscore: 'superScore',
        supporterscore: 'supporterScore', managementscore: 'managementScore', aspscore: 'aspScore',
        peername: 'peerName',
        khmessage: 'khMessage',
        timestamp: 'timestamp'
      };

      // Helper to normalize keys of objects in the sheet response to camelCase and clean up fields
      const normalizeSheetData = (tableData: any[]): any[] => {
        if (!Array.isArray(tableData)) return [];
        return tableData.map(item => {
          if (!item || typeof item !== 'object') return item;
          const normalized: any = {};
          for (const key of Object.keys(item)) {
            const lowerKey = key.toLowerCase();
            const camelKey = CAMEL_KEYS[lowerKey] || (lowerKey !== key ? key : lowerKey);
            let value = item[key];
            // Normalize ID fields to lowercase strings
            if ((lowerKey === 'id' || lowerKey === 'userid' || lowerKey === 'employeeid' || lowerKey === 'supervisorid' || lowerKey === 'supporterid') && value !== undefined && value !== null) {
              value = String(value).trim().toLowerCase();
            }
            // Normalize password to a string to avoid numeric parsing issues from Google Sheets
            if (lowerKey === 'password' && value !== undefined && value !== null) {
              value = String(value).trim();
            }
            normalized[camelKey] = value;
          }
          return normalized;
        });
      };

      const usersNormalized = normalizeSheetData(sheetDb.users || []);
      const employeesNormalized = normalizeSheetData(sheetDb.employees || []);
      const evaluationsNormalized = normalizeSheetData(sheetDb.evaluations || []);
      const criteriaNormalized = normalizeSheetData(sheetDb.criteria_scores || []);
      const peerNormalized = normalizeSheetData(sheetDb.peer_feedback || []);
      const logsNormalized = normalizeSheetData(sheetDb.audit_logs || []);
      const settingsNormalized = normalizeSheetData(sheetDb.app_settings || []);
      const notificationsNormalized = normalizeSheetData(sheetDb.notifications || []);

      // Merge sheet tables, ensuring fallback defaults if sheet is brand new/empty
      const mergedDb: MockDb = {
        users: usersNormalized.length > 0 ? usersNormalized : currentDb.users,
        employees: employeesNormalized.length > 0 ? employeesNormalized : currentDb.employees,
        evaluations: evaluationsNormalized.length > 0 ? evaluationsNormalized : (currentDb.evaluations || []),
        criteria_scores: criteriaNormalized.length > 0 ? criteriaNormalized : (currentDb.criteria_scores || []),
        peer_feedback: peerNormalized.length > 0 ? peerNormalized : (currentDb.peer_feedback || []),
        audit_logs: logsNormalized.length > 0 ? logsNormalized : (currentDb.audit_logs || []),
        app_settings: settingsNormalized.length > 0 ? settingsNormalized : (currentDb.app_settings || []),
        notifications: notificationsNormalized.length > 0 ? notificationsNormalized : (currentDb.notifications || [])
      };

      // Auto-provision user logins for any Employees, Supervisors, or Supporters in the synced list
      const finalEmployees = mergedDb.employees || [];
      const finalUsers = mergedDb.users || [];
      for (const emp of finalEmployees) {
        if (!emp.id) continue;
        const empId = String(emp.id).trim().toLowerCase();
        
        // Ensure employee themselves has a login
        if (!finalUsers.find(u => String(u.id || '').trim().toLowerCase() === empId)) {
          finalUsers.push({
            id: String(emp.id).trim(),
            name: emp.name || String(emp.id).trim(),
            password: 'emp@2026',
            role: 'employee'
          });
        }

        // Ensure Direct Supervisor has a login
        if (emp.supervisorId && String(emp.supervisorId).trim() !== '') {
          const supId = String(emp.supervisorId).trim().toLowerCase();
          if (!finalUsers.find(u => String(u.id || '').trim().toLowerCase() === supId)) {
            finalUsers.push({
              id: String(emp.supervisorId).trim(),
              name: `Supervisor ${String(emp.supervisorId).trim()}`,
              password: 'sup@2026',
              role: 'supervisor'
            });
          }
        }

        // Ensure Supporter has a login
        if (emp.supporterId && String(emp.supporterId).trim() !== '') {
          const helperId = String(emp.supporterId).trim().toLowerCase();
          if (!finalUsers.find(u => String(u.id || '').trim().toLowerCase() === helperId)) {
            finalUsers.push({
              id: String(emp.supporterId).trim(),
              name: `Supporter ${String(emp.supporterId).trim()}`,
              password: 'sup@2026',
              role: 'supporter'
            });
          }
        }
      }

      // Ensure auto-provisioned accounts have a usable password.
      // Only applies to employee / supervisor / supporter roles and only when
      // the password is empty (empty passwords make the account unloginable).
      const defaultPwds: Record<string, string> = { employee: 'emp@2026', supervisor: 'sup@2026', supporter: 'sup@2026' };
      for (const u of finalUsers) {
        const role = String(u.role || '').toLowerCase();
        const defaultPwd = defaultPwds[role];
        if (!defaultPwd) continue;
        const hasPwd = u.password !== undefined && u.password !== null && String(u.password).trim() !== '';
        if (!hasPwd) {
          u.password = defaultPwd;
        }
      }
      
      inMemoryDb = mergedDb;
      writeMockDb(mergedDb);
      console.log('[Google Sheets] Synchronization complete! Synced tables:', Object.keys(sheetDb).filter(k => sheetDb[k] && sheetDb[k].length > 0).join(', ') || 'none (empty)');
    } else {
      console.warn('[Google Sheets] Synchronization response was not successful:', result?.error || result);
    }
  } catch (err: any) {
    console.error('[Google Sheets] Failed to sync from Google Sheet:', err.message);
  }
}

export async function saveTableToGoogleSheets(tableName: string) {
  if (!APPS_SCRIPT_URL) return;
  
  const savePromise = (async () => {
    try {
      const db = readMockDb();
      const tableData = db[tableName as keyof MockDb] || [];
      
      const res = await sheetFetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: APPS_SCRIPT_SECRET,
          action: 'saveTable',
          tableName: tableName,
          tableData: tableData
        })
      });
      const text = await res.text();
      let result: any;
      try {
        result = JSON.parse(text);
      } catch (parseErr) {
        console.warn(`[Google Sheets] Received a non-JSON (HTML/Text) response from Google Sheets during update of table ${tableName}. Response starts with:`, text.slice(0, 150));
        return;
      }

      if (result && result.success) {
        console.log(`[Google Sheets] Table ${tableName} synced successfully. Rows: ${tableData.length}`);
      } else {
        console.error(`[Google Sheets] Failed to sync table ${tableName}:`, result?.error || result);
      }
    } catch (err: any) {
      console.error(`[Google Sheets] Error sending table ${tableName} to Google Sheets:`, err.message);
    }
  })();

  pendingSheetSaves.push(savePromise);
  return savePromise;
}

function writeMockDb(db: MockDb) {
  try {
    inMemoryDb = db;
    const dbStr = JSON.stringify(db);
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    
    if (APPS_SCRIPT_URL) {
      // Determine which tables changed by comparing with our last synchronized state
      const tables: (keyof MockDb)[] = [
        'users',
        'employees',
        'evaluations',
        'criteria_scores',
        'peer_feedback',
        'audit_logs',
        'app_settings',
        'notifications'
      ];
      
      let parsedLast: MockDb | null = null;
      try {
        parsedLast = lastDbString ? JSON.parse(lastDbString) : null;
      } catch {}
      
      for (const table of tables) {
        const currentData = db[table];
        const lastData = parsedLast ? parsedLast[table] : null;
        
        if (!lastData || JSON.stringify(currentData) !== JSON.stringify(lastData)) {
          saveTableToGoogleSheets(table);
        }
      }
    }
    
    lastDbString = dbStr;
  } catch (err) {
    console.error('Failed to write local database file:', err);
  }
}

function executeMockQuery(sql: string, params: any[] = []): any[] {
  const db = readMockDb();
  const cleanSql = sql.replace(/\s+/g, ' ').trim();
  const lowerSql = cleanSql.toLowerCase();

  // Handle CREATE, ALTER, INDEX statements instantly
  if (lowerSql.includes('create table') || lowerSql.includes('create index') || lowerSql.includes('alter table')) {
    return [];
  }

  // Handle DELETES
  if (lowerSql.startsWith('delete from')) {
    if (lowerSql.includes('"criteria_scores"')) {
      if (lowerSql.includes('where "evaluationid" = $1')) {
        db.criteria_scores = (db.criteria_scores || []).filter(c => String(c.evaluationId) !== String(params[0]));
      } else {
        db.criteria_scores = [];
      }
    }
    if (lowerSql.includes('"peer_feedback"')) {
      if (lowerSql.includes('where "evaluationid" = $1')) {
        db.peer_feedback = (db.peer_feedback || []).filter(p => String(p.evaluationId) !== String(params[0]));
      } else {
        db.peer_feedback = [];
      }
    }
    if (lowerSql.includes('"evaluations"')) {
      if (lowerSql.includes('where "id" = $1')) {
        db.evaluations = (db.evaluations || []).filter(e => String(e.id) !== String(params[0]));
      } else {
        db.evaluations = [];
      }
    }
    if (lowerSql.includes('"employees"')) {
      if (lowerSql.includes('where "id" = $1')) {
        db.employees = (db.employees || []).filter(e => String(e.id) !== String(params[0]));
      } else {
        db.employees = [];
      }
    }
    if (lowerSql.includes('"users"')) {
      if (lowerSql.includes('where "id" = $1')) {
        db.users = (db.users || []).filter(u => String(u.id) !== String(params[0]));
      } else {
        db.users = db.users.filter(u => u.id === 'superadmin');
      }
    }
    if (lowerSql.includes('"app_settings"')) {
      db.app_settings = [];
    }
    if (lowerSql.includes('"notifications"')) {
      if (lowerSql.includes('where "id" = $1')) {
        db.notifications = (db.notifications || []).filter(n => String(n.id) !== String(params[0]));
      } else {
        db.notifications = [];
      }
    }
    writeMockDb(db);
    return [];
  }

  // SELECT COUNT
  if (lowerSql.includes('select count(')) {
    let evals = db.evaluations || [];
    if (lowerSql.includes('where "employeeid" = $1') && lowerSql.includes('draft')) {
      evals = evals.filter(e => e.employeeId === params[0] && ['Draft', 'Self Evaluation Pending'].includes(e.status));
    } else if (lowerSql.includes('where "appraiser" = $1') && lowerSql.includes('waiting for supervisor')) {
      evals = evals.filter(e => e.appraiser === params[0] && e.status === 'Waiting for Supervisor');
    } else if (lowerSql.includes('where "supporter" = $1') && lowerSql.includes('waiting for supporter')) {
      evals = evals.filter(e => e.supporter === params[0] && e.status === 'Waiting for Supporter');
    } else if (lowerSql.includes('not in') && lowerSql.includes('completed')) {
      evals = evals.filter(e => !['Completed', 'Approved'].includes(e.status));
    }
    return [{ count: evals.length }];
  }

  // SELECT FROM evaluations
  if (lowerSql.includes('from "evaluations"')) {
    if (lowerSql.includes('where "id" = $1') || lowerSql.includes('where id = $1')) {
      const ev = db.evaluations.find(e => String(e.id) === String(params[0]));
      if (!ev) return [];
      if (lowerSql.includes('select "createdby" from')) {
        return [{ createdBy: ev.createdBy }];
      }
      if (lowerSql.includes('createdby') && lowerSql.includes('appraiser')) {
        return [{ createdBy: ev.createdBy, appraiser: ev.appraiser, supporter: ev.supporter, employeeId: ev.employeeId }];
      }
      return [ev];
    }
    
    let evs = [...(db.evaluations || [])];
    if (lowerSql.includes('where "createdby" = $1') || lowerSql.includes('createdby = $1')) {
      const id = params[0];
      evs = evs.filter(e => e.createdBy === id || e.appraiser === id || e.supporter === id || e.employeeId === id);
    }
    if (lowerSql.includes('order by "createdat" desc')) {
      evs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return evs;
  }

  // SELECT FROM criteria_scores
  if (lowerSql.includes('from "criteria_scores"')) {
    if (lowerSql.includes('where "evaluationid" = $1')) {
      return (db.criteria_scores || []).filter(c => String(c.evaluationId) === String(params[0]));
    }
    return db.criteria_scores || [];
  }

  // SELECT FROM peer_feedback
  if (lowerSql.includes('from "peer_feedback"')) {
    if (lowerSql.includes('where "evaluationid" = $1')) {
      return (db.peer_feedback || []).filter(p => String(p.evaluationId) === String(params[0]));
    }
    return db.peer_feedback || [];
  }

  // SELECT FROM employees
  if (lowerSql.includes('from "employees"')) {
    if (lowerSql.includes('where "id" = $1')) {
      const emp = db.employees.find(e => e.id === params[0]);
      return emp ? [emp] : [];
    }
    if (lowerSql.includes('where "supervisorid" = $1') || lowerSql.includes('where supervisorid = $1')) {
      const emps = (db.employees || []).filter(e => e.supervisorId === params[0] || e.supporterId === params[0]);
      if (lowerSql.includes('order by "name" asc')) {
        emps.sort((a, b) => a.name.localeCompare(b.name));
      }
      return emps;
    }
    const emps = [...(db.employees || [])];
    if (lowerSql.includes('order by "name" asc')) {
      emps.sort((a, b) => a.name.localeCompare(b.name));
    }
    return emps;
  }

  // SELECT FROM users
  if (lowerSql.includes('from "users"')) {
    if (lowerSql.includes('where "id" = $1')) {
      const searchId = String(params[0] || '').trim().toLowerCase();
      const user = db.users.find(u => String(u.id || '').trim().toLowerCase() === searchId);
      if (lowerSql.includes('select "id" from')) {
        return user ? [{ id: user.id }] : [];
      }
      return user ? [user] : [];
    }
    if (lowerSql.includes('select "id", "name", "role"')) {
      return db.users.map(u => ({ id: u.id, name: u.name, role: u.role }));
    }
    return db.users;
  }

  // SELECT FROM app_settings
  if (lowerSql.includes('from "app_settings"')) {
    if (lowerSql.includes('where "key" = $1')) {
      const setting = db.app_settings.find(s => s.key === params[0]);
      return setting ? [{ value: setting.value }] : [];
    }
    return db.app_settings || [];
  }

  // SELECT FROM audit_logs
  if (lowerSql.includes('from "audit_logs"')) {
    const logs = [...(db.audit_logs || [])];
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs.slice(0, 500);
  }

  // SELECT FROM notifications
  if (lowerSql.includes('from "notifications"')) {
    if (lowerSql.includes('where "userid" = $1')) {
      const notifs = (db.notifications || []).filter(n => n.userId === params[0]);
      if (lowerSql.includes('order by "createdat" desc')) {
        notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      if (lowerSql.includes('limit 50')) {
        return notifs.slice(0, 50);
      }
      return notifs;
    }
    return db.notifications || [];
  }

  // INSERT INTO audit_logs
  if (lowerSql.startsWith('insert into "audit_logs"')) {
    const id = (db.audit_logs || []).length + 1;
    const newLog = {
      id,
      userId: params[0],
      userName: params[1],
      action: params[2],
      details: params[3] || '',
      timestamp: new Date().toISOString()
    };
    db.audit_logs = db.audit_logs || [];
    db.audit_logs.push(newLog);
    writeMockDb(db);
    return [newLog];
  }

  // INSERT INTO users
  if (lowerSql.startsWith('insert into "users"')) {
    const searchId = String(params[0] || '').trim().toLowerCase();
    const existingIdx = db.users.findIndex(u => String(u.id || '').trim().toLowerCase() === searchId);
    if (existingIdx >= 0) {
      if (lowerSql.includes('on conflict ("id") do nothing')) {
        return [];
      }
      db.users[existingIdx] = { id: params[0], name: params[1], password: params[2], role: params[3] };
    } else {
      db.users.push({ id: params[0], name: params[1], password: params[2], role: params[3] });
    }
    writeMockDb(db);
    return [{ id: params[0] }];
  }

  // UPDATE users
  if (lowerSql.startsWith('update "users"')) {
    const searchId3 = String(params[3] || '').trim().toLowerCase();
    const searchId2 = String(params[2] || '').trim().toLowerCase();
    if (lowerSql.includes('"password"')) {
      const user = db.users.find(u => String(u.id || '').trim().toLowerCase() === searchId3);
      if (user) {
        user.name = params[0];
        user.role = params[1];
        user.password = params[2];
        writeMockDb(db);
        return [user];
      }
    } else {
      const user = db.users.find(u => String(u.id || '').trim().toLowerCase() === searchId2);
      if (user) {
        user.name = params[0];
        user.role = params[1];
        writeMockDb(db);
        return [user];
      }
    }
    return [];
  }

  // INSERT INTO app_settings
  if (lowerSql.startsWith('insert into "app_settings"')) {
    const existing = db.app_settings.find(s => s.key === params[0]);
    if (existing) {
      existing.value = params[1];
    } else {
      db.app_settings.push({ key: params[0], value: params[1] });
    }
    writeMockDb(db);
    return [];
  }

  // UPDATE notifications
  if (lowerSql.startsWith('update "notifications"')) {
    if (lowerSql.includes('where "id" = $1')) {
      const notif = db.notifications.find(n => n.id === params[0]);
      if (notif) notif.read = true;
    } else if (lowerSql.includes('where "userid" = $1')) {
      db.notifications.forEach(n => {
        if (n.userId === params[0]) n.read = true;
      });
    }
    writeMockDb(db);
    return [];
  }

  // INSERT INTO notifications
  if (lowerSql.startsWith('insert into "notifications"')) {
    const newNotif = {
      id: params[0],
      userId: params[1],
      type: params[2],
      title: params[3],
      message: params[4],
      khMessage: params[5] || '',
      link: params[6] || '',
      evaluationId: params[7] || null,
      read: params[8] || false,
      createdAt: new Date().toISOString()
    };
    db.notifications = db.notifications || [];
    db.notifications.push(newNotif);
    writeMockDb(db);
    return [newNotif];
  }

  // UPDATE evaluations
  if (lowerSql.startsWith('update "evaluations"')) {
    const id = params[16];
    const idx = db.evaluations.findIndex(e => String(e.id) === String(id));
    if (idx >= 0) {
      db.evaluations[idx] = {
        ...db.evaluations[idx],
        employeeId: params[0],
        employeeName: params[1],
        campus: params[2],
        department: params[3] || '',
        position: params[4],
        appraiser: params[5],
        supporter: params[6] || '',
        reviewDate: params[7],
        weightScheme: params[8],
        evaluationType: params[9] || 'management',
        evalPeriod: params[10] || '',
        totalSelf: parseFloat(params[11]) || 0,
        totalSuper: parseFloat(params[12]) || 0,
        overallScore: parseFloat(params[13]) || 0,
        evaluatorComments: params[14] || '',
        status: params[15] || 'Draft'
      };
      writeMockDb(db);
    }
    return [];
  }

  // INSERT INTO evaluations
  if (lowerSql.startsWith('insert into "evaluations"')) {
    const isImport = /^insert\s+into\s+"evaluations"\s*\(\s*"id"/i.test(cleanSql);
    let id: number;
    let employeeId: string, employeeName: string, campus: string, position: string, appraiser: string, reviewDate: string, weightScheme: string, evaluationType: string;
    let totalSelf: number, totalSuper: number, overallScore: number, createdBy: string, createdByName: string, createdAt: string;
    let department = '', supporter = '', evaluatorComments = '', status = 'Draft', evalPeriod = '';

    if (isImport) {
      id = parseInt(params[0]) || Date.now();
      employeeId = params[1];
      employeeName = params[2];
      campus = params[3];
      position = params[4];
      appraiser = params[5];
      reviewDate = params[6];
      weightScheme = params[7];
      evaluationType = params[8];
      totalSelf = parseFloat(params[9]) || 0;
      totalSuper = parseFloat(params[10]) || 0;
      overallScore = parseFloat(params[11]) || 0;
      createdBy = params[12];
      createdByName = params[13];
      createdAt = params[14] || new Date().toISOString();
    } else {
      id = (db.evaluations || []).reduce((max, e) => Math.max(max, parseInt(e.id) || 0), 0) + 1;
      employeeId = params[0];
      employeeName = params[1];
      campus = params[2];
      department = params[3] || '';
      position = params[4];
      appraiser = params[5];
      supporter = params[6] || '';
      reviewDate = params[7];
      weightScheme = params[8];
      evaluationType = params[9] || 'management';
      evalPeriod = params[10] || '';
      totalSelf = parseFloat(params[11]) || 0;
      totalSuper = parseFloat(params[12]) || 0;
      overallScore = parseFloat(params[13]) || 0;
      evaluatorComments = params[14] || '';
      status = params[15] || 'Draft';
      createdBy = params[16];
      createdByName = params[17];
      createdAt = new Date().toISOString();
    }

    const newEval = {
      id, employeeId, employeeName, campus, department, position, appraiser, supporter, reviewDate,
      weightScheme, evaluationType, evalPeriod, totalSelf, totalSuper, overallScore, evaluatorComments,
      status, createdBy, createdByName, createdAt
    };

    db.evaluations = db.evaluations || [];
    const idx = db.evaluations.findIndex(e => String(e.id) === String(id));
    if (idx >= 0) {
      db.evaluations[idx] = { ...db.evaluations[idx], ...newEval };
    } else {
      db.evaluations.push(newEval);
    }
    writeMockDb(db);
    return [{ id }];
  }

  // INSERT INTO criteria_scores
  if (lowerSql.startsWith('insert into "criteria_scores"')) {
    const isImport = /^insert\s+into\s+"criteria_scores"\s*\(\s*"id"/i.test(cleanSql);
    let id: number;
    let evaluationId: number, criteriaId: number, selfScore: number, superScore: number, supporterScore: number, managementScore: number, aspScore: number;

    if (isImport) {
      id = parseInt(params[0]) || Date.now();
      evaluationId = parseInt(params[1]);
      criteriaId = parseInt(params[2]);
      selfScore = parseFloat(params[3]) || 0;
      superScore = parseFloat(params[4]) || 0;
      supporterScore = parseFloat(params[5]) || 0;
      managementScore = parseFloat(params[6]) || 0;
      aspScore = parseFloat(params[7]) || 0;
    } else {
      id = (db.criteria_scores || []).reduce((max, c) => Math.max(max, parseInt(c.id) || 0), 0) + 1;
      evaluationId = parseInt(params[0]);
      criteriaId = parseInt(params[1]);
      selfScore = parseFloat(params[2]) || 0;
      superScore = parseFloat(params[3]) || 0;
      supporterScore = parseFloat(params[4]) || 0;
      managementScore = parseFloat(params[5]) || 0;
      aspScore = parseFloat(params[6]) || 0;
    }

    const newScore = { id, evaluationId, criteriaId, selfScore, superScore, supporterScore, managementScore, aspScore };
    db.criteria_scores = db.criteria_scores || [];
    const idx = db.criteria_scores.findIndex(c => String(c.id) === String(id));
    if (idx >= 0) {
      db.criteria_scores[idx] = newScore;
    } else {
      db.criteria_scores.push(newScore);
    }
    writeMockDb(db);
    return [newScore];
  }

  // INSERT INTO peer_feedback
  if (lowerSql.startsWith('insert into "peer_feedback"')) {
    const id = (db.peer_feedback || []).reduce((max, p) => Math.max(max, parseInt(p.id) || 0), 0) + 1;
    const newFeedback = {
      id,
      evaluationId: params[0],
      peerName: params[1],
      feedback: params[2],
      score: params[3]
    };
    db.peer_feedback = db.peer_feedback || [];
    db.peer_feedback.push(newFeedback);
    writeMockDb(db);
    return [newFeedback];
  }

  // INSERT INTO employees
  if (lowerSql.startsWith('insert into "employees"')) {
    const d = {
      id: params[0],
      name: params[1],
      khmerName: params[2] || '',
      campus: params[3] || '',
      department: params[4] || '',
      position: params[5] || '',
      category: params[6] || '',
      supervisorId: params[7] || '',
      supporterId: params[8] || '',
      evalModel: params[9] || '',
      evalPeriod: params[10] || ''
    };
    
    db.employees = db.employees || [];
    const existingIdx = db.employees.findIndex(e => e.id === d.id);
    if (existingIdx >= 0) {
      db.employees[existingIdx] = d;
    } else {
      db.employees.push(d);
    }

    const searchEmployeeUserId = String(d.id || '').trim().toLowerCase();
    if (!db.users.find(u => String(u.id || '').trim().toLowerCase() === searchEmployeeUserId)) {
      db.users.push({
        id: d.id,
        name: d.name,
        password: 'emp@2026',
        role: 'employee'
      });
    } else {
      const user = db.users.find(u => String(u.id || '').trim().toLowerCase() === searchEmployeeUserId);
      if (user) user.name = d.name;
    }

    // Auto-provision Direct Supervisor if assigned and doesn't exist
    if (d.supervisorId && d.supervisorId.trim() !== '') {
      const searchSupervisorId = String(d.supervisorId || '').trim().toLowerCase();
      if (!db.users.find(u => String(u.id || '').trim().toLowerCase() === searchSupervisorId)) {
        db.users.push({
          id: d.supervisorId.trim(),
          name: `Supervisor ${d.supervisorId.trim()}`,
          password: 'sup@2026',
          role: 'supervisor'
        });
      }
    }

    // Auto-provision Supporter if assigned and doesn't exist
    if (d.supporterId && d.supporterId.trim() !== '') {
      const searchSupporterId = String(d.supporterId || '').trim().toLowerCase();
      if (!db.users.find(u => String(u.id || '').trim().toLowerCase() === searchSupporterId)) {
        db.users.push({
          id: d.supporterId.trim(),
          name: `Supporter ${d.supporterId.trim()}`,
          password: 'sup@2026',
          role: 'supporter'
        });
      }
    }
    
    writeMockDb(db);
    return [d];
  }

  return [];
}

const pool = {
  async connect() {
    if (useFallback) {
      return {
        query: async (sql: string, params?: any[]) => {
          const rows = executeMockQuery(sql, params);
          return { rows };
        },
        release: () => {}
      };
    }
    try {
      const client = await realPool!.connect();
      return client;
    } catch (err: any) {
      console.warn('Failed to connect to PostgreSQL. Switching to server-side JSON fallback.', err.message);
      useFallback = true;
      return this.connect();
    }
  },
  async query(sql: string, params?: any[]) {
    if (useFallback) {
      const rows = executeMockQuery(sql, params);
      return { rows };
    }
    try {
      return await realPool!.query(sql, params);
    } catch (err: any) {
      if (err.message?.includes('authentication failed') || err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
        console.warn('PostgreSQL connection error, falling back to local database file:', err.message);
        useFallback = true;
        const rows = executeMockQuery(sql, params);
        return { rows };
      }
      throw err;
    }
  },
  on: (event: string, handler: any) => {
    if (realPool) realPool.on(event, handler);
  }
};

export async function migrate() {
  if (APPS_SCRIPT_URL) {
    console.log('[Google Sheets] Google Apps Script URL configured. Synchronizing database with Google Sheet...');
    useFallback = true;
    readMockDb();
    await syncFromGoogleSheets();
    return;
  }

  if (useFallback) {
    console.log('PostgreSQL migration skipped: Using File-Persisted Mock Database fallback.');
    readMockDb();
    return;
  }
  
  try {
    const client = await realPool!.connect();
    try {
      await client.query('BEGIN');
      
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
        "criteriaId" BIGINT,
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
      `;
      
      await client.query(SCHEMA_SQL);
      await client.query('ALTER TABLE "criteria_scores" ALTER COLUMN "criteriaId" TYPE BIGINT;');

      const SEED_USERS_SQL = `
      INSERT INTO "users" ("id", "name", "password", "role")
      VALUES ($1, $2, $3, $4)
      ON CONFLICT ("id") DO UPDATE SET "password" = EXCLUDED."password", "name" = EXCLUDED."name", "role" = EXCLUDED."role";
      `;
      
      await client.query(SEED_USERS_SQL, ['superadmin', 'Super Administrator', 'super@2026', 'superadmin']);
      await client.query(SEED_USERS_SQL, ['admin', 'Administrator', 'admin@123', 'admin']);

      const SEED_SETTINGS_SQL = `
      INSERT INTO "app_settings" ("key", "value")
      VALUES ('evaluation_config', $1)
      ON CONFLICT ("key") DO NOTHING;
      `;
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
  } catch (err: any) {
    console.warn('Database migration failed on real PostgreSQL pool. Switching to server-side JSON fallback.', err.message);
    useFallback = true;
    readMockDb();
  }
}

export function transaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
  if (useFallback) {
    const mockClient = {
      query: async (sql: string, params?: any[]) => {
        const rows = executeMockQuery(sql, params);
        return { rows };
      },
      release: () => {}
    };
    return fn(mockClient);
  }
  
  return realPool!.connect().then(async (client) => {
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
  }).catch((err: any) => {
    console.warn('Transaction failed on PostgreSQL pool. Switching to server-side JSON fallback.', err.message);
    useFallback = true;
    const mockClient = {
      query: async (sql: string, params?: any[]) => {
        const rows = executeMockQuery(sql, params);
        return { rows };
      },
      release: () => {}
    };
    return fn(mockClient);
  });
}

export { pool };
