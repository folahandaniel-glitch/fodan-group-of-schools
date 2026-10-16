// DEV ONLY: seeds a throw-away demo school on the LOCAL database for acceptance testing.
// Refuses to run against anything but localhost.
import postgres from "postgres";
import { hash } from "@node-rs/argon2";
import { createHmac, createCipheriv, createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
if (!/127\.0\.0\.1|localhost/.test(env.DATABASE_URL)) throw new Error("Refusing to seed a non-local database");
const sql = postgres(env.DATABASE_URL, { max: 2, prepare: false, onnotice: () => {} });
const key = createHash("sha256").update(env.AUTH_SECRET).digest();
const lookup = (s) => createHmac("sha256", key.length ? env.AUTH_SECRET : "").update(s).digest("hex");
// NOTE: crypto.ts uses createHmac("sha256", secret()) where secret() is the sha256 digest Buffer.
const lookupReal = (s) => createHmac("sha256", key).update(s).digest("hex");
void lookup;
const enc = (plain) => {
  const iv = randomBytes(12); const c = createCipheriv("aes-256-gcm", key, iv);
  const e = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), e].map((b) => b.toString("base64url")).join(".");
};
const code = () => { const A = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; const b = randomBytes(15); let o = ""; for (let i = 0; i < 15; i++) o += A[b[i] & 31]; return `FDN-${o.slice(0, 5)}-${o.slice(5, 10)}-${o.slice(10)}`; };
const PW = process.env.DEMO_PASSWORD || `Dm${randomBytes(9).toString("base64url").replace(/[-_]/g, "x")}7!^`;
const phash = await hash(PW, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });

const [school] = await sql`SELECT id FROM schools WHERE slug = 'fodan-college'`;
const sid = school.id;
const mk = async (email, role, first, last, extra = {}) => {
  const [u] = await sql`INSERT INTO users (school_id, email, password_hash, role, first_name, last_name, phone) VALUES (${sid}, ${email}, ${phash}, ${role}, ${first}, ${last}, ${extra.phone ?? null})
    ON CONFLICT (lower(email)) DO UPDATE SET role = EXCLUDED.role RETURNING id`;
  if (!["student", "parent"].includes(role)) await sql`INSERT INTO staff_profiles (user_id, school_id, position, qualification, years_experience) VALUES (${u.id}, ${sid}, ${extra.position ?? role}, ${extra.q ?? "B.Sc"}, ${extra.years ?? 6}) ON CONFLICT DO NOTHING`;
  return u.id;
};
const staff = {
  proprietor: await mk("proprietor@demo.fodan", "proprietor", "Banjo", "Daniel", { position: "Founder and Proprietor" }),
  principal: await mk("principal@demo.fodan", "principal", "Grace", "Adeyemi", { position: "Principal" }),
  vpa: await mk("vpadmin@demo.fodan", "vp_admin", "Tunde", "Bello", { position: "VP Administration" }),
  vpac: await mk("vpacademics@demo.fodan", "vp_academics", "Ngozi", "Okafor", { position: "VP Academics" }),
  hod: await mk("hod@demo.fodan", "hod", "Samuel", "Ojo", { position: "HOD Sciences" }),
  t1: await mk("teacher1@demo.fodan", "teacher", "Ada", "Nwosu", { position: "Mathematics Teacher" }),
  t2: await mk("teacher2@demo.fodan", "teacher", "Femi", "Alade", { position: "English Teacher" }),
};
const [jss2] = await sql`SELECT id FROM classes WHERE school_id = ${sid} AND name = 'JSS 2' AND arm = 'A'`;
const [jss3] = await sql`SELECT id FROM classes WHERE school_id = ${sid} AND name = 'JSS 3' AND arm = 'A'`;
const [math] = await sql`SELECT id FROM subjects WHERE school_id = ${sid} AND name = 'Mathematics'`;
const [eng] = await sql`SELECT id FROM subjects WHERE school_id = ${sid} AND name = 'English Language'`;
const [term] = await sql`SELECT id FROM terms WHERE school_id = ${sid} AND is_current = true`;
await sql`UPDATE classes SET class_teacher_id = ${staff.t1} WHERE id = ${jss2.id}`;
await sql`UPDATE users SET role = 'class_teacher' WHERE id = ${staff.t1}`;
await sql`INSERT INTO class_subjects (class_id, subject_id, teacher_id) VALUES (${jss2.id}, ${math.id}, ${staff.t1}), (${jss2.id}, ${eng.id}, ${staff.t2}) ON CONFLICT DO NOTHING`;

const out = { password: PW, students: [] };
const kids = [["Chidi", "Eze", "ADM-001", "2013-04-02"], ["Amaka", "Obi", "ADM-002", "2013-09-18"], ["Tola", "Ajayi", "ADM-003", "2012-12-30"]];
for (const [f, l, adm, dob] of kids) {
  const c = code();
  await sql`INSERT INTO students (school_id, admission_no, first_name, last_name, dob, gender, class_id, guardian_name, guardian_phone, guardian_email, admission_year, code_hash, code_enc)
    VALUES (${sid}, ${adm}, ${f}, ${l}, ${dob}, 'Male', ${jss2.id}, 'Parent ' || ${l}, '08011112222', ${`parent.${l.toLowerCase()}@demo.fodan`}, 2025, ${lookupReal(c)}, ${enc(c)})
    ON CONFLICT (school_id, admission_no) DO NOTHING`;
  out.students.push({ name: `${f} ${l}`, adm, dob, code: c });
}
// One pre-activated student account for repeatable tests.
{
  const [u] = await sql`INSERT INTO users (school_id, email, password_hash, role, first_name, last_name) VALUES (${sid}, 'chidi.eze@student.test', ${phash}, 'student', 'Chidi', 'Eze')
    ON CONFLICT (lower(email)) DO UPDATE SET role = 'student' RETURNING id`;
  await sql`UPDATE students SET user_id = ${u.id}, status = 'active', code_activated_at = now() WHERE admission_no = 'ADM-001'`;
}
// Approved questions for Mathematics (JSS 2)
const qs = [
  ["What is $3 \\times 4$?", ["10", "12", "14", "16"], "B"], ["Simplify $2x + 3x$", ["5x", "6x", "5", "x"], "A"], ["The square root of 81 is", ["7", "8", "9", "10"], "C"],
  ["What is 15% of 200?", ["20", "25", "30", "35"], "C"], ["Solve: $x + 5 = 12$", ["5", "6", "7", "8"], "C"], ["The sum of angles in a triangle is", ["90°", "180°", "270°", "360°"], "B"],
  ["$\\frac{1}{2} + \\frac{1}{4} =$", ["$\\frac{1}{6}$", "$\\frac{2}{6}$", "$\\frac{3}{4}$", "$\\frac{3}{8}$"], "C"], ["Perimeter of a square of side 5cm", ["10", "15", "20", "25"], "C"],
];
const qids = [];
for (const [t, o, c] of qs) {
  const opts = o.map((x, i) => ({ key: "ABCD"[i], text: x }));
  const [q] = await sql`INSERT INTO questions (school_id, subject_id, class_id, term_id, topic, text, options, correct, marks, copyright, author_id, status)
    VALUES (${sid}, ${math.id}, ${jss2.id}, ${term.id}, 'Arithmetic', ${t}, ${sql.json(opts)}, ${c}, 1, 'teacher_authored', ${staff.t1}, 'APPROVED') RETURNING id`;
  qids.push(q.id);
}
for (const [kind, title, dur] of [["assignment", "Week 3 Assignment", 15], ["ca", "Mid-Term CA Test", 20], ["exam", "Terminal Examination", 30]]) {
  const [a] = await sql`INSERT INTO assessments (school_id, kind, title, subject_id, class_id, term_id, duration_min, attempt_limit, draw_count, status, release_mode, created_by)
    VALUES (${sid}, ${kind}, ${title}, ${math.id}, ${jss2.id}, ${term.id}, ${dur}, ${kind === "assignment" ? 2 : 1}, 6, 'published', 'manual', ${staff.t1}) RETURNING id`;
  for (const q of qids) await sql`INSERT INTO assessment_questions (assessment_id, question_id, marks) VALUES (${a.id}, ${q}, 1)`;
}
const [mock] = await sql`INSERT INTO assessments (school_id, kind, title, subject_id, class_id, term_id, duration_min, attempt_limit, status, mock_category, mock_type, created_by)
  VALUES (${sid}, 'mock', 'BECE Mathematics Practice', ${math.id}, NULL, ${term.id}, 25, 5, 'published', 'bece', 'Practice mock', ${staff.t1}) RETURNING id`;
for (const q of qids) await sql`INSERT INTO assessment_questions (assessment_id, question_id, marks) VALUES (${mock.id}, ${q}, 1)`;
await sql`INSERT INTO questions (school_id, subject_id, class_id, text, options, correct, author_id, status) VALUES (${sid}, ${math.id}, ${jss2.id}, 'Pending example $2^3$ =', ${sql.json([{ key: "A", text: "6" }, { key: "B", text: "8" }])}, 'B', ${staff.t1}, 'PENDING_REVIEW')`;
console.log(JSON.stringify({ ...out, accounts: ["proprietor", "principal", "vpadmin", "vpacademics", "hod", "teacher1", "teacher2"].map((n) => `${n}@demo.fodan`), jss3: jss3.id }, null, 1));
await sql.end();
