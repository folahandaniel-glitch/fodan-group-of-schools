"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/security";
import { listClasses } from "@/lib/data";
import { newAccessCode } from "@/lib/student-codes";
import { parseStudents, ymdOf } from "@/lib/student-import";

type State = { error?: string; ok?: string };
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Creates many students at once, each with a fresh access code. Rows with problems are skipped and listed; the rest are saved. */
export async function importStudents(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("students:create");
  const f = fd.get("file") as File | null;
  if (!f || f.size === 0) return { error: "Choose the filled template." };
  if (f.size > 2 * 1024 * 1024) return { error: "The file is larger than 2 MB." };
  const { rows, error } = await parseStudents(f.name, Buffer.from(await f.arrayBuffer()));
  if (error) return { error };
  if (rows.length > 500) return { error: "Import at most 500 students at a time." };

  const classes = await listClasses(me.schoolId);
  const byLabel = new Map(classes.map((c) => [key(c.label), c]));
  const seen = new Set<string>();
  const problems: string[] = [];
  let added = 0;
  for (const [i, r] of rows.entries()) {
    const line = i + 2;
    if (!r.admission_no || !r.first_name || !r.last_name) { problems.push(`Row ${line}: admission number, first name and last name are required.`); continue; }
    const adm = r.admission_no.slice(0, 40);
    if (seen.has(adm.toLowerCase())) { problems.push(`Row ${line}: ${adm} appears twice in the file.`); continue; }
    seen.add(adm.toLowerCase());
    const [dup] = await sql`SELECT 1 FROM students WHERE school_id = ${me.schoolId} AND lower(admission_no) = ${adm.toLowerCase()}`;
    if (dup) { problems.push(`Row ${line}: ${adm} already exists.`); continue; }
    let cls = null as (typeof classes)[number] | null;
    if (r.class) { cls = byLabel.get(key(r.class)) ?? null; if (!cls) { problems.push(`Row ${line}: class "${r.class}" was not found.`); continue; } }
    const dob = r.date_of_birth ? ymdOf(r.date_of_birth) : "";
    if (r.date_of_birth && !dob) { problems.push(`Row ${line}: date of birth "${r.date_of_birth}" is not valid (use YYYY-MM-DD).`); continue; }
    const email = r.guardian_email.toLowerCase();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { problems.push(`Row ${line}: guardian email is not valid.`); continue; }
    const code = await newAccessCode();
    const [s] = await sql`INSERT INTO students (school_id, admission_no, first_name, middle_name, last_name, dob, gender, class_id, department_id, guardian_name, guardian_phone, guardian_email, admission_year, code_hash, code_enc)
      VALUES (${me.schoolId}, ${adm}, ${r.first_name.slice(0, 80)}, ${r.middle_name.slice(0, 80) || null}, ${r.last_name.slice(0, 80)}, ${dob || null}, ${r.gender.slice(0, 12) || null}, ${cls?.id ?? null}, ${cls?.department_id ?? null},
        ${r.guardian_name.slice(0, 120) || null}, ${r.guardian_phone.slice(0, 30) || null}, ${email || null}, ${new Date().getFullYear()}, ${code.hash}, ${code.enc}) RETURNING id`;
    await sql`INSERT INTO student_history (school_id, student_id, action, to_class_id, to_department_id, by_user, remarks) VALUES (${me.schoolId}, ${s.id}, 'enrol', ${cls?.id ?? null}, ${cls?.department_id ?? null}, ${me.id}, 'Bulk import')`;
    added++;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "student.import", entity: "student", meta: { added, skipped: problems.length } });
  revalidatePath("/portal/students");
  const head = `${added} student${added === 1 ? "" : "s"} added with access codes.`;
  if (problems.length) return { error: `${head} ${problems.length} row${problems.length === 1 ? "" : "s"} skipped: ${problems.slice(0, 8).join(" ")}${problems.length > 8 ? " …" : ""}` };
  return { ok: head };
}
