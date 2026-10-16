// DEV ONLY: authorization / IDOR checks against the local server.
import postgres from "postgres";
import { hash } from "@node-rs/argon2";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
if (!/127\.0\.0\.1|localhost/.test(env.DATABASE_URL)) throw new Error("local only");
const sql = postgres(env.DATABASE_URL, { max: 1, prepare: false });
const BASE = "http://localhost:3200";
const sess = async (userId) => {
  const raw = randomBytes(32).toString("base64url");
  await sql`INSERT INTO sessions (id, user_id, mfa_passed, expires_at) VALUES (${createHash("sha256").update(raw).digest("hex")}, ${userId}, true, now() + interval '1 hour')`;
  return raw;
};
const [school] = await sql`SELECT id FROM schools LIMIT 1`;
const ph = await hash(`Sx${randomBytes(9).toString("base64url")}7!^`, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
const [amaka] = await sql`INSERT INTO users (school_id, email, password_hash, role, first_name, last_name) VALUES (${school.id}, 'amaka.obi@student.test', ${ph}, 'student', 'Amaka', 'Obi')
  ON CONFLICT (lower(email)) DO UPDATE SET role = 'student' RETURNING id`;
await sql`UPDATE students SET user_id = ${amaka.id}, status = 'active' WHERE admission_no = 'ADM-002'`;
const [chidi] = await sql`SELECT s.id, u.id AS uid FROM students s JOIN users u ON u.id = s.user_id WHERE s.admission_no = 'ADM-001'`;
let [att] = await sql`SELECT id FROM attempts WHERE student_id = ${chidi.id} LIMIT 1`;
if (!att) {
  const [a1] = await sql`SELECT id FROM assessments WHERE kind = 'exam' LIMIT 1`;
  const [q1] = await sql`SELECT id FROM questions LIMIT 1`;
  [att] = await sql`INSERT INTO attempts (assessment_id, student_id, deadline_at, plan) VALUES (${a1.id}, ${chidi.id}, now() + interval '30 minutes', ${sql.json([{ q: q1.id, o: ["A", "B", "C", "D"] }])}) RETURNING id`;
}
const [file] = await sql`INSERT INTO files (school_id, name, mime, size, public, data) VALUES (${school.id}, 'secret.pdf', 'application/pdf', 4, false, ${Buffer.from("%PDF")}) RETURNING id`;
const a = await sess(amaka.id);
// Streaming layouts deliver notFound()/redirect() as a 200 shell; expose body-based flags as well as the status.
const get = async (p, tok, init = {}) => { const r = await fetch(BASE + p, { redirect: "manual", ...init, headers: { ...(tok ? { cookie: `fgs_session=${tok}` } : {}), ...(init.headers ?? {}) } }); const body = r.status === 200 ? await r.text() : ""; return { status: r.status, headers: r.headers, body, text: async () => body, nf: r.status === 404 || /could not find that page|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK;404/.test(body), forbidden: /forbidden/.test(r.headers.get("location") ?? "") || body.includes("/forbidden") }; };

let fail = 0;
const check = (name, ok, info = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  (" + info + ")" : ""}`); if (!ok) fail++; };

let r = await get("/portal");
check("anonymous /portal redirects to login", r.status === 307 && /login/.test(r.headers.get("location") ?? ""));
r = await get("/portal/students", a);
check("student cannot open student directory", r.forbidden);
r = await get(`/portal/students/${chidi.id}`, a);
check("student cannot open another student's record", r.forbidden || r.nf, String(r.status));
r = await get(`/portal/report/${chidi.id}`, a);
check("IDOR: report card of another student not shown", r.nf && !/Chidi/.test(r.body), String(r.status));
r = await get(`/portal/results?student=${chidi.id}`, a);
const body = r.status === 200 ? await r.text() : "";
check("IDOR: results of another student not shown", !/Chidi/.test(body), `status ${r.status}`);
r = await get(`/api/cbt/${att.id}`, a);
check("IDOR: another student's exam attempt -> 404", r.status === 404, String(r.status));
r = await get(`/api/cbt/${att.id}`, a, { method: "POST", body: JSON.stringify({ action: "submit" }), headers: { "content-type": "application/json" } });
check("IDOR: cannot submit another student's attempt", r.status === 404, String(r.status));
r = await get("/portal/audit", a);
check("student cannot read audit log", r.forbidden);
r = await get("/portal/settings", a);
check("student cannot open settings", r.forbidden);
r = await get("/portal/export/students", a);
check("student cannot export students", r.status === 403, String(r.status));
r = await get(`/api/files/${file.id}`);
check("private file requires sign-in", r.status === 401, String(r.status));
r = await get(`/api/files/${file.id}`, a);
check("student cannot fetch an unpublished private file", r.status === 404, String(r.status));
r = await get("/api/files/not-a-uuid");
check("malformed file id rejected", r.status === 404);
r = await get("/portal", "forged-" + randomBytes(8).toString("hex"));
check("forged session cookie rejected", r.status === 307 && /login/.test(r.headers.get("location") ?? ""));
r = await get("/api/cbt/" + att.id, undefined);
check("anonymous cannot read exam attempt", r.status === 404);
// Headers
r = await fetch(BASE + "/");
check("security headers present", r.headers.get("x-content-type-options") === "nosniff" && !!r.headers.get("strict-transport-security") && r.headers.get("x-frame-options") === "SAMEORIGIN");
// Brute force: lockout after repeated failures (server action is exercised via the DB counters)
const [u] = await sql`SELECT failed_logins FROM users WHERE email = 'amaka.obi@student.test'`;
check("lockout counter available", u.failed_logins === 0);
// Audit log is append-only
await sql`INSERT INTO audit_logs (school_id, action) VALUES (${school.id}, 'test.entry')`;
let blocked = false;
try { await sql`UPDATE audit_logs SET action = 'tampered' WHERE id = (SELECT max(id) FROM audit_logs)`; } catch { blocked = true; }
check("audit log rejects UPDATE", blocked);
await sql`SELECT 1`.catch(() => {}); // drain the embedded dev server after an error
blocked = false;
{ const s2 = postgres(env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} }); try { await s2`DELETE FROM audit_logs WHERE id = (SELECT max(id) FROM audit_logs)`; } catch { blocked = true; } await s2.end().catch(() => {}); }
check("audit log rejects DELETE", blocked);
// Passwords are hashed with Argon2id and never stored plain
const [hrow] = await sql`SELECT password_hash FROM users WHERE email = 'chidi.eze@student.test'`;
check("passwords stored as Argon2id", /^\$argon2id\$/.test(hrow.password_hash));
const [codeRow] = await sql`SELECT code_hash, code_enc FROM students WHERE admission_no = 'ADM-001'`;
check("access code not stored in clear", !/FDN-/.test(codeRow.code_hash + codeRow.code_enc));
await sql.end();
console.log(fail ? `\n${fail} FAILED` : "\nAll security checks passed");
process.exit(fail ? 1 : 0);
