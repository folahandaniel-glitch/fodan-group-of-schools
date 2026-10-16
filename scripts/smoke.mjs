// DEV ONLY: renders every portal page as several roles against the local server and reports failures.
import postgres from "postgres";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
if (!/127\.0\.0\.1|localhost/.test(env.DATABASE_URL)) throw new Error("local only");
const sql = postgres(env.DATABASE_URL, { max: 1, prepare: false });
const BASE = process.env.BASE || "http://localhost:3200";

async function session(email) {
  const [u] = await sql`SELECT id FROM users WHERE lower(email) = ${email}`;
  if (!u) return null;
  const raw = randomBytes(32).toString("base64url");
  await sql`INSERT INTO sessions (id, user_id, mfa_passed, expires_at) VALUES (${createHash("sha256").update(raw).digest("hex")}, ${u.id}, true, now() + interval '1 hour')`;
  return raw;
}
await sql`UPDATE users SET mfa_enabled = true, mfa_secret = 'JBSWY3DPEHPK3PXP', must_change_password = false WHERE role = 'super_admin'`;
const [cls] = await sql`SELECT id FROM classes WHERE name = 'JSS 2' AND arm = 'A'`;
const [stu] = await sql`SELECT id FROM students WHERE admission_no = 'ADM-001'`;
const [asm] = await sql`SELECT id FROM assessments WHERE kind = 'exam' LIMIT 1`;
const [stf] = await sql`SELECT id FROM users WHERE email = 'teacher1@demo.fodan'`;
const [les] = await sql`SELECT id FROM lesson_notes LIMIT 1`;
const [subj] = await sql`SELECT id FROM subjects WHERE name = 'Mathematics'`;
const [term] = await sql`SELECT id FROM terms WHERE is_current`;
const [su] = await sql`SELECT email FROM users WHERE role = 'super_admin'`;
const [cert] = await sql`SELECT id FROM certificates LIMIT 1`;

const pages = [
  "/portal", "/portal/students", `/portal/students/${stu.id}`, "/portal/staff", `/portal/staff/${stf.id}`, "/portal/classes",
  `/portal/promotion?class=${cls.id}`, "/portal/lessons", "/portal/lessons/new", les ? `/portal/lessons/${les.id}` : null,
  "/portal/questions", "/portal/assessments", `/portal/assessments/${asm.id}`,
  `/portal/mark-sheet?class=${cls.id}&subject=${subj.id}&term=${term.id}`, `/portal/results?student=${stu.id}`, `/portal/report/${stu.id}`,
  "/portal/certificates", cert ? `/portal/certificates/${cert.id}` : null, "/portal/analytics", `/portal/timetable?class=${cls.id}`,
  `/portal/attendance?class=${cls.id}`, "/portal/attendance?mode=staff", "/portal/calendar", "/portal/announcements", "/portal/comments", "/portal/audit",
  "/portal/users", "/portal/resources", "/portal/study", "/portal/mocks", "/portal/work", "/portal/children", "/portal/notifications",
  ...["brand", "founder", "contact", "home", "content", "academic", "eligibility", "periods", "permissions"].map((t) => `/portal/settings?tab=${t}`),
  "/account", "/account/password", "/account/security",
  "/portal/payroll", "/portal/payslips", "/portal/ledger", "/portal/performance", "/portal/branches", "/portal/clock", "/portal/backend", "/portal/search?q=a",
  ...["rosters", "deliverables", "crm", "procurement", "contracts", "finance", "forum", "leave"].map((m) => `/portal/m/${m}`),
].filter(Boolean);

const roles = [su.email, "principal@demo.fodan", "vpadmin@demo.fodan", "vpacademics@demo.fodan", "hod@demo.fodan", "teacher1@demo.fodan", "proprietor@demo.fodan", "chidi.eze@student.test"];
let bad = 0;
for (const email of roles) {
  const tok = await session(email);
  if (!tok) { console.log("skip", email); continue; }
  const res = [];
  for (const p of pages) {
    const r = await fetch(BASE + p, { headers: { cookie: `fgs_session=${tok}` }, redirect: "manual" });
    const loc = r.headers.get("location") ?? "";
    const body = r.status === 200 ? await r.text() : "";
    const broken = r.status >= 500 || /This page couldn’t load|Application error/.test(body);
    if (broken) { bad++; res.push(`  ✗ ${p} -> ${r.status}`); }
    else if (r.status >= 300 && r.status < 400 && !/forbidden|\/portal\/?$|work|login/.test(loc)) res.push(`  ? ${p} -> ${r.status} ${loc}`);
  }
  console.log(`${email}: ${pages.length} pages${res.length ? "\n" + res.join("\n") : " ok"}`);
}
await sql.end();
process.exit(bad ? 1 : 0);
