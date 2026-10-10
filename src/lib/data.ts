import { sql } from "./db";
import { classLabel } from "./settings";

export async function listClasses(schoolId: string, opts: { archived?: boolean; ids?: string[] } = {}) {
  const rows = await sql`
    SELECT c.id, c.name, c.arm, c.level, c.department_id, c.class_teacher_id, c.archived, d.name AS department,
           u.first_name || ' ' || u.last_name AS class_teacher
    FROM classes c LEFT JOIN departments d ON d.id = c.department_id LEFT JOIN users u ON u.id = c.class_teacher_id
    WHERE c.school_id = ${schoolId} ${opts.archived ? sql`` : sql`AND NOT c.archived`}
      ${opts.ids ? sql`AND c.id = ANY(${opts.ids})` : sql``}
    ORDER BY c.level, c.arm, d.name`;
  return rows.map((r) => ({ ...r, label: classLabel({ name: r.name, arm: r.arm, department: r.department }) })) as {
    id: string; name: string; arm: string; level: number; department_id: string | null; class_teacher_id: string | null;
    archived: boolean; department: string | null; class_teacher: string | null; label: string;
  }[];
}

export async function listSubjects(schoolId: string) {
  return (await sql`SELECT id, name, code, department_id FROM subjects WHERE school_id = ${schoolId} AND NOT archived ORDER BY name`) as unknown as
    { id: string; name: string; code: string | null; department_id: string | null }[];
}

export async function listDepartments(schoolId: string) {
  return (await sql`SELECT id, name, head_id FROM departments WHERE school_id = ${schoolId} AND NOT archived ORDER BY name`) as unknown as
    { id: string; name: string; head_id: string | null }[];
}

export async function listTerms(schoolId: string) {
  return (await sql`SELECT t.id, t.name, s.name AS session, t.is_current FROM terms t JOIN academic_sessions s ON s.id = t.session_id
                    WHERE t.school_id = ${schoolId} ORDER BY s.name DESC, t.name`) as unknown as
    { id: string; name: string; session: string; is_current: boolean }[];
}

export async function listStaff(schoolId: string) {
  return (await sql`SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.status
                    FROM users u WHERE u.school_id = ${schoolId} AND u.role NOT IN ('student','parent') AND u.status <> 'archived'
                    ORDER BY u.last_name, u.first_name`) as unknown as
    { id: string; first_name: string; last_name: string; email: string; role: string; status: string }[];
}

export const opts = <T extends { id: string }>(rows: T[], label: (r: T) => string) => rows.map((r) => ({ value: r.id, label: label(r) }));

export function pageParams(sp: Record<string, string | string[] | undefined>, size = 25) {
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);
  return { page, size, offset: (page - 1) * size };
}

export const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Escape a value for a CSV cell, neutralising spreadsheet formula injection. */
export function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  return [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");
}

/** postgres.js returns DATE columns as Date objects; format as YYYY-MM-DD for inputs and comparisons. */
export function ymd(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}
