const DB_VERSION = '12';

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
    hr_profiles: JSON.stringify({
      campuses: 'Main Campus\nNorth Campus\nSouth Campus',
      departments: 'IT\nHR\nFinance\nOperations\nAcademics\nManagement\nStudent Affairs\nLibrary\nNursing\nLaboratory',
      positions: 'Management\nCentral Officer\nSupervisor\nHR\nAdministrator\nRegistrar\nAccountant\nStock Controller\nUniform Seller\nCustomer Service\nStudent Affairs\nNurse\nLaboratory Assistant\nLibrarian\nGEP Officer\nTeaching Assistant (TA)\nNanny\nDiscipline Officer',
      categories: 'Full-time\nPart-time\nContractor',
      evalModels: 'campus_100\ncampus_60_40\ncampus_50_50\ncampus_100',
      evalPeriods: 'Q1 2026\nQ2 2026\nQ3 2026\nQ4 2026\nAnnual 2026'
    }),
    position_form_configs: JSON.stringify([
      { id: 'cfg-management', position: 'Management', weightingScheme: 'management_100', sections: [
        { id: 'sec-1', name: 'Strategic Leadership', khName: 'ភាពដឹកនាំយុទ្ធសាស្ត្រ', weight: 40, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Operations Management', khName: 'ការគ្រប់គ្រងប្រតិបត្តិការ', weight: 35, displayOrder: 1, status: 'active' },
        { id: 'sec-3', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 25, displayOrder: 2, status: 'active' }
      ], criteria: [
        { id: 101, sectionId: 'sec-1', kh: 'ការដឹកនាំយុទ្ធសាស្ត្រ', en: 'Strategic Leadership', khDesc: 'ការគ្រោងការណ៍យុទ្ធសាស្ត្រ', desc: 'Ability to set and execute long-term vision', max: 10, displayOrder: 0, status: 'active' },
        { id: 102, sectionId: 'sec-1', kh: 'ការសម្រេចចិត្ត', en: 'Decision Making', khDesc: 'ការសម្រេចចិត្តប្រកបដោយប្រសិទ្ធភាព', desc: 'Sound and timely decision-making', max: 10, displayOrder: 1, status: 'active' },
        { id: 103, sectionId: 'sec-1', kh: 'ការគ្រប់គ្រងការផ្លាស់ប្តូរ', en: 'Change Management', khDesc: 'ការដឹកនាំការផ្លាស់ប្តូរ', desc: 'Leading organizational change effectively', max: 10, displayOrder: 2, status: 'active' },
        { id: 104, sectionId: 'sec-2', kh: 'ប្រសិទ្ធភាពប្រតិបត្តិការ', en: 'Operational Efficiency', khDesc: 'ការរក្សាប្រសិទ្ធភាពការងារ', desc: 'Ensuring smooth daily operations', max: 10, displayOrder: 3, status: 'active' },
        { id: 105, sectionId: 'sec-2', kh: 'ការគ្រប់គ្រងធនធាន', en: 'Resource Management', khDesc: 'ការគ្រប់គ្រងធនធានមនុស្ស និងហិរញ្ញវត្ថុ', desc: 'Effective use of human and financial resources', max: 10, displayOrder: 4, status: 'active' },
        { id: 106, sectionId: 'sec-2', kh: 'ការដាក់ចេញគោលការណ៍', en: 'Policy Implementation', khDesc: 'ការអនុវត្តន៍គោលនយោបាយ', desc: 'Implementing organizational policies', max: 10, displayOrder: 5, status: 'active' },
        { id: 107, sectionId: 'sec-3', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍ និងភាពសាទរ', desc: 'Professional enthusiasm and dedication', max: 10, displayOrder: 6, status: 'active' },
        { id: 108, sectionId: 'sec-3', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនងជាមួយបុគ្គលិក', desc: 'Clear and effective communication', max: 10, displayOrder: 7, status: 'active' },
        { id: 109, sectionId: 'sec-3', kh: 'ភាពជាគំរូ', en: 'Role Model', khDesc: 'ការដើរតួជាគំរូសម្រាប់បុគ្គលិក', desc: 'Leading by example', max: 10, displayOrder: 8, status: 'active' }
      ]},
      { id: 'cfg-central-officer', position: 'Central Officer', weightingScheme: 'central_100', sections: [
        { id: 'sec-1', name: 'Administrative Skills', khName: 'ជំនាញរដ្ឋបាល', weight: 50, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 50, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 110, sectionId: 'sec-1', kh: 'ជំនាញរដ្ឋបាល', en: 'Administrative Skills', khDesc: 'ការគ្រប់គ្រងការងាររដ្ឋបាល', desc: 'Managing administrative tasks effectively', max: 10, displayOrder: 0, status: 'active' },
        { id: 111, sectionId: 'sec-1', kh: 'ការរៀបចំឯកសារ', en: 'Documentation', khDesc: 'ការរៀបចំ និងរក្សាទុកឯកសារ', desc: 'Organizing and maintaining documents', max: 10, displayOrder: 1, status: 'active' },
        { id: 112, sectionId: 'sec-1', kh: 'ការប្រើប្រាស់ប្រព័ន្ធបច្ចេកវិទ្យា', en: 'Technology Use', khDesc: 'ជំនាញប្រើប្រាស់កុំព្យូទ័រ', desc: 'Proficiency in office technology', max: 10, displayOrder: 2, status: 'active' },
        { id: 113, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍ និងភាពសាទរ', desc: 'Professional enthusiasm and dedication', max: 10, displayOrder: 3, status: 'active' },
        { id: 114, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនងជាមួយសហការី', desc: 'Effective communication skills', max: 10, displayOrder: 4, status: 'active' },
        { id: 115, sectionId: 'sec-2', kh: 'ការសហការក្រុម', en: 'Teamwork', khDesc: 'ការធ្វើការជាក្រុម', desc: 'Collaborating with team members', max: 10, displayOrder: 5, status: 'active' }
      ]},
      { id: 'cfg-supervisor', position: 'Supervisor', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'Leadership & Management', khName: 'ភាពជាអ្នកដឹកនាំ', weight: 60, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Professional Skills', khName: 'ជំនាញវិជ្ជាជីវៈ', weight: 40, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 116, sectionId: 'sec-1', kh: 'ភាពជាអ្នកដឹកនាំ', en: 'Leadership', khDesc: 'ការដឹកនាំក្រុម', desc: 'Leadership qualities and team building', max: 10, displayOrder: 0, status: 'active' },
        { id: 117, sectionId: 'sec-1', kh: 'ការគ្រប់គ្រងក្រុម', en: 'Team Management', khDesc: 'ការគ្រប់គ្រងបុគ្គលិក', desc: 'Managing team performance', max: 10, displayOrder: 1, status: 'active' },
        { id: 118, sectionId: 'sec-1', kh: 'ការសម្រេចចិត្ត', en: 'Decision Making', khDesc: 'ការសម្រេចចិត្ត', desc: 'Making sound decisions', max: 10, displayOrder: 2, status: 'active' },
        { id: 119, sectionId: 'sec-1', kh: 'ការដាក់ចេញការងារ', en: 'Task Assignment', khDesc: 'ការចែកចាយការងារ', desc: 'Effective delegation of tasks', max: 10, displayOrder: 3, status: 'active' },
        { id: 120, sectionId: 'sec-2', kh: 'ចំណេះដឹងការងារ', en: 'Job Knowledge', khDesc: 'ការយល់ដឹងអំពីការងារ', desc: 'Understanding of work responsibilities', max: 10, displayOrder: 4, status: 'active' },
        { id: 121, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនង', desc: 'Communication skills', max: 10, displayOrder: 5, status: 'active' },
        { id: 122, sectionId: 'sec-2', kh: 'ការដោះស្រាយបញ្ហា', en: 'Problem Solving', khDesc: 'សមត្ថភាពដោះស្រាយបញ្ហា', desc: 'Resolving issues effectively', max: 10, displayOrder: 6, status: 'active' }
      ]},
      { id: 'cfg-hr', position: 'HR', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'HR Competencies', khName: 'សមត្ថភាពធនធានមនុស្ស', weight: 60, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 40, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 123, sectionId: 'sec-1', kh: 'ការគ្រប់គ្រងធនធានមនុស្ស', en: 'HR Management', khDesc: 'ការគ្រប់គ្រងបុគ្គលិក', desc: 'HR process management', max: 10, displayOrder: 0, status: 'active' },
        { id: 124, sectionId: 'sec-1', kh: 'ការជ្រើសរើសបុគ្គលិក', en: 'Recruitment', khDesc: 'ការជ្រើសរើសបុគ្គលិក', desc: 'Hiring process effectiveness', max: 10, displayOrder: 1, status: 'active' },
        { id: 125, sectionId: 'sec-1', kh: 'ការបណ្តុះបណ្តាល', en: 'Training & Development', khDesc: 'ការបណ្តុះបណ្តាលបុគ្គលិក', desc: 'Employee training programs', max: 10, displayOrder: 2, status: 'active' },
        { id: 126, sectionId: 'sec-1', kh: 'ការគ្រប់គ្រងប្រាក់ខែ', en: 'Compensation & Benefits', khDesc: 'ការគ្រប់គ្រងប្រាក់ខែ និងអត្ថប្រយោជន៍', desc: 'Managing payroll and benefits', max: 10, displayOrder: 3, status: 'active' },
        { id: 127, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional attitude', max: 10, displayOrder: 4, status: 'active' },
        { id: 128, sectionId: 'sec-2', kh: 'ការសហការ', en: 'Collaboration', khDesc: 'ការធ្វើការជាមួយអ្នកដទៃ', desc: 'Working with others', max: 10, displayOrder: 5, status: 'active' },
        { id: 129, sectionId: 'sec-2', kh: 'ភាពឯកជន', en: 'Confidentiality', khDesc: 'ការរក្សាការសម្ងាត់', desc: 'Maintaining confidentiality', max: 10, displayOrder: 6, status: 'active' }
      ]},
      { id: 'cfg-administrator', position: 'Administrator', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'Administrative Operations', khName: 'ប្រតិបត្តិការរដ្ឋបាល', weight: 55, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 45, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 130, sectionId: 'sec-1', kh: 'ការគ្រប់គ្រងការិយាល័យ', en: 'Office Management', khDesc: 'ការគ្រប់គ្រងការិយាល័យ', desc: 'Managing office operations', max: 10, displayOrder: 0, status: 'active' },
        { id: 131, sectionId: 'sec-1', kh: 'ការរៀបចំឯកសារ', en: 'Document Management', khDesc: 'ការរៀបចំ និងរក្សាទុកឯកសារ', desc: 'Organizing and filing documents', max: 10, displayOrder: 1, status: 'active' },
        { id: 132, sectionId: 'sec-1', kh: 'ការគ្រប់គ្រងកម្មវិធី', en: 'Program Coordination', khDesc: 'ការរៀបចំ និងត្រួតពិនិត្យកម្មវិធី', desc: 'Coordinating school programs', max: 10, displayOrder: 2, status: 'active' },
        { id: 133, sectionId: 'sec-1', kh: 'ការប្រើប្រាស់ប្រព័ន្ធបច្ចេកវិទ្យា', en: 'Technology Use', khDesc: 'ជំនាញប្រើប្រាស់ប្រព័ន្ធបច្ចេកវិទ្យា', desc: 'Proficiency in office technology', max: 10, displayOrder: 3, status: 'active' },
        { id: 134, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional enthusiasm', max: 10, displayOrder: 4, status: 'active' },
        { id: 135, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនង', desc: 'Effective communication', max: 10, displayOrder: 5, status: 'active' },
        { id: 136, sectionId: 'sec-2', kh: 'ការសហការក្រុម', en: 'Teamwork', khDesc: 'ការធ្វើការជាក្រុម', desc: 'Working well with others', max: 10, displayOrder: 6, status: 'active' }
      ]},
      { id: 'cfg-registrar', position: 'Registrar', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'Student Records', khName: 'ការគ្រប់គ្រងកំណត់ត្រា', weight: 55, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 45, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 137, sectionId: 'sec-1', kh: 'ការគ្រប់គ្រងព័ត៌មានសិស្ស', en: 'Student Data Management', khDesc: 'ការរក្សាទុក និងគ្រប់គ្រងព័ត៌មានសិស្ស', desc: 'Managing student records accurately', max: 10, displayOrder: 0, status: 'active' },
        { id: 138, sectionId: 'sec-1', kh: 'ការចុះឈ្មោះសិស្ស', en: 'Student Enrollment', khDesc: 'ដំណើរការចុះឈ្មោះសិស្ស', desc: 'Managing enrollment processes', max: 10, displayOrder: 1, status: 'active' },
        { id: 139, sectionId: 'sec-1', kh: 'ការរៀបចំបញ្ជីឈ្មោះ', en: 'List Compilation', khDesc: 'ការរៀបចំបញ្ជីឈ្មោះ និងរបាយការណ៍', desc: 'Compiling lists and reports', max: 10, displayOrder: 2, status: 'active' },
        { id: 140, sectionId: 'sec-1', kh: 'ភាពត្រឹមត្រូវ', en: 'Document Accuracy', khDesc: 'ភាពត្រឹមត្រូវនៃឯកសារសិស្ស', desc: 'Ensuring accuracy of student documents', max: 10, displayOrder: 3, status: 'active' },
        { id: 141, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional enthusiasm', max: 10, displayOrder: 4, status: 'active' },
        { id: 142, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនងជាមួយសិស្ស និងមាតាបិតា', desc: 'Communicating with students and parents', max: 10, displayOrder: 5, status: 'active' },
        { id: 143, sectionId: 'sec-2', kh: 'ភាពឯកជន', en: 'Confidentiality', khDesc: 'ការរក្សាការសម្ងាត់', desc: 'Maintaining data confidentiality', max: 10, displayOrder: 6, status: 'active' }
      ]},
      { id: 'cfg-accountant', position: 'Accountant', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'Professional Competencies', khName: 'សមត្ថភាពវិជ្ជាជីវៈ', weight: 55, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 45, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 144, sectionId: 'sec-1', kh: 'គណនេយ្យភាពហិរញ្ញវត្ថុ', en: 'Financial Accountability', khDesc: 'ការគ្រប់គ្រងហិរញ្ញវត្ថុ', desc: 'Accuracy in financial reporting', max: 10, displayOrder: 0, status: 'active' },
        { id: 145, sectionId: 'sec-1', kh: 'ជំនាញវិភាគ', en: 'Analytical Skills', khDesc: 'សមត្ថភាពវិភាគទិន្នន័យ', desc: 'Data analysis capability', max: 10, displayOrder: 1, status: 'active' },
        { id: 146, sectionId: 'sec-1', kh: 'ជំនាញប្រព័ន្ធគណនេយ្យ', en: 'Accounting Software', khDesc: 'ជំនាញប្រព័ន្ធគណនេយ្យ', desc: 'Proficiency in accounting tools', max: 10, displayOrder: 2, status: 'active' },
        { id: 147, sectionId: 'sec-1', kh: 'ការត្រួតពិនិត្យឯកសារ', en: 'Financial Auditing', khDesc: 'ការត្រួតពិនិត្យឯកសារហិរញ្ញវត្ថុ', desc: 'Financial document auditing', max: 10, displayOrder: 3, status: 'active' },
        { id: 148, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional enthusiasm', max: 10, displayOrder: 4, status: 'active' },
        { id: 149, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនង', desc: 'Effective communication', max: 10, displayOrder: 5, status: 'active' },
        { id: 150, sectionId: 'sec-2', kh: 'ការសហការក្រុម', en: 'Teamwork', khDesc: 'ការធ្វើការជាក្រុម', desc: 'Working well with others', max: 10, displayOrder: 6, status: 'active' }
      ]},
      { id: 'cfg-stock-controller', position: 'Stock Controller', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'Inventory Management', khName: 'ការគ្រប់គ្រងស្តុក', weight: 55, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 45, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 151, sectionId: 'sec-1', kh: 'ការគ្រប់គ្រងស្តុកទំនិញ', en: 'Inventory Control', khDesc: 'ការត្រួតពិនិត្យ និងគ្រប់គ្រងស្តុក', desc: 'Monitoring and managing stock levels', max: 10, displayOrder: 0, status: 'active' },
        { id: 152, sectionId: 'sec-1', kh: 'ការតាមដានទំនិញ', en: 'Stock Tracking', khDesc: 'ការតាមដានទំនិញចេញ-ចូល', desc: 'Tracking stock movements', max: 10, displayOrder: 1, status: 'active' },
        { id: 153, sectionId: 'sec-1', kh: 'ភាពត្រឹមត្រូវ', en: 'Record Accuracy', khDesc: 'ភាពត្រឹមត្រូវនៃកំណត់ត្រាស្តុក', desc: 'Maintaining accurate stock records', max: 10, displayOrder: 2, status: 'active' },
        { id: 154, sectionId: 'sec-1', kh: 'ការរៀបចំឃ្លាំង', en: 'Warehouse Organization', khDesc: 'ការរៀបចំ និងថែរក្សាឃ្លាំង', desc: 'Organizing storage areas', max: 10, displayOrder: 3, status: 'active' },
        { id: 155, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional enthusiasm', max: 10, displayOrder: 4, status: 'active' },
        { id: 156, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនង', desc: 'Effective communication', max: 10, displayOrder: 5, status: 'active' },
        { id: 157, sectionId: 'sec-2', kh: 'ភាពស្មោះត្រង់', en: 'Honesty', khDesc: 'ភាពស្មោះត្រង់ និងតម្លាភាព', desc: 'Honesty and transparency', max: 10, displayOrder: 6, status: 'active' }
      ]},
      { id: 'cfg-uniform-seller', position: 'Uniform Seller', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'Sales & Service', khName: 'ការលក់ និងសេវាកម្ម', weight: 55, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 45, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 158, sectionId: 'sec-1', kh: 'សមត្ថភាពលក់', en: 'Sales Skills', khDesc: 'សមត្ថភាពក្នុងការលក់', desc: 'Effectiveness in selling uniforms', max: 10, displayOrder: 0, status: 'active' },
        { id: 159, sectionId: 'sec-1', kh: 'ការបម្រើអតិថិជន', en: 'Customer Service', khDesc: 'ការបម្រើអតិថិជន', desc: 'Serving customers politely', max: 10, displayOrder: 1, status: 'active' },
        { id: 160, sectionId: 'sec-1', kh: 'ការគ្រប់គ្រងស្តុក', en: 'Stock Management', khDesc: 'ការគ្រប់គ្រងស្តុកឯកសណ្ឋាន', desc: 'Managing uniform inventory', max: 10, displayOrder: 2, status: 'active' },
        { id: 161, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional enthusiasm', max: 10, displayOrder: 3, status: 'active' },
        { id: 162, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនង', desc: 'Effective communication', max: 10, displayOrder: 4, status: 'active' },
        { id: 163, sectionId: 'sec-2', kh: 'ភាពស្មោះត្រង់', en: 'Honesty', khDesc: 'ភាពស្មោះត្រង់ និងតម្លាភាព', desc: 'Honesty and transparency', max: 10, displayOrder: 5, status: 'active' }
      ]},
      { id: 'cfg-customer-service', position: 'Customer Service', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'Service Excellence', khName: 'សេវាកម្មឆ្នើម', weight: 55, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 45, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 164, sectionId: 'sec-1', kh: 'ការបម្រើអតិថិជន', en: 'Customer Service', khDesc: 'ការបម្រើអតិថិជនប្រកបដោយគុណភាព', desc: 'Delivering quality customer service', max: 10, displayOrder: 0, status: 'active' },
        { id: 165, sectionId: 'sec-1', kh: 'ការដោះស្រាយបញ្ហា', en: 'Problem Solving', khDesc: 'ការដោះស្រាយបញ្ហាអតិថិជន', desc: 'Resolving customer issues', max: 10, displayOrder: 1, status: 'active' },
        { id: 166, sectionId: 'sec-1', kh: 'សមត្ថភាពប្រាស្រ័យទាក់ទង', en: 'Interpersonal Skills', khDesc: 'សមត្ថភាពប្រាស្រ័យទាក់ទង', desc: 'Building rapport with customers', max: 10, displayOrder: 2, status: 'active' },
        { id: 167, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional enthusiasm', max: 10, displayOrder: 3, status: 'active' },
        { id: 168, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនង', desc: 'Effective communication', max: 10, displayOrder: 4, status: 'active' },
        { id: 169, sectionId: 'sec-2', kh: 'ការសហការក្រុម', en: 'Teamwork', khDesc: 'ការធ្វើការជាក្រុម', desc: 'Working well with others', max: 10, displayOrder: 5, status: 'active' }
      ]},
      { id: 'cfg-student-affairs', position: 'Student Affairs', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'Student Support', khName: 'ការគាំទ្រសិស្ស', weight: 55, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 45, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 170, sectionId: 'sec-1', kh: 'ការគាំទ្រសិស្ស', en: 'Student Support', khDesc: 'ការផ្តល់ជំនួយដល់សិស្ស', desc: 'Supporting student welfare', max: 10, displayOrder: 0, status: 'active' },
        { id: 171, sectionId: 'sec-1', kh: 'ការរៀបចំសកម្មភាព', en: 'Student Activities', khDesc: 'ការរៀបចំសកម្មភាពសិស្ស', desc: 'Organizing student activities', max: 10, displayOrder: 1, status: 'active' },
        { id: 172, sectionId: 'sec-1', kh: 'ការដោះស្រាយបញ្ហា', en: 'Issue Resolution', khDesc: 'ការដោះស្រាយបញ្ហាសិស្ស', desc: 'Resolving student issues', max: 10, displayOrder: 2, status: 'active' },
        { id: 173, sectionId: 'sec-1', kh: 'ការទំនាក់ទំនងមាតាបិតា', en: 'Parent Communication', khDesc: 'ការទំនាក់ទំនងជាមួយមាតាបិតា', desc: 'Communicating with parents', max: 10, displayOrder: 3, status: 'active' },
        { id: 174, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional enthusiasm', max: 10, displayOrder: 4, status: 'active' },
        { id: 175, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនង', desc: 'Effective communication', max: 10, displayOrder: 5, status: 'active' },
        { id: 176, sectionId: 'sec-2', kh: 'ការសហការក្រុម', en: 'Teamwork', khDesc: 'ការធ្វើការជាក្រុម', desc: 'Working well with others', max: 10, displayOrder: 6, status: 'active' }
      ]},
      { id: 'cfg-nurse', position: 'Nurse', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'Clinical Skills', khName: 'ជំនាញគ្លីនិក', weight: 55, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Professional Conduct', khName: 'ឥរិយាបទវិជ្ជាជីវៈ', weight: 45, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 177, sectionId: 'sec-1', kh: 'ជំនាញពេទ្យ', en: 'Nursing Skills', khDesc: 'ជំនាញថែទាំសុខភាព', desc: 'Healthcare and nursing skills', max: 10, displayOrder: 0, status: 'active' },
        { id: 178, sectionId: 'sec-1', kh: 'ការថែទាំសិស្ស', en: 'Student Care', khDesc: 'ការថែទាំសុខភាពសិស្ស', desc: 'Caring for student health', max: 10, displayOrder: 1, status: 'active' },
        { id: 179, sectionId: 'sec-1', kh: 'ការដោះស្រាយបន្ទាន់', en: 'Emergency Response', khDesc: 'ការដោះស្រាយស្ថានការណ៍បន្ទាន់', desc: 'Handling medical emergencies', max: 10, displayOrder: 2, status: 'active' },
        { id: 180, sectionId: 'sec-1', kh: 'អនាម័យ និងសុវត្ថិភាព', en: 'Hygiene & Safety', khDesc: 'ការរក្សាអនាម័យ និងសុវត្ថិភាព', desc: 'Maintaining hygiene standards', max: 10, displayOrder: 3, status: 'active' },
        { id: 181, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional enthusiasm', max: 10, displayOrder: 4, status: 'active' },
        { id: 182, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនងជាមួយសិស្ស', desc: 'Communicating with students', max: 10, displayOrder: 5, status: 'active' },
        { id: 183, sectionId: 'sec-2', kh: 'ភាពឯកជន', en: 'Confidentiality', khDesc: 'ការរក្សាការសម្ងាត់វេជ្ជសាស្ត្រ', desc: 'Maintaining medical confidentiality', max: 10, displayOrder: 6, status: 'active' }
      ]},
      { id: 'cfg-lab-assistant', position: 'Laboratory Assistant', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'Technical Skills', khName: 'ជំនាញបច្ចេកទេស', weight: 55, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 45, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 184, sectionId: 'sec-1', kh: 'ជំនាញបច្ចេកទេស', en: 'Technical Proficiency', khDesc: 'ជំនាញប្រើប្រាស់ឧបករណ៍', desc: 'Proficiency with lab equipment', max: 10, displayOrder: 0, status: 'active' },
        { id: 185, sectionId: 'sec-1', kh: 'សុវត្ថិភាព', en: 'Lab Safety', khDesc: 'ការគោរពតាមស្តង់ដាសុវត្ថិភាព', desc: 'Following safety protocols', max: 10, displayOrder: 1, status: 'active' },
        { id: 186, sectionId: 'sec-1', kh: 'ការរៀបចំឧបករណ៍', en: 'Equipment Preparation', khDesc: 'ការរៀបចំ និងថែទាំឧបករណ៍', desc: 'Preparing and maintaining equipment', max: 10, displayOrder: 2, status: 'active' },
        { id: 187, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional enthusiasm', max: 10, displayOrder: 3, status: 'active' },
        { id: 188, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនង', desc: 'Effective communication', max: 10, displayOrder: 4, status: 'active' },
        { id: 189, sectionId: 'sec-2', kh: 'ភាពត្រឹមត្រូវ', en: 'Accuracy', khDesc: 'ភាពត្រឹមត្រូវក្នុងការងារ', desc: 'Attention to detail', max: 10, displayOrder: 5, status: 'active' }
      ]},
      { id: 'cfg-librarian', position: 'Librarian', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'Library Management', khName: 'ការគ្រប់គ្រងបណ្ណាល័យ', weight: 55, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 45, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 190, sectionId: 'sec-1', kh: 'ការគ្រប់គ្រងសៀវភៅ', en: 'Book Management', khDesc: 'ការគ្រប់គ្រង និងរៀបចំសៀវភៅ', desc: 'Managing and organizing books', max: 10, displayOrder: 0, status: 'active' },
        { id: 191, sectionId: 'sec-1', kh: 'សេវាកម្មបណ្ណាល័យ', en: 'Library Services', khDesc: 'ការផ្តល់សេវាកម្មដល់អ្នកអាន', desc: 'Providing services to readers', max: 10, displayOrder: 1, status: 'active' },
        { id: 192, sectionId: 'sec-1', kh: 'ប្រព័ន្ធព័ត៌មាន', en: 'Information Systems', khDesc: 'ប្រើប្រាស់ប្រព័ន្ធព័ត៌មានបណ្ណាល័យ', desc: 'Using library information systems', max: 10, displayOrder: 2, status: 'active' },
        { id: 193, sectionId: 'sec-1', kh: 'ការរៀបចំឃ្លាំងសៀវភៅ', en: 'Shelf Organization', khDesc: 'ការរៀបចំ និងថែទាំឃ្លាំងសៀវភៅ', desc: 'Organizing book shelves and storage', max: 10, displayOrder: 3, status: 'active' },
        { id: 194, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional enthusiasm', max: 10, displayOrder: 4, status: 'active' },
        { id: 195, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនងជាមួយសិស្ស', desc: 'Communicating with students', max: 10, displayOrder: 5, status: 'active' },
        { id: 196, sectionId: 'sec-2', kh: 'ភាពអត់ធ្មត់', en: 'Patience', khDesc: 'ភាពអត់ធ្មត់ក្នុងការបម្រើ', desc: 'Patience in serving readers', max: 10, displayOrder: 6, status: 'active' }
      ]},
      { id: 'cfg-gep-officer', position: 'GEP Officer', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'Project Management', khName: 'ការគ្រប់គ្រងគម្រោង', weight: 55, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 45, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 197, sectionId: 'sec-1', kh: 'ការគ្រប់គ្រងគម្រោង', en: 'Project Management', khDesc: 'ការរៀបចំ និងអនុវត្តគម្រោង', desc: 'Planning and executing projects', max: 10, displayOrder: 0, status: 'active' },
        { id: 198, sectionId: 'sec-1', kh: 'ជំនាញបច្ចេកទេស', en: 'Technical Skills', khDesc: 'ជំនាញបច្ចេកទេសទាក់ទង GEP', desc: 'Technical skills related to GEP', max: 10, displayOrder: 1, status: 'active' },
        { id: 199, sectionId: 'sec-1', kh: 'ការរៀបចំរបាយការណ៍', en: 'Report Writing', khDesc: 'ការរៀបចំរបាយការណ៍', desc: 'Preparing reports and documentation', max: 10, displayOrder: 2, status: 'active' },
        { id: 200, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional enthusiasm', max: 10, displayOrder: 3, status: 'active' },
        { id: 201, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនង', desc: 'Effective communication', max: 10, displayOrder: 4, status: 'active' },
        { id: 202, sectionId: 'sec-2', kh: 'ការសហការក្រុម', en: 'Teamwork', khDesc: 'ការធ្វើការជាក្រុម', desc: 'Working well with others', max: 10, displayOrder: 5, status: 'active' }
      ]},
      { id: 'cfg-ta', position: 'Teaching Assistant (TA)', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'Teaching Support', khName: 'ការគាំទ្រការបង្រៀន', weight: 55, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 45, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 203, sectionId: 'sec-1', kh: 'ការជួយគ្រូបង្រៀន', en: 'Teacher Support', khDesc: 'ការជួយគ្រូក្នុងការបង្រៀន', desc: 'Assisting teachers in the classroom', max: 10, displayOrder: 0, status: 'active' },
        { id: 204, sectionId: 'sec-1', kh: 'ការត្រៀមសម្ភារៈ', en: 'Material Preparation', khDesc: 'ការត្រៀមសម្ភារៈបង្រៀន', desc: 'Preparing teaching materials', max: 10, displayOrder: 1, status: 'active' },
        { id: 205, sectionId: 'sec-1', kh: 'ការគ្រប់គ្រងសិស្ស', en: 'Student Management', khDesc: 'ការជួយគ្រប់គ្រងសិស្ស', desc: 'Helping manage student behavior', max: 10, displayOrder: 2, status: 'active' },
        { id: 206, sectionId: 'sec-1', kh: 'ការប្រើប្រាស់ប្រព័ន្ធបច្ចេកវិទ្យា', en: 'Technology Use', khDesc: 'ជំនាញប្រើប្រាស់ប្រព័ន្ធបច្ចេកវិទ្យា', desc: 'Using educational technology', max: 10, displayOrder: 3, status: 'active' },
        { id: 207, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional enthusiasm', max: 10, displayOrder: 4, status: 'active' },
        { id: 208, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនងជាមួយគ្រូ និងសិស្ស', desc: 'Communicating with teachers and students', max: 10, displayOrder: 5, status: 'active' },
        { id: 209, sectionId: 'sec-2', kh: 'ការសហការ', en: 'Collaboration', khDesc: 'ការសហការជាមួយគ្រូបង្រៀន', desc: 'Collaborating with teaching staff', max: 10, displayOrder: 6, status: 'active' }
      ]},
      { id: 'cfg-nanny', position: 'Nanny', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'Child Care', khName: 'ការថែទាំកុមារ', weight: 55, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 45, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 210, sectionId: 'sec-1', kh: 'ការថែទាំកុមារ', en: 'Child Care', khDesc: 'ការថែទាំ និងយកចិត្តទុកដាក់កុមារ', desc: 'Caring for and attending to children', max: 10, displayOrder: 0, status: 'active' },
        { id: 211, sectionId: 'sec-1', kh: 'សុវត្ថិភាពកុមារ', en: 'Child Safety', khDesc: 'ការរក្សាសុវត្ថិភាពកុមារ', desc: 'Ensuring child safety', max: 10, displayOrder: 1, status: 'active' },
        { id: 212, sectionId: 'sec-1', kh: 'អនាម័យ', en: 'Hygiene', khDesc: 'ការរក្សាអនាម័យកុមារ', desc: 'Maintaining child hygiene', max: 10, displayOrder: 2, status: 'active' },
        { id: 213, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional enthusiasm', max: 10, displayOrder: 3, status: 'active' },
        { id: 214, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនងជាមួយកុមារ និងមាតាបិតា', desc: 'Communicating with children and parents', max: 10, displayOrder: 4, status: 'active' },
        { id: 215, sectionId: 'sec-2', kh: 'ភាពអត់ធ្មត់', en: 'Patience', khDesc: 'ភាពអត់ធ្មត់ក្នុងការថែទាំ', desc: 'Patience in child care', max: 10, displayOrder: 5, status: 'active' }
      ]},
      { id: 'cfg-discipline-officer', position: 'Discipline Officer', weightingScheme: 'campus_60_40', sections: [
        { id: 'sec-1', name: 'Discipline Management', khName: 'ការគ្រប់គ្រងវិន័យ', weight: 55, displayOrder: 0, status: 'active' },
        { id: 'sec-2', name: 'Core Values', khName: 'តម្លៃ និងឥរិយាបទ', weight: 45, displayOrder: 1, status: 'active' }
      ], criteria: [
        { id: 216, sectionId: 'sec-1', kh: 'ការគ្រប់គ្រងវិន័យសិស្ស', en: 'Student Discipline', khDesc: 'ការគ្រប់គ្រង និងអនុវត្តវិន័យសិស្ស', desc: 'Managing and enforcing student discipline', max: 10, displayOrder: 0, status: 'active' },
        { id: 217, sectionId: 'sec-1', kh: 'ការដោះស្រាយទំនាស់', en: 'Conflict Resolution', khDesc: 'ការដោះស្រាយទំនាស់រវាងសិស្ស', desc: 'Resolving conflicts between students', max: 10, displayOrder: 1, status: 'active' },
        { id: 218, sectionId: 'sec-1', kh: 'ការតាមដានសិស្ស', en: 'Student Monitoring', khDesc: 'ការតាមដានឥរិយាបទសិស្ស', desc: 'Monitoring student behavior', max: 10, displayOrder: 2, status: 'active' },
        { id: 219, sectionId: 'sec-1', kh: 'ការរៀបចំរបាយការណ៍', en: 'Report Writing', khDesc: 'ការរៀបចំរបាយការណ៍វិន័យ', desc: 'Preparing discipline reports', max: 10, displayOrder: 3, status: 'active' },
        { id: 220, sectionId: 'sec-2', kh: 'អាកប្បកិរិយា', en: 'Attitude', khDesc: 'ចំណាប់អារម្មណ៍', desc: 'Professional enthusiasm', max: 10, displayOrder: 4, status: 'active' },
        { id: 221, sectionId: 'sec-2', kh: 'ការទំនាក់ទំនង', en: 'Communication', khDesc: 'ការទំនាក់ទំនងជាមួយសិស្ស និងមាតាបិតា', desc: 'Communicating with students and parents', max: 10, displayOrder: 5, status: 'active' },
        { id: 222, sectionId: 'sec-2', kh: 'ភាពយុត្តិ�ម៌', en: 'Fairness', khDesc: 'ភាពយុត្តិ�ម៌ក្នុងការអនុវត្តវិន័យ', desc: 'Fairness in enforcing discipline', max: 10, displayOrder: 6, status: 'active' }
      ]}
    ])
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
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json');
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
