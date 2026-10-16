// DEV ONLY: renders the new module pages as several roles and checks module visibility rules.
import postgres from "postgres";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
if (!/127\.0\.0\.1|localhost/.test(env.DATABASE_URL)) throw new Error("local only");
const sql = postgres(env.DATABASE_URL, { max: 1, prepare: false });
const BASE = "http://localhost:3200";
const tok = async (email) => {
  const [u] = await sql`SELECT id FROM users WHERE lower(email) = ${email}`;
  const raw = randomBytes(32).toString("base64url");
  await sql`INSERT INTO sessions (id, user_id, mfa_passed, expires_at) VALUES (${createHash("sha256").update(raw).digest("hex")}, ${u.id}, true, now() + interval '1 hour')`;
  return raw;
};
// With streaming layouts, notFound()/redirect() may arrive as a 200 shell containing the not-found or redirect markup.
const get = async (p, t) => { const r = await fetch(BASE + p, { redirect: "manual", headers: t ? { cookie: `fgs_session=${t}` } : {} }); const body = r.status === 200 ? await r.text() : ""; return { status: r.status, body, location: r.headers.get("location") ?? "", nf: r.status === 404 || /could not find that page|NEXT_HTTPS?_ERROR_FALLBACK;404|NEXT_NOT_FOUND/.test(body), forbidden: /forbidden/.test(r.headers.get("location") ?? "") || body.includes("/forbidden") }; };
let fail = 0;
const check = (n, ok, i = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${n}${i ? " (" + i + ")" : ""}`); if (!ok) fail++; };

const [school] = await sql`SELECT id FROM schools LIMIT 1`;
const [t1] = await sql`SELECT id FROM users WHERE email = 'teacher1@demo.fodan'`;
const [pr] = await sql`SELECT id FROM users WHERE email = 'principal@demo.fodan'`;
await sql`UPDATE users SET mfa_enabled = true, mfa_secret = 'JBSWY3DPEHPK3PXP', must_change_password = false WHERE role = 'super_admin'`;
await sql`DELETE FROM records`;
const mk = async (module, title, status, owner) => (await sql`INSERT INTO records (school_id, module, title, status, owner_id) VALUES (${school.id}, ${module}, ${title}, ${status}, ${owner}) RETURNING id`)[0].id;
const leave = await mk("leave", "Leave A", "pending", t1.id);
const disc = await mk("discipline", "Query B", "open", pr.id);
const tick = await mk("tickets", "Ticket C", "open", t1.id);
const forum = await mk("forum", "Topic D", "open", t1.id);
const hidden = await mk("forum", "Hidden E", "hidden", pr.id);

const teacher = await tok("teacher1@demo.fodan"), principal = await tok("principal@demo.fodan"), student = await tok("chidi.eze@student.test"), super_ = await tok("folahandaniel@gmail.com");
for (const m of ["forum", "tasks", "leave", "memos", "kb", "tickets", "discipline"]) {
  const r = await get(`/portal/m/${m}`, principal);
  check(`principal opens /m/${m}`, r.status === 200, String(r.status));
}
check("backend console renders for super admin", (await get("/portal/backend", super_)).status === 200);
check("backend console blocked for teacher", (await get("/portal/backend", teacher)).forbidden);
check("search renders", (await get("/portal/search?q=Topic", teacher)).status === 200);
check("student cannot open discipline module", (await get("/portal/m/discipline", student)).nf);
check("student cannot open staff leave module", (await get("/portal/m/leave", student)).nf);
check("teacher cannot open discipline record", (await get(`/portal/m/discipline/${disc}`, teacher)).nf);
check("teacher sees own leave record", (await get(`/portal/m/leave/${leave}`, teacher)).status === 200);
check("student cannot see teacher's ticket (IDOR)", (await get(`/portal/m/tickets/${tick}`, student)).nf);
check("student can read open forum topic", (await get(`/portal/m/forum/${forum}`, student)).status === 200);
check("student cannot read hidden forum topic", (await get(`/portal/m/forum/${hidden}`, student)).nf);
const rr = (await get("/portal/m/forum", student)).body;
check("hidden topic not listed for student", !rr.includes("Hidden E"));
check("unknown module 404", (await get("/portal/m/nope", principal)).nf);
await sql.end();
process.exit(fail ? 1 : 0);
