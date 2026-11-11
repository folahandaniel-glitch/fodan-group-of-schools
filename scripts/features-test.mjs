// DEV ONLY: checks the newer features against the local server: Developer invisibility, Excel downloads, access rules.
import postgres from "postgres";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import readXlsxFile from "read-excel-file/node";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
if (!/127\.0\.0\.1|localhost/.test(env.DATABASE_URL)) throw new Error("local only");
const sql = postgres(env.DATABASE_URL, { max: 1, prepare: false });
const BASE = process.env.BASE || "http://localhost:3200";
let fails = 0;
const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"}  ${m}`); if (!c) fails++; };

async function session(email) {
  const [u] = await sql`SELECT id FROM users WHERE lower(email) = ${email}`;
  if (!u) return null;
  const raw = randomBytes(32).toString("base64url");
  await sql`INSERT INTO sessions (id, user_id, mfa_passed, expires_at) VALUES (${createHash("sha256").update(raw).digest("hex")}, ${u.id}, true, now() + interval '1 hour')`;
  return raw;
}
const get = (tok, p) => fetch(BASE + p, { headers: { cookie: `fgs_session=${tok}` }, redirect: "manual" });

// A Developer account that nobody else may see.
const [school] = await sql`SELECT id FROM schools LIMIT 1`;
await sql`DELETE FROM users WHERE email = 'secret.dev@example.com'`;
const [dev] = await sql`INSERT INTO users (school_id, email, password_hash, role, first_name, last_name, mfa_enabled, mfa_secret) VALUES (${school.id}, 'secret.dev@example.com', 'x', 'developer', 'Zyxwv', 'Hiddenson', true, 'JBSWY3DPEHPK3PXP') RETURNING id`;
await sql`INSERT INTO staff_profiles (user_id, school_id, position, public) VALUES (${dev.id}, ${school.id}, 'Developer', true) ON CONFLICT DO NOTHING`;
await sql`INSERT INTO audit_logs (school_id, actor_id, actor_label, category, action) VALUES (${school.id}, ${dev.id}, 'secret.dev@example.com', 'security', 'zz.dev.secret.action')`.catch(() => {});

const roles = ["principal@demo.fodan", "vpadmin@demo.fodan", "teacher1@demo.fodan", "proprietor@demo.fodan"];
const [sa] = await sql`SELECT email FROM users WHERE role = 'super_admin' LIMIT 1`;
await sql`UPDATE users SET mfa_enabled = true, mfa_secret = 'JBSWY3DPEHPK3PXP', must_change_password = false WHERE role IN ('super_admin','developer')`;
const pages = ["/portal/users", "/portal/staff", "/portal/search?q=Zyxwv", "/portal/search?q=secret.dev", "/portal/audit", "/portal/hrm?tab=cases", "/portal/branches", "/portal/performance", "/portal/attendance?mode=staff", "/portal/payroll", "/portal/timetable", "/staff", "/"];
for (const email of [sa.email, ...roles]) {
  const tok = await session(email); if (!tok) continue;
  let leak = [];
  for (const p of pages) { const r = await get(tok, p); if (r.status === 200) { const t = await r.text(); if (/Hiddenson|secret\.dev@example|zz\.dev\.secret/.test(t)) leak.push(p); } }
  ok(leak.length === 0, `${email} cannot see the Developer${leak.length ? ": " + leak.join(", ") : ""}`);
  const r = await get(tok, `/portal/staff/${dev.id}`);
  ok(r.status === 404 || r.status >= 300, `${email} cannot open the Developer's profile (${r.status})`);
}
const devTok = await session("secret.dev@example.com");
const dr = await get(devTok, "/portal/users"); const dt = await dr.text();
ok(dr.status === 200 && /secret\.dev@example/.test(dt), "the Developer sees their own account");

// Excel downloads: real .xlsx files that parse, with scoped access.
const saTok = await session(sa.email);
for (const rep of ["students", "student-attendance", "staff-attendance", "period-registers", "timetable", "staff", "fines", "payroll", "expenses", "hr-cases", "crm"]) {
  const r = await get(saTok, `/portal/export/${rep}`);
  const buf = Buffer.from(await r.arrayBuffer());
  let rows = -1;
  try { const wb = await readXlsxFile(buf); rows = Array.isArray(wb) && wb[0]?.data ? wb[0].data.length : wb.length; } catch { /* not parseable */ }
  ok(r.status === 200 && buf[0] === 0x50 && rows >= 1 && /spreadsheetml/.test(r.headers.get("content-type") ?? ""), `Excel download "${rep}" opens (${rows} rows incl. header)`);
}
const tTok = await session("teacher1@demo.fodan");
for (const rep of ["staff-attendance", "payroll", "expenses", "hr-cases", "crm", "audit", "fines"]) {
  const r = await get(tTok, `/portal/export/${rep}`);
  ok(r.status === 403, `a subject teacher cannot download "${rep}" (${r.status})`);
}
const sTok = await session("chidi.eze@student.test");
ok((await get(sTok, "/portal/export/students")).status === 403, "a student cannot download records");
for (const p of ["/portal/hrm?tab=cases", "/portal/crm", "/portal/payroll", "/portal/expenses", "/portal/exports"]) {
  const r = await get(tTok, p);
  const loc = r.headers.get("location") ?? "";
  console.log(`info  teacher -> ${p}: ${r.status} ${loc}`);
}
ok(/forbidden|\/portal\/?$/.test((await get(tTok, "/portal/crm")).headers.get("location") ?? ""), "a subject teacher is kept out of CRM");
ok(/forbidden|\/portal\/?$/.test((await get(tTok, "/portal/payroll")).headers.get("location") ?? ""), "a subject teacher is kept out of payroll");

await sql`DELETE FROM users WHERE id = ${dev.id}`.catch(() => {});
await sql.end();
console.log(fails ? `\n${fails} check(s) failed` : "\nAll feature checks passed");
process.exit(fails ? 1 : 0);
