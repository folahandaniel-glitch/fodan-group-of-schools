import { sql } from "./db";
import { CLASS_LEVELS, DEFAULT_DEPARTMENTS, needsDepartment } from "./logic/academics";
import { hashPassword } from "./crypto";
import { checkPassword } from "./logic/password";
import { DEFAULT_CONTENT } from "./defaults";

export const SCHOOL_SLUG = "fodan-college";

const SUBJECTS: [string, string][] = [
  ["English Language", "ENG"], ["Mathematics", "MTH"], ["Basic Science", "BSC"], ["Social Studies", "SOS"],
  ["Civic Education", "CVE"], ["Computer Studies", "ICT"], ["Christian Religious Studies", "CRS"],
  ["Physics", "PHY"], ["Chemistry", "CHM"], ["Biology", "BIO"], ["Economics", "ECO"], ["Accounting", "ACC"],
  ["Commerce", "COM"], ["Government", "GOV"], ["Literature in English", "LIT"], ["Further Mathematics", "FMT"],
];

/** Idempotent. Creates the school, structure, sessions and the first Super Admin (from env) if absent. */
export async function seedDefaults(): Promise<void> {
  let [school] = await sql`SELECT id FROM schools WHERE slug = ${SCHOOL_SLUG}`;
  if (!school) {
    [school] = await sql`INSERT INTO schools (slug, name, short_name, is_principal) VALUES (${SCHOOL_SLUG}, 'Fodan College International', 'Fodan College', true) RETURNING id`;
  }
  const sid: string = school.id;

  const [{ n }] = await sql`SELECT count(*)::int AS n FROM sections WHERE school_id = ${sid}`;
  if (n === 0) {
    const secs: Record<string, string> = {};
    let i = 0;
    for (const name of ["Primary", "Junior Secondary", "Senior Secondary"]) {
      const [r] = await sql`INSERT INTO sections (school_id, name, sort) VALUES (${sid}, ${name}, ${i++}) RETURNING id`;
      secs[name] = r.id;
    }
    const depts: string[] = [];
    for (const d of DEFAULT_DEPARTMENTS) {
      const [r] = await sql`INSERT INTO departments (school_id, name) VALUES (${sid}, ${d}) RETURNING id`;
      depts.push(r.id);
    }
    for (const c of CLASS_LEVELS) {
      if (needsDepartment(c.level)) {
        for (const dep of depts) {
          await sql`INSERT INTO classes (school_id, section_id, level, name, arm, department_id) VALUES (${sid}, ${secs[c.section]}, ${c.level}, ${c.name}, '', ${dep})`;
        }
      } else {
        await sql`INSERT INTO classes (school_id, section_id, level, name, arm) VALUES (${sid}, ${secs[c.section]}, ${c.level}, ${c.name}, 'A')`;
      }
    }
    for (const [name, code] of SUBJECTS) {
      await sql`INSERT INTO subjects (school_id, name, code) VALUES (${sid}, ${name}, ${code}) ON CONFLICT DO NOTHING`;
    }
    const y = new Date().getFullYear();
    const m = new Date().getMonth();
    const startYear = m >= 8 ? y : y - 1;
    const [sess] = await sql`INSERT INTO academic_sessions (school_id, name, is_current) VALUES (${sid}, ${`${startYear}/${startYear + 1}`}, true) RETURNING id`;
    const termNames = ["First Term", "Second Term", "Third Term"];
    const cur = m >= 8 ? 0 : m <= 3 ? 1 : 2;
    for (let t = 0; t < 3; t++) {
      await sql`INSERT INTO terms (school_id, session_id, name, is_current) VALUES (${sid}, ${sess.id}, ${termNames[t]}, ${t === cur})`;
    }
  }

  const [{ c }] = await sql`SELECT count(*)::int AS c FROM content_items WHERE school_id = ${sid}`;
  if (c === 0) {
    for (const it of DEFAULT_CONTENT) {
      await sql`INSERT INTO content_items (school_id, kind, title, body, data, sort) VALUES (${sid}, ${it.kind}, ${it.title}, ${it.body}, ${sql.json((it.data ?? {}) as never)}, ${it.sort ?? 100})`;
    }
  }

  const [{ su }] = await sql`SELECT count(*)::int AS su FROM users WHERE role = 'super_admin'`;
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const pw = process.env.SUPERADMIN_BOOTSTRAP_PASSWORD;
  if (su === 0 && email && pw && checkPassword(pw).ok) {
    await sql`INSERT INTO users (school_id, email, password_hash, role, first_name, last_name, must_change_password)
              VALUES (${sid}, ${email}, ${await hashPassword(pw)}, 'super_admin', 'Super', 'Admin', true)
              ON CONFLICT DO NOTHING`;
  }
}
