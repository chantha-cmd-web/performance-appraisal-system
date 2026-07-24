var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_ws = require("ws");
var import_http = __toESM(require("http"), 1);

// db.ts
var import_pg = __toESM(require("pg"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var { Pool } = import_pg.default;
var pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/performance_system",
  max: 20,
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 5e3
});
pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});
var SCHEMA_SQL = `
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
var SEED_SETTINGS_SQL = `
INSERT INTO "app_settings" ("key", "value")
VALUES ('evaluation_config', $1)
ON CONFLICT ("key") DO NOTHING;
`;
var SEED_USERS_SQL = `
INSERT INTO "users" ("id", "name", "password", "role")
VALUES ($1, $2, $3, $4)
ON CONFLICT ("id") DO NOTHING;
`;
var DEFAULT_EVAL_CONFIG = JSON.stringify({
  types: [
    { id: "management", label: "Management / \u1780\u17B6\u179A\u1782\u17D2\u179A\u1794\u17CB\u1782\u17D2\u179A\u1784" },
    { id: "teacher", label: "Teacher / \u1782\u17D2\u179A\u17BC\u1794\u1784\u17D2\u179A\u17C0\u1793" },
    { id: "operations", label: "Operations / \u1794\u17D2\u179A\u178F\u17B7\u1794\u178F\u17D2\u178F\u17B7\u1780\u17B6\u179A" }
  ],
  weightingSchemes: [
    { id: "campus_60_40", label: "Direct Supervisor 60% (campus) / Supporter 40% (central)" },
    { id: "campus_50_50", label: "Direct Supervisor 50% (campus) / Supporter 50% (central)" },
    { id: "campus_100", label: "Direct Supervisor (campus) 100%" },
    { id: "central_100", label: "Direct Supervisor 100% (central)" },
    { id: "management_100", label: "Management 100%" },
    { id: "asp_100", label: "ASP 100%" }
  ],
  sections: {
    management: [
      { id: "mgmt_perf", name: "Work Performance", khName: "\u179F\u1798\u17B7\u1791\u17D2\u1792\u1795\u179B\u1780\u17B6\u179A\u1784\u17B6\u179A" },
      { id: "mgmt_lead", name: "Leadership", khName: "\u1797\u17B6\u1796\u1787\u17B6\u17A2\u17D2\u1793\u1780\u178A\u17B9\u1780\u1793\u17B6\u17C6" },
      { id: "mgmt_prof", name: "Professional Development", khName: "\u1780\u17B6\u179A\u17A2\u1797\u17B7\u179C\u178C\u17D2\u178D\u1793\u17CD\u179C\u17B7\u1787\u17D2\u1787\u17B6\u1787\u17B8\u179C\u17C8" }
    ],
    teacher: [
      { id: "teach_skill", name: "Teaching Skills", khName: "\u1787\u17C6\u1793\u17B6\u1789\u1794\u1784\u17D2\u179A\u17C0\u1793" },
      { id: "teach_mgmt", name: "Classroom Management", khName: "\u1780\u17B6\u179A\u1782\u17D2\u179A\u1794\u17CB\u1782\u17D2\u179A\u1784\u1790\u17D2\u1793\u17B6\u1780\u17CB\u179A\u17C0\u1793" },
      { id: "teach_prof", name: "Professional Conduct", khName: "\u179C\u17B7\u1787\u17D2\u1787\u17B6\u1787\u17B8\u179C\u17C8" }
    ],
    operations: [
      { id: "ops_quality", name: "Service Quality", khName: "\u1782\u17BB\u178E\u1797\u17B6\u1796\u179F\u17C1\u179C\u17B6\u1780\u1798\u17D2\u1798" },
      { id: "ops_eff", name: "Work Efficiency", khName: "\u1794\u17D2\u179A\u179F\u17B7\u1791\u17D2\u1792\u1797\u17B6\u1796\u1780\u17B6\u179A\u1784\u17B6\u179A" },
      { id: "ops_prof", name: "Professional Conduct", khName: "\u179C\u17B7\u1787\u17D2\u1787\u17B6\u1787\u17B8\u179C\u17C8" }
    ]
  },
  criteriaSets: {
    management: [
      { id: 1, kh: "\u17A2\u17B6\u1780\u1794\u17D2\u1794\u1780\u17B7\u179A\u17B7\u1799\u17B6", khDesc: "\u1785\u17C6\u178E\u17B6\u1794\u17CB\u17A2\u17B6\u179A\u1798\u17D2\u1798\u178E\u17CD \u1793\u17B7\u1784\u1797\u17B6\u1796\u179F\u17B6\u1791\u179A", en: "Attitude", desc: "Enthusiasm and dedication", max: 10, sectionId: "mgmt_perf" },
      { id: 2, kh: "\u1785\u17C6\u178E\u17C1\u17C7\u178A\u17B9\u1784\u1780\u17B6\u179A\u1784\u17B6\u179A", khDesc: "\u1780\u17B6\u179A\u1799\u179B\u17CB\u178A\u17B9\u1784\u17A2\u17C6\u1796\u17B8\u1780\u17B6\u179A\u1784\u17B6\u179A", en: "Job Knowledge", desc: "Understanding of work and skills", max: 10, sectionId: "mgmt_perf" },
      { id: 3, kh: "\u1782\u17C6\u1793\u17B7\u178F\u1795\u17D2\u178F\u17BD\u1785\u1795\u17D2\u178F\u17BE\u1798", khDesc: "\u1780\u17B6\u179A\u17A2\u1797\u17B7\u179C\u178C\u17D2\u178D\u1793\u17CD \u1793\u17B7\u1784\u178A\u17C4\u17C7\u179F\u17D2\u179A\u17B6\u1799\u1794\u1789\u17D2\u17A0\u17B6", en: "Initiative", desc: "Proactive thinking and development", max: 10, sectionId: "mgmt_perf" },
      { id: 4, kh: "\u1780\u17B6\u179A\u179C\u17B7\u1793\u17B7\u1785\u17D2\u1786\u17D0\u1799 \u1793\u17B7\u1784\u1780\u17B6\u179A\u1799\u179B\u17CB\u178A\u17B9\u1784", khDesc: "\u1780\u17B6\u179A\u179F\u1798\u17D2\u179A\u17C1\u1785\u1785\u17B7\u178F\u17D2\u178F", en: "Judgment and Awareness", desc: "Problem-solving and decision making", max: 10, sectionId: "mgmt_perf" },
      { id: 5, kh: "\u1780\u17B6\u179A\u17A2\u1797\u17B7\u179C\u178C\u17D2\u178D\u1793\u17CD\u1794\u17BB\u1782\u17D2\u1782\u179B\u17B7\u1780", khDesc: "\u1780\u17B6\u179A\u1780\u179F\u17B6\u1784\u179F\u1798\u178F\u17D2\u1790\u1797\u17B6\u1796", en: "Employee Development", desc: "Effectiveness of capacity building", max: 10, sectionId: "mgmt_lead" },
      { id: 6, kh: "\u1780\u17B6\u179A\u1785\u17BC\u179B\u179A\u17BD\u1798\u1780\u17D2\u1793\u17BB\u1784\u1780\u17B6\u179A\u1782\u17D2\u179A\u1794\u17CB\u1782\u17D2\u179A\u1784\u17CB\u1795\u17D2\u1793\u17C2\u1780", khDesc: "\u1780\u17B6\u179A\u17A2\u1793\u17BB\u179B\u17C4\u1798\u178F\u17B6\u1798\u1791\u17B7\u179F\u178A\u17C5", en: "Participation in Management", desc: "Adherence to work directives", max: 10, sectionId: "mgmt_lead" },
      { id: 7, kh: "\u179C\u17B7\u1793\u17D0\u1799\u1794\u17BB\u1782\u17D2\u1782\u179B\u17B7\u1780", khDesc: "\u1780\u17B6\u179A\u1782\u17C4\u179A\u1796\u179C\u17B7\u1793\u17D0\u1799", en: "Employee Discipline", desc: "Adherence to discipline", max: 10, sectionId: "mgmt_lead" },
      { id: 8, kh: "\u1780\u17B6\u179A\u1791\u17C6\u1793\u17B6\u1780\u17CB\u1791\u17C6\u1793\u1784", khDesc: "\u1780\u17B6\u179A\u1791\u17C6\u1793\u17B6\u1780\u17CB\u1791\u17C6\u1793\u1784\u1787\u17B6\u1798\u17BD\u1799\u1798\u17B7\u178F\u17D2\u178F\u179A\u17BD\u1798\u1780\u17B6\u179A\u1784\u17B6\u179A", en: "Communication", desc: "Interactions with colleagues", max: 10, sectionId: "mgmt_lead" },
      { id: 9, kh: "\u1797\u17B6\u1796\u1787\u17B6\u17A2\u17D2\u1793\u1780\u178A\u17B9\u1780\u1793\u17B6\u17C6", khDesc: "\u1780\u17B6\u179A\u1780\u179F\u17B6\u1784\u1780\u17D2\u179A\u17BB\u1798", en: "Leadership", desc: "Leadership qualities and team building", max: 10, sectionId: "mgmt_lead" },
      { id: 10, kh: "\u1780\u17B6\u179A\u1794\u17D2\u179A\u17BE\u1794\u17D2\u179A\u17B6\u179F\u17CB\u1794\u17D2\u179A\u1796\u17D0\u1793\u17D2\u1792\u1794\u1785\u17D2\u1785\u17C1\u1780\u179C\u17B7\u1791\u17D2\u1799\u17B6", khDesc: "\u1787\u17C6\u1793\u17B6\u1789\u1794\u1785\u17D2\u1785\u17C1\u1780\u179C\u17B7\u1791\u17D2\u1799\u17B6", en: "Technology Use", desc: "Proficiency in office technology", max: 10, sectionId: "mgmt_prof" }
    ],
    teacher: [
      { id: 11, kh: "\u1780\u17B6\u179A\u179A\u17C0\u1794\u1785\u17C6\u1798\u17C1\u179A\u17C0\u1793", khDesc: "\u1780\u17B6\u179A\u179A\u17C0\u1794\u1785\u17C6\u1795\u17C2\u1793\u1780\u17B6\u179A\u1794\u1784\u17D2\u179A\u17C0\u1793", en: "Lesson Preparation", desc: "Planning and preparing lessons", max: 10, sectionId: "teach_skill" },
      { id: 12, kh: "\u179C\u17B7\u1792\u17B8\u179F\u17B6\u179F\u17D2\u178F\u17D2\u179A\u1794\u1784\u17D2\u179A\u17C0\u1793", khDesc: "\u1794\u17D2\u179A\u179F\u17B7\u1791\u17D2\u1792\u1797\u17B6\u1796\u1793\u17C3\u1780\u17B6\u179A\u1794\u1784\u17D2\u179A\u17C0\u1793", en: "Teaching Methodology", desc: "Effective teaching methods", max: 10, sectionId: "teach_skill" },
      { id: 13, kh: "\u1780\u17B6\u179A\u1782\u17D2\u179A\u1794\u17CB\u1782\u17D2\u179A\u1784\u1790\u17D2\u1793\u17B6\u1780\u17CB\u179A\u17C0\u1793", khDesc: "\u1780\u17B6\u179A\u1782\u17D2\u179A\u1794\u17CB\u1782\u17D2\u179A\u1784\u179F\u17B7\u179F\u17D2\u179F", en: "Classroom Management", desc: "Managing student behavior", max: 10, sectionId: "teach_skill" },
      { id: 14, kh: "\u1780\u17B6\u179A\u179C\u17B6\u1799\u178F\u1798\u17D2\u179B\u17C3\u179F\u17B7\u179F\u17D2\u179F", khDesc: "\u1780\u17B6\u179A\u178F\u17B6\u1798\u178A\u17B6\u1793\u1780\u17B6\u179A\u179F\u17B7\u1780\u17D2\u179F\u17B6", en: "Student Assessment", desc: "Evaluating student progress", max: 10, sectionId: "teach_mgmt" },
      { id: 15, kh: "\u1791\u17C6\u1793\u17B6\u1780\u17CB\u1791\u17C6\u1793\u1784\u1787\u17B6\u1798\u17BD\u1799\u1798\u17B6\u178F\u17B6\u1794\u17B7\u178F\u17B6", khDesc: "\u1780\u17B6\u179A\u1794\u17D2\u179A\u17B6\u179F\u17D2\u179A\u17D0\u1799\u1791\u17B6\u1780\u17CB\u1791\u1784", en: "Parent Communication", desc: "Engaging with parents", max: 10, sectionId: "teach_mgmt" },
      { id: 16, kh: "\u179C\u17B7\u1793\u17D0\u1799\u1793\u17B7\u1784\u17A2\u17B6\u1780\u1794\u17D2\u1794\u1780\u17B7\u179A\u17B7\u1799\u17B6", khDesc: "\u1780\u17D2\u179A\u1798\u179F\u17B8\u179B\u1792\u1798\u17CC\u179C\u17B7\u1787\u17D2\u1787\u17B6\u1787\u17B8\u179C\u17C8", en: "Discipline & Attitude", desc: "Professional conduct", max: 10, sectionId: "teach_mgmt" },
      { id: 17, kh: "\u1780\u17B6\u179A\u1794\u17D2\u179A\u17BE\u1794\u17D2\u179A\u17B6\u179F\u17CB\u179F\u1798\u17D2\u1797\u17B6\u179A\u17C8", khDesc: "\u1780\u17B6\u179A\u1794\u17D2\u179A\u17BE\u1794\u17D2\u179A\u17B6\u179F\u17CB\u179F\u1798\u17D2\u1797\u17B6\u179A\u17C8\u17A7\u1794\u1791\u17D2\u1791\u17C1\u179F", en: "Use of Materials", desc: "Effective use of teaching aids", max: 10, sectionId: "teach_prof" },
      { id: 18, kh: "\u1780\u17B6\u179A\u1785\u17BC\u179B\u179A\u17BD\u1798\u179F\u1780\u1798\u17D2\u1798\u1797\u17B6\u1796\u179F\u17B6\u179B\u17B6", khDesc: "\u1780\u17B6\u179A\u1785\u17BC\u179B\u179A\u17BD\u1798\u1780\u1798\u17D2\u1798\u179C\u17B7\u1792\u17B8", en: "School Activity Participation", desc: "Involvement in school events", max: 10, sectionId: "teach_prof" },
      { id: 19, kh: "\u1780\u17B6\u179A\u17A2\u1797\u17B7\u179C\u178C\u17D2\u178D\u1793\u17CD\u1781\u17D2\u179B\u17BD\u1793", khDesc: "\u1780\u17B6\u179A\u179F\u17B7\u1780\u17D2\u179F\u17B6\u1794\u1793\u17D2\u178F", en: "Self-Development", desc: "Continuous learning", max: 10, sectionId: "teach_prof" },
      { id: 20, kh: "\u1780\u17B6\u179A\u179F\u17A0\u1780\u17B6\u179A\u1787\u17B6\u1798\u17BD\u1799\u1798\u17B7\u178F\u17D2\u178F\u179A\u17BD\u1798\u1780\u17B6\u179A\u1784\u17B6\u179A", khDesc: "\u1780\u17B6\u179A\u1792\u17D2\u179C\u17BE\u1780\u17B6\u179A\u1784\u17B6\u179A\u1787\u17B6\u1780\u17D2\u179A\u17BB\u1798", en: "Collaboration", desc: "Teamwork with peers", max: 10, sectionId: "teach_prof" }
    ],
    operations: [
      { id: 21, kh: "\u1782\u17BB\u178E\u1797\u17B6\u1796\u179F\u17C1\u179C\u17B6\u1780\u1798\u17D2\u1798", khDesc: "\u1780\u17B6\u179A\u1795\u17D2\u178F\u179B\u17CB\u179F\u17C1\u179C\u17B6\u1780\u1798\u17D2\u1798", en: "Service Quality", desc: "Delivering high-quality service", max: 10, sectionId: "ops_quality" },
      { id: 22, kh: "\u1780\u17B6\u179A\u17A2\u1793\u17BB\u179B\u17C4\u1798\u178F\u17B6\u1798\u1793\u17B8\u178F\u17B7\u179C\u17B7\u1792\u17B8", khDesc: "\u1780\u17B6\u179A\u1782\u17C4\u179A\u1796\u178F\u17B6\u1798\u1782\u17C4\u179B\u1780\u17B6\u179A\u178E\u17CD", en: "Compliance", desc: "Following rules and protocols", max: 10, sectionId: "ops_quality" },
      { id: 23, kh: "\u1794\u17D2\u179A\u179F\u17B7\u1791\u17D2\u1792\u1797\u17B6\u1796\u1780\u17B6\u179A\u1784\u17B6\u179A", khDesc: "\u179B\u17D2\u1794\u17BF\u1793\u1793\u17B7\u1784\u1797\u17B6\u1796\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C", en: "Operational Efficiency", desc: "Speed and accuracy of work", max: 10, sectionId: "ops_eff" },
      { id: 24, kh: "\u1780\u17B6\u179A\u178A\u17C4\u17C7\u179F\u17D2\u179A\u17B6\u1799\u1794\u1789\u17D2\u17A0\u17B6", khDesc: "\u1780\u17B6\u179A\u178A\u17C4\u17C7\u179F\u17D2\u179A\u17B6\u1799\u1794\u1789\u17D2\u17A0\u17B6\u1787\u17B6\u1780\u17CB\u179F\u17D2\u178F\u17C2\u1784", en: "Problem Solving", desc: "Handling operational issues", max: 10, sectionId: "ops_eff" },
      { id: 25, kh: "\u179F\u17BB\u179C\u178F\u17D2\u1790\u17B7\u1797\u17B6\u1796\u1793\u17B7\u1784\u17A2\u1793\u17B6\u1798\u17D0\u1799", khDesc: "\u1780\u17B6\u179A\u179A\u1780\u17D2\u179F\u17B6\u1794\u179A\u17B7\u179F\u17D2\u1790\u17B6\u1793\u179B\u17D2\u17A2", en: "Safety & Hygiene", desc: "Maintaining a safe environment", max: 10, sectionId: "ops_eff" },
      { id: 26, kh: "\u1780\u17B6\u179A\u1790\u17C2\u1791\u17B6\u17C6\u17A7\u1794\u1780\u179A\u178E\u17CD", khDesc: "\u1780\u17B6\u179A\u1790\u17C2\u179A\u1780\u17D2\u179F\u17B6\u179F\u1798\u17D2\u1797\u17B6\u179A\u17C8", en: "Equipment Maintenance", desc: "Proper care of tools and equipment", max: 10, sectionId: "ops_eff" },
      { id: 27, kh: "\u1780\u17B6\u179A\u1792\u17D2\u179C\u17BE\u1780\u17B6\u179A\u1787\u17B6\u1780\u17D2\u179A\u17BB\u1798", khDesc: "\u1780\u17B6\u179A\u179F\u17A0\u1780\u17B6\u179A", en: "Teamwork", desc: "Working well with others", max: 10, sectionId: "ops_prof" },
      { id: 28, kh: "\u1797\u17B6\u1796\u1787\u17BF\u1787\u17B6\u1780\u17CB\u1793\u17B7\u1784\u1780\u17B6\u179A\u1791\u1791\u17BD\u179B\u1781\u17BB\u179F\u178F\u17D2\u179A\u17BC\u179C", khDesc: "\u1780\u17B6\u179A\u1791\u1791\u17BD\u179B\u1781\u17BB\u179F\u178F\u17D2\u179A\u17BC\u179C", en: "Reliability & Responsibility", desc: "Dependability in duties", max: 10, sectionId: "ops_prof" },
      { id: 29, kh: "\u1780\u17B6\u179A\u1791\u17C6\u1793\u17B6\u1780\u17CB\u1791\u17C6\u1793\u1784\u17A2\u178F\u17B7\u1790\u17B7\u1787\u1793", khDesc: "\u1780\u17B6\u179A\u1794\u1798\u17D2\u179A\u17BE\u17A2\u178F\u17B7\u1790\u17B7\u1787\u1793", en: "Customer Communication", desc: "Interacting with clients effectively", max: 10, sectionId: "ops_prof" },
      { id: 30, kh: "\u1780\u17B6\u179A\u1782\u17D2\u179A\u1794\u17CB\u1782\u17D2\u179A\u1784\u1796\u17C1\u179B\u179C\u17C1\u179B\u17B6", khDesc: "\u1780\u17B6\u179A\u1794\u17C6\u1796\u17C1\u1789\u1780\u17B6\u179A\u1784\u17B6\u179A\u1791\u17B6\u1793\u17CB\u1796\u17C1\u179B", en: "Time Management", desc: "Completing tasks on time", max: 10, sectionId: "ops_prof" }
    ]
  }
});
async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(SCHEMA_SQL);
    await client.query(SEED_USERS_SQL, ["superadmin", "Super Administrator", import_bcryptjs.default.hashSync("super@2026", 10), "superadmin"]);
    await client.query(SEED_USERS_SQL, ["admin", "Administrator", import_bcryptjs.default.hashSync("admin@123", 10), "admin"]);
    await client.query(SEED_SETTINGS_SQL, [DEFAULT_EVAL_CONFIG]);
    await client.query("COMMIT");
    console.log("PostgreSQL migration and seeding completed successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PostgreSQL migration failed:", err);
    throw err;
  } finally {
    client.release();
  }
}
function transaction(fn) {
  return pool.connect().then(async (client) => {
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });
}

// server.ts
var PORT = parseInt(process.env.PORT || "3000", 10);
var JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-2026";
var wsClients = /* @__PURE__ */ new Set();
function broadcast(event, data, excludeUserId) {
  const message = JSON.stringify({ event, data, ts: Date.now() });
  wsClients.forEach((ws) => {
    if (ws.readyState === import_ws.WebSocket.OPEN && (!excludeUserId || ws.userId !== excludeUserId)) {
      ws.send(message);
    }
  });
}
function setupWebSocket() {
  const wss = new import_ws.WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    if (!token) {
      ws.close(1008, "Authentication required");
      return;
    }
    try {
      const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
      ws.userId = decoded.id;
      ws.userRole = decoded.role;
      ws.userName = decoded.name;
      ws.isAlive = true;
      wsClients.add(ws);
      ws.send(JSON.stringify({ event: "connected", data: { userId: decoded.id } }));
      ws.on("pong", () => {
        ws.isAlive = true;
      });
      ws.on("close", () => {
        wsClients.delete(ws);
      });
      ws.on("error", () => {
        wsClients.delete(ws);
      });
    } catch {
      ws.close(1008, "Invalid token");
    }
  });
  const interval = setInterval(() => {
    wsClients.forEach((ws) => {
      if (!ws.isAlive) {
        wsClients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 3e4);
  wss.on("close", () => clearInterval(interval));
}
var authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);
  import_jsonwebtoken.default.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
var requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "superadmin") return res.status(403).json({ error: "Access denied. Super Admin only." });
  next();
};
var isRelatedToEvaluation = (user, ev) => {
  return ev.createdBy === user.id || ev.appraiser === user.id || ev.supporter === user.id || ev.employeeId === user.id;
};
var logAudit = async (userId, userName, action, details) => {
  try {
    await pool.query('INSERT INTO "audit_logs" ("userId", "userName", "action", "details") VALUES ($1, $2, $3, $4)', [userId, userName, action, details]);
  } catch (error) {
    console.error("Error logging audit:", error);
  }
};
var app = (0, import_express.default)();
app.use(import_express.default.json());
var server = import_http.default.createServer(app);
app.post("/api/auth/login", async (req, res) => {
  try {
    const { userId, password } = req.body;
    const result = await pool.query('SELECT * FROM "users" WHERE "id" = $1', [userId]);
    const user = result.rows[0];
    if (!user || !import_bcryptjs2.default.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid User ID or Password" });
    }
    const token = import_jsonwebtoken.default.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "8h" });
    await logAudit(user.id, user.name, "login", `User logged in from ${req.ip || "unknown"}`);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});
app.get("/api/users", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT "id", "name", "role" FROM "users"');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/users", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id, name, role, password } = req.body;
    const existing = await pool.query('SELECT "id" FROM "users" WHERE "id" = $1', [id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "User ID already exists" });
    }
    const hash = import_bcryptjs2.default.hashSync(password, 10);
    await pool.query('INSERT INTO "users" ("id", "name", "password", "role") VALUES ($1, $2, $3, $4)', [id, name, hash, role]);
    await logAudit(req.user.id, req.user.name, "create_user", `Created user ${name} (${id})`);
    broadcast("users:updated", { action: "create", userId: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put("/api/users/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, password } = req.body;
    if (password) {
      const hash = import_bcryptjs2.default.hashSync(password, 10);
      await pool.query('UPDATE "users" SET "name" = $1, "role" = $2, "password" = $3 WHERE "id" = $4', [name, role, hash, id]);
    } else {
      await pool.query('UPDATE "users" SET "name" = $1, "role" = $2 WHERE "id" = $3', [name, role, id]);
    }
    await logAudit(req.user.id, req.user.name, "update_user", `Updated user ${name} (${id})`);
    broadcast("users:updated", { action: "update", userId: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/users/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });
    if (id === "superadmin") return res.status(400).json({ error: "Cannot delete the default superadmin" });
    await pool.query('DELETE FROM "users" WHERE "id" = $1', [id]);
    await logAudit(req.user.id, req.user.name, "delete_user", `Deleted user (${id})`);
    broadcast("users:updated", { action: "delete", userId: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/settings/:key", authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query('SELECT "value" FROM "app_settings" WHERE "key" = $1', [key]);
    if (result.rows.length > 0) {
      try {
        res.json(JSON.parse(result.rows[0].value));
      } catch {
        res.json(result.rows[0].value);
      }
    } else {
      res.json(key === "evaluation_config" ? null : key === "position_form_configs" ? [] : null);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/settings/:key", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const data = req.body;
    await pool.query(
      'INSERT INTO "app_settings" ("key", "value") VALUES ($1, $2) ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value"',
      [key, JSON.stringify(data)]
    );
    await logAudit(req.user.id, req.user.name, "update_settings", `Updated ${key}`);
    broadcast("settings:updated", { key });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/notifications", authenticateToken, async (req, res) => {
  try {
    const notifications = [];
    const userId = req.user.id;
    const myEvals = await pool.query(
      `SELECT COUNT(*)::int as count FROM "evaluations" WHERE "employeeId" = $1 AND "status" IN ('Draft', 'Self Evaluation Pending')`,
      [userId]
    );
    if (myEvals.rows[0].count > 0) {
      notifications.push({ id: "self-eval", message: `You have ${myEvals.rows[0].count} self-evaluation(s) to complete.`, type: "warning", link: "/dashboard" });
    }
    const superEvals = await pool.query(
      `SELECT COUNT(*)::int as count FROM "evaluations" WHERE "appraiser" = $1 AND "status" = 'Waiting for Supervisor'`,
      [userId]
    );
    if (superEvals.rows[0].count > 0) {
      notifications.push({ id: "super-eval", message: `You have ${superEvals.rows[0].count} evaluation(s) waiting for your supervisor review.`, type: "info", link: "/dashboard" });
    }
    const supporterEvals = await pool.query(
      `SELECT COUNT(*)::int as count FROM "evaluations" WHERE "supporter" = $1 AND "status" = 'Waiting for Supporter'`,
      [userId]
    );
    if (supporterEvals.rows[0].count > 0) {
      notifications.push({ id: "supporter-eval", message: `You have ${supporterEvals.rows[0].count} evaluation(s) waiting for your supporter review.`, type: "info", link: "/dashboard" });
    }
    if (req.user.role === "superadmin") {
      const allPending = await pool.query(`SELECT COUNT(*)::int as count FROM "evaluations" WHERE "status" NOT IN ('Completed', 'Approved')`);
      if (allPending.rows[0].count > 0) {
        notifications.push({ id: "admin-pending", message: `There are ${allPending.rows[0].count} evaluation(s) in progress across the system.`, type: "default", link: "/dashboard" });
      }
    }
    const storedNotifs = await pool.query('SELECT * FROM "notifications" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 50', [userId]);
    for (const n of storedNotifs.rows) {
      notifications.push(n);
    }
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/notifications", authenticateToken, async (req, res) => {
  try {
    const { id, userId, type, title, message, khMessage, link, evaluationId } = req.body;
    const notifId = id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await pool.query(
      'INSERT INTO "notifications" ("id", "userId", "type", "title", "message", "khMessage", "link", "evaluationId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [notifId, userId, type || "info", title || "", message, khMessage || "", link || "", evaluationId || null]
    );
    broadcast("notifications:updated", { userId });
    res.json({ success: true, id: notifId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put("/api/notifications", authenticateToken, async (req, res) => {
  try {
    const { id, read, markAllRead, userId } = req.body;
    if (id && read) {
      await pool.query('UPDATE "notifications" SET "read" = TRUE WHERE "id" = $1', [id]);
    }
    if (markAllRead && userId) {
      await pool.query('UPDATE "notifications" SET "read" = TRUE WHERE "userId" = $1', [userId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/notifications/:id", authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM "notifications" WHERE "id" = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/data/export", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const [usersRes, evalsRes, scoresRes, settingsRes] = await Promise.all([
      pool.query('SELECT "id", "name", "role" FROM "users"'),
      pool.query('SELECT * FROM "evaluations"'),
      pool.query('SELECT * FROM "criteria_scores"'),
      pool.query('SELECT * FROM "app_settings"')
    ]);
    await logAudit(req.user.id, req.user.name, "export_data", "Exported full system backup");
    res.json({ users: usersRes.rows, evaluations: evalsRes.rows, criteriaScores: scoresRes.rows, settings: settingsRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/data/import", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { users, evaluations, criteriaScores, settings } = req.body;
    await transaction(async (client) => {
      if (evaluations && Array.isArray(evaluations)) {
        for (const e of evaluations) {
          await client.query(
            `INSERT INTO "evaluations" ("id","employeeId","employeeName","campus","position","appraiser","reviewDate","weightScheme","evaluationType","totalSelf","totalSuper","overallScore","createdBy","createdByName","createdAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
             ON CONFLICT ("id") DO UPDATE SET "employeeId"=EXCLUDED."employeeId","employeeName"=EXCLUDED."employeeName","campus"=EXCLUDED."campus","position"=EXCLUDED."position","appraiser"=EXCLUDED."appraiser","reviewDate"=EXCLUDED."reviewDate","weightScheme"=EXCLUDED."weightScheme","evaluationType"=EXCLUDED."evaluationType","totalSelf"=EXCLUDED."totalSelf","totalSuper"=EXCLUDED."totalSuper","overallScore"=EXCLUDED."overallScore","createdBy"=EXCLUDED."createdBy","createdByName"=EXCLUDED."createdByName","createdAt"=EXCLUDED."createdAt"`,
            [e.id, e.employeeId, e.employeeName, e.campus, e.position, e.appraiser, e.reviewDate, e.weightScheme, e.evaluationType, e.totalSelf, e.totalSuper, e.overallScore, e.createdBy, e.createdByName, e.createdAt]
          );
        }
      }
      if (criteriaScores && Array.isArray(criteriaScores)) {
        for (const c of criteriaScores) {
          await client.query(
            `INSERT INTO "criteria_scores" ("id","evaluationId","criteriaId","selfScore","superScore","supporterScore","managementScore","aspScore")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT ("id") DO UPDATE SET "evaluationId"=EXCLUDED."evaluationId","criteriaId"=EXCLUDED."criteriaId","selfScore"=EXCLUDED."selfScore","superScore"=EXCLUDED."superScore","supporterScore"=EXCLUDED."supporterScore","managementScore"=EXCLUDED."managementScore","aspScore"=EXCLUDED."aspScore"`,
            [c.id, c.evaluationId, c.criteriaId, c.selfScore, c.superScore, c.supporterScore, c.managementScore, c.aspScore]
          );
        }
      }
      if (settings && Array.isArray(settings)) {
        for (const s of settings) {
          await client.query(
            'INSERT INTO "app_settings" ("key","value") VALUES ($1,$2) ON CONFLICT ("key") DO UPDATE SET "value"=EXCLUDED."value"',
            [s.key, s.value]
          );
        }
      }
    });
    await logAudit(req.user.id, req.user.name, "import_data", "Imported data from backup");
    broadcast("data:imported", {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/data/reset/:type", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    if (!["evaluations", "users", "all"].includes(type)) {
      return res.status(400).json({ error: "Invalid reset type" });
    }
    await transaction(async (client) => {
      if (type === "evaluations") {
        await client.query('DELETE FROM "criteria_scores"');
        await client.query('DELETE FROM "peer_feedback"');
        await client.query('DELETE FROM "evaluations"');
      } else if (type === "users") {
        await client.query(`DELETE FROM "users" WHERE "id" != 'superadmin'`);
      } else if (type === "all") {
        await client.query('DELETE FROM "criteria_scores"');
        await client.query('DELETE FROM "peer_feedback"');
        await client.query('DELETE FROM "evaluations"');
        await client.query(`DELETE FROM "users" WHERE "id" != 'superadmin'`);
        await client.query('DELETE FROM "app_settings"');
      }
    });
    await logAudit(req.user.id, req.user.name, "reset_data", `Reset data: ${type}`);
    broadcast("data:reset", { type });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/evaluations", authenticateToken, async (req, res) => {
  try {
    let result;
    if (req.user?.role === "superadmin") {
      result = await pool.query('SELECT * FROM "evaluations" ORDER BY "createdAt" DESC');
    } else {
      result = await pool.query(
        'SELECT * FROM "evaluations" WHERE "createdBy" = $1 OR "appraiser" = $1 OR "supporter" = $1 OR "employeeId" = $1 ORDER BY "createdAt" DESC',
        [req.user.id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/evaluations/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const evalResult = await pool.query('SELECT * FROM "evaluations" WHERE "id" = $1', [id]);
    if (evalResult.rows.length === 0) return res.status(404).json({ error: "Evaluation not found" });
    const ev = evalResult.rows[0];
    if (req.user.role !== "superadmin" && !isRelatedToEvaluation(req.user, ev)) {
      await logAudit(req.user.id, req.user.name, "unauthorized_access", `Attempted to view evaluation #${id}`);
      return res.status(403).json({ error: "Access denied. You can only view your own evaluations." });
    }
    const [scores, peers] = await Promise.all([
      pool.query('SELECT * FROM "criteria_scores" WHERE "evaluationId" = $1', [id]),
      pool.query('SELECT * FROM "peer_feedback" WHERE "evaluationId" = $1', [id])
    ]);
    res.json({ ...ev, criteriaScores: scores.rows, peerFeedbacks: peers.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/evaluations", authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    const createdBy = req.user.id;
    const createdByName = req.user.name;
    if (req.user.role !== "superadmin" && data.employeeId !== req.user.id && data.appraiser !== req.user.id && data.supporter !== req.user.id) {
      await logAudit(req.user.id, req.user.name, "unauthorized_access", `Attempted to create evaluation for employee ${data.employeeId}`);
      return res.status(403).json({ error: "Access denied." });
    }
    const evalResult = await transaction(async (client) => {
      const insertResult = await client.query(
        `INSERT INTO "evaluations" ("employeeId","employeeName","campus","department","position","appraiser","supporter","reviewDate","weightScheme","evaluationType","evalPeriod","totalSelf","totalSuper","overallScore","evaluatorComments","status","createdBy","createdByName")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING "id"`,
        [
          data.employeeId,
          data.employeeName,
          data.campus,
          data.department || "",
          data.position,
          data.appraiser,
          data.supporter || "",
          data.reviewDate,
          data.weightScheme,
          data.evaluationType || "management",
          data.evalPeriod || "",
          data.totalSelf,
          data.totalSuper,
          data.overallScore,
          data.evaluatorComments || "",
          data.status || "Draft",
          createdBy,
          createdByName
        ]
      );
      const evalId = insertResult.rows[0].id;
      for (const c of data.criteriaScores) {
        await client.query(
          'INSERT INTO "criteria_scores" ("evaluationId","criteriaId","selfScore","superScore","supporterScore","managementScore","aspScore") VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [evalId, c.criteriaId, c.selfScore, c.superScore, c.supporterScore || 0, c.managementScore || 0, c.aspScore || 0]
        );
      }
      if (data.peerFeedbacks) {
        for (const p of data.peerFeedbacks) {
          await client.query(
            'INSERT INTO "peer_feedback" ("evaluationId","peerName","feedback","score") VALUES ($1,$2,$3,$4)',
            [evalId, p.peerName, p.feedback, p.score]
          );
        }
      }
      return evalId;
    });
    await logAudit(createdBy, createdByName, "create_evaluation", `Created evaluation for employee ID: ${data.employeeId} (${data.employeeName}) - Position: ${data.position || "N/A"}`);
    broadcast("evaluations:updated", { action: "create", evaluationId: evalResult });
    res.json({ success: true, id: evalResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put("/api/evaluations/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const evResult = await pool.query('SELECT "createdBy","appraiser","supporter","employeeId" FROM "evaluations" WHERE "id" = $1', [id]);
    if (evResult.rows.length === 0) return res.status(404).json({ error: "Evaluation not found" });
    const ev = evResult.rows[0];
    if (req.user.role !== "superadmin" && ev.createdBy !== req.user.id && ev.appraiser !== req.user.id && ev.supporter !== req.user.id && ev.employeeId !== req.user.id) {
      await logAudit(req.user.id, req.user.name, "unauthorized_access", `Attempted to edit evaluation #${id}`);
      return res.status(403).json({ error: "Not authorized to edit this evaluation" });
    }
    await transaction(async (client) => {
      await client.query(
        `UPDATE "evaluations" SET
          "employeeId"=$1,"employeeName"=$2,"campus"=$3,"department"=$4,"position"=$5,
          "appraiser"=$6,"supporter"=$7,"reviewDate"=$8,"weightScheme"=$9,"evaluationType"=$10,
          "evalPeriod"=$11,"totalSelf"=$12,"totalSuper"=$13,"overallScore"=$14,
          "evaluatorComments"=$15,"status"=$16
         WHERE "id"=$17`,
        [
          data.employeeId,
          data.employeeName,
          data.campus,
          data.department || "",
          data.position,
          data.appraiser,
          data.supporter || "",
          data.reviewDate,
          data.weightScheme,
          data.evaluationType || "management",
          data.evalPeriod || "",
          data.totalSelf,
          data.totalSuper,
          data.overallScore,
          data.evaluatorComments || "",
          data.status || "Draft",
          id
        ]
      );
      await client.query('DELETE FROM "criteria_scores" WHERE "evaluationId" = $1', [id]);
      for (const score of data.criteriaScores) {
        await client.query(
          'INSERT INTO "criteria_scores" ("evaluationId","criteriaId","selfScore","superScore","supporterScore","managementScore","aspScore") VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [id, score.criteriaId, score.selfScore || 0, score.superScore || 0, score.supporterScore || 0, score.managementScore || 0, score.aspScore || 0]
        );
      }
      await client.query('DELETE FROM "peer_feedback" WHERE "evaluationId" = $1', [id]);
      if (data.peerFeedbacks && data.peerFeedbacks.length > 0) {
        for (const peer of data.peerFeedbacks) {
          await client.query(
            'INSERT INTO "peer_feedback" ("evaluationId","peerName","feedback","score") VALUES ($1,$2,$3,$4)',
            [id, peer.peerName, peer.feedback, peer.score || 0]
          );
        }
      }
    });
    await logAudit(req.user.id, req.user.name, "update_evaluation", `Updated evaluation #${id} for ${data.employeeName} (Status: ${data.status || "Draft"}, Role: ${req.user.role})`);
    broadcast("evaluations:updated", { action: "update", evaluationId: Number(id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/evaluations/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const evResult = await pool.query('SELECT "createdBy" FROM "evaluations" WHERE "id" = $1', [id]);
    if (evResult.rows.length === 0) return res.status(404).json({ error: "Evaluation not found" });
    if (req.user.role !== "superadmin" && evResult.rows[0].createdBy !== req.user.id) {
      await logAudit(req.user.id, req.user.name, "unauthorized_access", `Attempted to delete evaluation #${id}`);
      return res.status(403).json({ error: "Not authorized to delete this evaluation" });
    }
    await transaction(async (client) => {
      await client.query('DELETE FROM "criteria_scores" WHERE "evaluationId" = $1', [id]);
      await client.query('DELETE FROM "peer_feedback" WHERE "evaluationId" = $1', [id]);
      await client.query('DELETE FROM "evaluations" WHERE "id" = $1', [id]);
    });
    await logAudit(req.user.id, req.user.name, "delete_evaluation", `Deleted evaluation #${id}`);
    broadcast("evaluations:updated", { action: "delete", evaluationId: Number(id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/employees", authenticateToken, async (req, res) => {
  try {
    const { id } = req.query;
    if (id) {
      const empResult = await pool.query('SELECT * FROM "employees" WHERE "id" = $1', [id]);
      const emp = empResult.rows[0] || null;
      if (emp && req.user.role !== "superadmin" && req.user.role !== "admin" && emp.id !== req.user.id) {
        await logAudit(req.user.id, req.user.name, "unauthorized_access", `Attempted to view employee ${id}`);
        return res.status(403).json({ error: "Access denied." });
      }
      return res.json(emp);
    }
    let result;
    if (req.user.role === "superadmin") {
      result = await pool.query('SELECT * FROM "employees" ORDER BY "name" ASC');
    } else if (req.user.role === "admin") {
      result = await pool.query('SELECT * FROM "employees" WHERE "supervisorId" = $1 OR "supporterId" = $1 ORDER BY "name" ASC', [req.user.id]);
    } else {
      const empResult = await pool.query('SELECT * FROM "employees" WHERE "id" = $1', [req.user.id]);
      result = empResult.rows.length > 0 ? { rows: empResult.rows } : { rows: [] };
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/employees", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const d = req.body;
    await pool.query(
      `INSERT INTO "employees" ("id","name","khmerName","campus","department","position","category","supervisorId","supporterId","evalModel","evalPeriod")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT ("id") DO UPDATE SET "name"=EXCLUDED."name","khmerName"=EXCLUDED."khmerName","campus"=EXCLUDED."campus","department"=EXCLUDED."department","position"=EXCLUDED."position","category"=EXCLUDED."category","supervisorId"=EXCLUDED."supervisorId","supporterId"=EXCLUDED."supporterId","evalModel"=EXCLUDED."evalModel","evalPeriod"=EXCLUDED."evalPeriod"`,
      [d.id, d.name, d.khmerName || "", d.campus || "", d.department || "", d.position || "", d.category || "", d.supervisorId || "", d.supporterId || "", d.evalModel || "", d.evalPeriod || ""]
    );
    broadcast("employees:updated", { action: "upsert", employeeId: d.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/employees/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM "employees" WHERE "id" = $1', [req.params.id]);
    broadcast("employees:updated", { action: "delete", employeeId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/audit-logs", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "audit_logs" ORDER BY "timestamp" DESC LIMIT 500');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});
async function startServer() {
  await migrate();
  setupWebSocket();
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
