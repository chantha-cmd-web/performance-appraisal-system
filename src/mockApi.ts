const DB_VERSION = '11';

const defaultEvaluationConfig = JSON.stringify({
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

const defaultDb = {
  users: [
    { id: 'superadmin', name: 'Super Administrator', password: 'super@2026', role: 'superadmin' },
    { id: 'admin', name: 'Administrator', password: 'admin@123', role: 'admin' },
    { id: '201760', name: 'Chan Dara (Employee)', password: 'emp@2026', role: 'employee' },
    { id: 'sup001', name: 'Som Bopha (Supervisor)', password: 'sup@2026', role: 'supervisor' },
    { id: 'sup002', name: 'Keo Chantrea (Supporter)', password: 'sup@2026', role: 'supporter' }
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
  evaluations: [] as any[],
  criteriaScores: [] as any[],
  peerFeedbacks: [] as any[],
  auditLogs: [] as any[],
  notifications: [] as any[],
  settings: {
    evaluation_config: defaultEvaluationConfig,
    self_eval_profiles: '[]',
    hr_profiles: '[]',
    position_form_configs: JSON.stringify([{
      id: 'cfg-accountant', position: 'Accountant', weightingScheme: 'campus_60_40',
      sections: [
        { id: 'sec-1', name: 'Professional Competencies', khName: 'សមត្ថភាពវិជ្ជាជីវៈ', weight: 50, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values & Behavior', khName: 'តម្លៃ និងឥរិយាបទ', weight: 50, displayOrder: 1, status: 'active' }
      ],
      criteria: [
        { id: 1, sectionId: 'sec-1', kh: 'គណនេយ្យភាពហិរញ្ញវត្ថុ', en: 'Financial Accountability', khDesc: 'ការគ្រប់គ្រងហិរញ្ញវត្ថុ', desc: 'Accuracy in financial reporting', max: 10, displayOrder: 0, status: 'active' },
        { id: 2, sectionId: 'sec-1', kh: 'ជំនាញទន្ទឹនិយោបល់', en: 'Analytical Skills', khDesc: 'សមត្ថភាពវិភាគ', desc: 'Data analysis capability', max: 10, displayOrder: 1, status: 'active' },
        { id: 3, sectionId: 'sec-1', kh: 'ការប្រើប្រាស់ប្រព័ន្ធគណនេយ្យ', en: 'Accounting Software Proficiency', khDesc: 'ជំនាញប្រព័ន្ធ', desc: 'Proficiency in accounting tools', max: 10, displayOrder: 2, status: 'active' },
        { id: 4, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Enthusiasm and dedication', max: 10, displayOrder: 3, status: 'active' },
        { id: 5, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនង', desc: 'Interactions with colleagues', max: 10, displayOrder: 4, status: 'active' },
        { id: 6, sectionId: 'sec-2', kh: 'ការសហការក្រុម', en: 'Teamwork', khDesc: 'ការធ្វើការជាក្រុម', desc: 'Working well with others', max: 10, displayOrder: 5, status: 'active' }
      ]
    }, {
      id: 'cfg-supervisor', position: 'Supervisor', weightingScheme: 'campus_60_40',
      sections: [
        { id: 'sec-1', name: 'Leadership & Management', khName: 'ភាពជាអ្នកដឹកនាំ', weight: 60, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Professional Skills', khName: 'ជំនាញវិជ្ជាជីវៈ', weight: 40, displayOrder: 1, status: 'active' }
      ],
      criteria: [
        { id: 10, sectionId: 'sec-1', kh: 'ភាពជាអ្នកដឹកនាំ', en: 'Leadership', khDesc: 'ការដឹកនាំក្រុម', desc: 'Leadership qualities', max: 10, displayOrder: 0, status: 'active' },
        { id: 11, sectionId: 'sec-1', kh: 'ការគ្រប់គ្រងក្រុម', en: 'Team Management', khDesc: 'ការគ្រប់គ្រងបុគ្គលិក', desc: 'Managing team performance', max: 10, displayOrder: 1, status: 'active' },
        { id: 12, sectionId: 'sec-1', kh: 'ការសម្រេចចិត្ត', en: 'Decision Making', khDesc: 'ការសម្រេចចិត្ត', desc: 'Making sound decisions', max: 10, displayOrder: 2, status: 'active' },
        { id: 13, sectionId: 'sec-2', kh: 'ចំណេះដឹងការងារ', en: 'Job Knowledge', khDesc: 'ការយល់ដឹង', desc: 'Understanding of work', max: 10, displayOrder: 3, status: 'active' },
        { id: 14, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនង', desc: 'Communication skills', max: 10, displayOrder: 4, status: 'active' }
      ]
    }, {
      id: 'cfg-hr', position: 'HR Officer', weightingScheme: 'campus_60_40',
      sections: [
        { id: 'sec-1', name: 'HR Competencies', khName: 'សមត្ថភាពធនធានមនុស្ស', weight: 60, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 40, displayOrder: 1, status: 'active' }
      ],
      criteria: [
        { id: 20, sectionId: 'sec-1', kh: 'ការគ្រប់គ្រងធនធានមនុស្ស', en: 'HR Management', khDesc: 'ការគ្រប់គ្រងបុគ្គលិក', desc: 'HR process management', max: 10, displayOrder: 0, status: 'active' },
        { id: 21, sectionId: 'sec-1', kh: 'ការជ្រើសរើសបុគ្គលិក', en: 'Recruitment', khDesc: 'ការជ្រើសរើស', desc: 'Hiring process effectiveness', max: 10, displayOrder: 1, status: 'active' },
        { id: 22, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional attitude', max: 10, displayOrder: 2, status: 'active' },
        { id: 23, sectionId: 'sec-2', kh: 'ការសហការ', en: 'Collaboration', khDesc: 'ការធ្វើការជាមួយអ្នកដទៃ', desc: 'Working with others', max: 10, displayOrder: 3, status: 'active' }
      ]
    }])
  }
};

let serverAvailable: boolean | null = null;

const initMockDb = () => {
  try {
    const storedVersion = localStorage.getItem('mock_db_version');
    if (storedVersion !== DB_VERSION) {
      localStorage.setItem('mock_db', JSON.stringify(defaultDb));
      localStorage.setItem('mock_db_version', DB_VERSION);
    } else if (!localStorage.getItem('mock_db')) {
      localStorage.setItem('mock_db', JSON.stringify(defaultDb));
    }
  } catch (e) {
    console.warn('localStorage not available', e);
  }
};

const getDb = () => {
  try {
    return JSON.parse(localStorage.getItem('mock_db') || '{}');
  } catch (e) {
    return {};
  }
};
const saveDb = (db: any) => {
  try {
    localStorage.setItem('mock_db', JSON.stringify(db));
  } catch (e) {}
};

function getJsonBody(init?: RequestInit): any {
  try {
    if (init?.body && typeof init.body === 'string') {
      return JSON.parse(init.body);
    }
  } catch (e) {}
  return null;
}

function makeResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof Request) return input.url;
  if (input instanceof URL) return input.toString();
  if (input && typeof (input as any).toString === 'function') return (input as any).toString();
  return '';
}

function extractToken(init?: RequestInit): string | null {
  const authHeader = init?.headers && (typeof init.headers === 'object' ? (init.headers as any)?.Authorization : null);
  return authHeader && typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : null;
}

function handleMockRequest(url: string, method: string, body: any, token: string | null, db: any): Response {
  const currentUser = token ? db.users?.find((u: any) => u.id === token || token === 'mock-token') : null;
  const isAdminUser = currentUser && currentUser.role === 'superadmin';

  if (url.includes('/api/auth/login') && method === 'POST') {
    const user = db.users?.find((u: any) => u.id === body?.userId && u.password === body?.password);
    if (user) {
      const { password: _, ...safeUser } = user;
      return makeResponse({ token: 'mock-token', user: safeUser });
    }
    return makeResponse({ error: 'Invalid User ID or Password' }, 401);
  }

  if (url.includes('/api/auth/me')) {
    if (!token) return makeResponse({ error: 'Unauthorized' }, 401);
    return makeResponse({ user: currentUser });
  }

  if (url.includes('/api/settings/') && method === 'GET') {
    const key = url.split('/').pop()!;
    let data = db.settings?.[key];
    try { data = JSON.parse(data); } catch (e) {}
    if (data === undefined || data === null) {
      if (key === 'evaluation_config') data = JSON.parse(defaultEvaluationConfig);
      else data = [];
    }
    return makeResponse(data);
  }

  if (url.includes('/api/settings/') && method === 'POST') {
    if (!isAdminUser) return makeResponse({ error: 'Access denied.' }, 403);
    const key = url.split('/').pop()!;
    if (!db.settings) db.settings = {};
    db.settings[key] = typeof body === 'string' ? body : JSON.stringify(body);
    saveDb(db);
    return makeResponse({ success: true });
  }

  if (url.includes('/api/employees')) {
    if (method === 'GET') {
      const id = new URL(url, window.location.origin).searchParams.get('id');
      if (id) {
        const emp = db.employees?.find((e: any) => e.id === id);
        if (emp && !isAdminUser && currentUser && emp.id !== currentUser.id && emp.supervisorId !== currentUser.id && emp.supporterId !== currentUser.id) {
          return makeResponse(null);
        }
        return makeResponse(emp || null);
      }
      if (isAdminUser) return makeResponse(db.employees || []);
      const assignedEmps = db.employees?.filter((e: any) => currentUser && (e.supervisorId === currentUser.id || e.supporterId === currentUser.id)) || [];
      return makeResponse(assignedEmps);
    }
    if (method === 'POST') {
      if (!isAdminUser) return makeResponse({ error: 'Access denied. Super Admin only.' }, 403);
      if (!db.employees) db.employees = [];
      const idx = db.employees.findIndex((e: any) => e.id === body?.id);
      if (idx >= 0) db.employees[idx] = body;
      else db.employees.push(body);
      if (body?.id && body?.name && !db.users.find((u: any) => u.id === body.id)) {
        db.users.push({ id: body.id, name: body.name, password: 'emp@2026', role: 'employee' });
      }
      saveDb(db);
      return makeResponse({ success: true });
    }
    if (method === 'DELETE') {
      if (!isAdminUser) return makeResponse({ error: 'Access denied.' }, 403);
      const id = url.split('/').pop();
      if (db.employees) db.employees = db.employees.filter((e: any) => e.id !== id);
      saveDb(db);
      return makeResponse({ success: true });
    }
  }

  if (url.includes('/api/evaluations')) {
    const idMatch = url.match(/\/api\/evaluations\/(\d+|mock-[\w-]+)/);
    const id = idMatch ? idMatch[1] : null;

    if (method === 'GET') {
      if (id) {
        const ev = db.evaluations?.find((e: any) => e.id == id);
        if (!ev) return makeResponse({ error: 'Not found' }, 404);
        if (!isAdminUser && currentUser && ev.createdBy !== currentUser.id && ev.appraiser !== currentUser.id && ev.supporter !== currentUser.id && ev.employeeId !== currentUser.id) {
          return makeResponse({ error: 'Access denied.' }, 403);
        }
        return makeResponse(ev);
      }
      let evals = db.evaluations || [];
      if (!isAdminUser && currentUser) {
        evals = evals.filter((e: any) => e.createdBy === currentUser.id || e.appraiser === currentUser.id || e.supporter === currentUser.id || e.employeeId === currentUser.id);
      }
      return makeResponse(evals);
    }
    if (method === 'POST') {
      if (!isAdminUser && currentUser && body.employeeId !== currentUser.id && body.appraiser !== currentUser.id && body.supporter !== currentUser.id) {
        return makeResponse({ error: 'Access denied.' }, 403);
      }
      if (!db.evaluations) db.evaluations = [];
      body.id = 'mock-' + Date.now();
      body.createdAt = new Date().toISOString();
      db.evaluations.push(body);
      saveDb(db);
      return makeResponse({ success: true, id: body.id });
    }
    if (method === 'PUT' && id) {
      if (!db.evaluations) db.evaluations = [];
      const idx = db.evaluations.findIndex((e: any) => e.id == id);
      if (idx >= 0) {
        const ev = db.evaluations[idx];
        if (!isAdminUser && currentUser && ev.createdBy !== currentUser.id && ev.appraiser !== currentUser.id && ev.supporter !== currentUser.id && ev.employeeId !== currentUser.id) {
          return makeResponse({ error: 'Access denied.' }, 403);
        }
        db.evaluations[idx] = { ...ev, ...body, id: ev.id };
        saveDb(db);
      }
      return makeResponse({ success: true });
    }
    if (method === 'DELETE' && id) {
      if (!isAdminUser && currentUser) {
        const ev = db.evaluations?.find((e: any) => e.id == id);
        if (ev && ev.createdBy !== currentUser.id) {
          return makeResponse({ error: 'Access denied.' }, 403);
        }
      }
      if (db.evaluations) db.evaluations = db.evaluations.filter((e: any) => e.id != id);
      saveDb(db);
      return makeResponse({ success: true });
    }
  }

  if (url.includes('/api/users/reset') && method === 'POST') {
    db.users = defaultDb.users.map(u => ({ ...u }));
    db.employees = defaultDb.employees.map(e => ({ ...e }));
    db.evaluations = [];
    db.notifications = [];
    db.auditLogs = [];
    if (db.settings) {
      db.settings.position_form_configs = defaultDb.settings.position_form_configs;
    }
    saveDb(db);
    return makeResponse({ success: true });
  }

  if (url.includes('/api/users') && !url.includes('/api/users/reset')) {
    const id = url.split('/').pop();
    if (method === 'GET') {
      if (!isAdminUser) return makeResponse({ error: 'Access denied.' }, 403);
      const safeUsers = (db.users || []).map((u: any) => ({ id: u.id, name: u.name, role: u.role }));
      return makeResponse(safeUsers);
    }
    if (method === 'POST') {
      if (!isAdminUser) return makeResponse({ error: 'Access denied.' }, 403);
      if (!db.users) db.users = [];
      db.users.push(body);
      saveDb(db);
      return makeResponse({ success: true });
    }
    if (method === 'PUT' && id) {
      if (!isAdminUser) return makeResponse({ error: 'Access denied.' }, 403);
      if (!db.users) db.users = [];
      const idx = db.users.findIndex((u: any) => u.id === id);
      if (idx >= 0) {
        const updated = { ...db.users[idx], ...body, id: db.users[idx].id };
        if (!body.password || body.password.trim() === '') delete updated.password;
        db.users[idx] = updated;
        saveDb(db);
      }
      return makeResponse({ success: true });
    }
    if (method === 'DELETE' && id) {
      if (!isAdminUser) return makeResponse({ error: 'Access denied.' }, 403);
      if (db.users) db.users = db.users.filter((u: any) => u.id !== id);
      saveDb(db);
      return makeResponse({ success: true });
    }
  }

  if (url.includes('/api/audit-logs')) {
    if (method === 'GET') {
      return makeResponse(isAdminUser ? (db.auditLogs || []) : []);
    }
    if (method === 'POST') {
      if (!db.auditLogs) db.auditLogs = [];
      const entry = { ...body, id: db.auditLogs.length + 1, timestamp: new Date().toISOString() };
      db.auditLogs.push(entry);
      saveDb(db);
      return makeResponse({ success: true });
    }
  }

  if (url.includes('/api/notifications')) {
    if (method === 'GET') {
      if (!db.notifications) db.notifications = [];
      if (!isAdminUser && currentUser) {
        return makeResponse(db.notifications.filter((n: any) => n.userId === currentUser.id));
      }
      return makeResponse(db.notifications);
    }
    if (method === 'POST') {
      if (!db.notifications) db.notifications = [];
      const notification = { ...body, id: 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), createdAt: new Date().toISOString(), read: false };
      db.notifications.unshift(notification);
      saveDb(db);
      return makeResponse({ success: true, id: notification.id });
    }
    if (method === 'PUT') {
      if (!db.notifications) db.notifications = [];
      if (body?.id && body?.read) {
        const idx = db.notifications.findIndex((n: any) => n.id === body.id);
        if (idx >= 0) db.notifications[idx].read = true;
      }
      if (body?.markAllRead && body?.userId) {
        db.notifications.forEach((n: any) => { if (n.userId === body.userId) n.read = true; });
      }
      saveDb(db);
      return makeResponse({ success: true });
    }
    if (method === 'DELETE') {
      if (!db.notifications) db.notifications = [];
      const notifId = url.split('/').pop();
      db.notifications = db.notifications.filter((n: any) => n.id !== notifId);
      saveDb(db);
      return makeResponse({ success: true });
    }
  }

  if (url.includes('/api/data/export') && method === 'GET') {
    if (!isAdminUser) return makeResponse({ error: 'Access denied.' }, 403);
    return makeResponse(db);
  }
  if (url.includes('/api/data/import') && method === 'POST') {
    if (!isAdminUser) return makeResponse({ error: 'Access denied.' }, 403);
    saveDb(body);
    return makeResponse({ success: true });
  }
  if (url.includes('/api/data/reset/') && method === 'POST') {
    if (!isAdminUser) return makeResponse({ error: 'Access denied.' }, 403);
    const type = url.split('/').pop()!;
    if (type === 'all') {
      db.users = defaultDb.users.map(u => ({ ...u }));
      db.employees = [];
      db.evaluations = [];
      db.auditLogs = [];
      db.notifications = [];
      if (db.settings) {
        db.settings.evaluation_config = defaultEvaluationConfig;
        db.settings.self_eval_profiles = '[]';
        db.settings.hr_profiles = '[]';
        db.settings.position_form_configs = '[]';
      }
    } else if (type === 'evaluations') {
      db.evaluations = [];
    } else if (type === 'employees') {
      db.employees = [];
    } else if (type === 'users') {
      db.users = defaultDb.users.map(u => ({ ...u }));
    }
    saveDb(db);
    return makeResponse({ success: true });
  }

  return makeResponse({ success: true, data: [] });
}

async function checkServerAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await window.fetch('/api/auth/me', { signal: controller.signal });
    clearTimeout(timeout);
    return res.status !== 404 || true;
  } catch {
    return false;
  }
}

export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = extractUrl(input);

  if (url.includes('/api/')) {
    if (serverAvailable === null) {
      serverAvailable = await checkServerAvailable();
      if (!serverAvailable) {
        initMockDb();
      }
    }

    if (serverAvailable) {
      try {
        return await window.fetch(input, init);
      } catch {
        serverAvailable = false;
        initMockDb();
      }
    }

    const method = init?.method || 'GET';
    const body = getJsonBody(init);
    const token = extractToken(init);
    const db = getDb();
    await new Promise(r => setTimeout(r, 50));
    return handleMockRequest(url, method, body, token, db);
  }

  return window.fetch(input, init);
};

type RealtimeEventHandler = (data: any) => void;

let wsInstance: WebSocket | null = null;
let eventHandlers: Map<string, Set<RealtimeEventHandler>> = new Map();
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 50;

export function connectRealtime(token: string) {
  if (serverAvailable === false) return;
  if (wsInstance && (wsInstance.readyState === WebSocket.OPEN || wsInstance.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;

  wsInstance = new WebSocket(wsUrl);

  wsInstance.onopen = () => {
    reconnectAttempts = 0;
    console.log('[Realtime] Connected');
  };

  wsInstance.onmessage = (event) => {
    try {
      const { event: eventName, data } = JSON.parse(event.data);
      const handlers = eventHandlers.get(eventName);
      if (handlers) {
        handlers.forEach(handler => handler(data));
      }
      const wildcardHandlers = eventHandlers.get('*');
      if (wildcardHandlers) {
        wildcardHandlers.forEach(handler => handler({ event: eventName, data }));
      }
    } catch (e) {
      console.error('[Realtime] Message parse error:', e);
    }
  };

  wsInstance.onclose = () => {
    console.log('[Realtime] Disconnected');
    wsInstance = null;
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && serverAvailable !== false) {
      const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000);
      reconnectAttempts++;
      reconnectTimeout = setTimeout(() => connectRealtime(token), delay);
    }
  };

  wsInstance.onerror = () => {
    wsInstance?.close();
  };
}

export function disconnectRealtime() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
  if (wsInstance) {
    wsInstance.close();
    wsInstance = null;
  }
  eventHandlers.clear();
}

export function subscribeRealtime(event: string, handler: RealtimeEventHandler): () => void {
  if (!eventHandlers.has(event)) {
    eventHandlers.set(event, new Set());
  }
  eventHandlers.get(event)!.add(handler);

  return () => {
    eventHandlers.get(event)?.delete(handler);
    if (eventHandlers.get(event)?.size === 0) {
      eventHandlers.delete(event);
    }
  };
}

export function isRealtimeConnected(): boolean {
  return wsInstance !== null && wsInstance.readyState === WebSocket.OPEN;
}
