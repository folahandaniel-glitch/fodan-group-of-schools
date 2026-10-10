import Link from "next/link";
import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses, opts, pageParams, str } from "@/lib/data";
import { teacherClassIds, wideScope } from "@/lib/scope";
import { Badge, Card, Empty, Field, PageHeader, Pager, Select, statusTone } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { enrolStudent } from "./actions";
import { classLabel } from "@/lib/settings";

export const metadata = { title: "Students" };

export default async function Students({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("students:view");
  const sp = await searchParams;
  const q = str(sp.q).trim();
  const classId = str(sp.class);
  const status = str(sp.status);
  const linksPending = str(sp.links) === "pending";
  const { page, size, offset } = pageParams(sp);
  const scoped = wideScope(me) ? null : await teacherClassIds(me.id);
  const classes = await listClasses(me.schoolId, scoped ? { ids: scoped } : {});

  const where = sql`s.school_id = ${me.schoolId}
    ${scoped ? sql`AND s.class_id = ANY(${scoped})` : sql``}
    ${classId ? sql`AND s.class_id = ${classId}` : sql``}
    ${status ? sql`AND s.status = ${status}` : sql``}
    ${q ? sql`AND (s.first_name ILIKE ${"%" + q + "%"} OR s.last_name ILIKE ${"%" + q + "%"} OR s.admission_no ILIKE ${"%" + q + "%"})` : sql``}
    ${linksPending ? sql`AND EXISTS (SELECT 1 FROM parent_links l WHERE l.student_id = s.id AND l.status = 'pending')` : sql``}`;
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM students s WHERE ${where}`;
  const rows = await sql`
    SELECT s.id, s.first_name, s.last_name, s.admission_no, s.status, s.code_status, s.user_id, c.name AS class_name, c.arm, d.name AS dept
    FROM students s LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN departments d ON d.id = c.department_id
    WHERE ${where} ORDER BY s.last_name, s.first_name LIMIT ${size} OFFSET ${offset}`;
  const base = `/portal/students?q=${encodeURIComponent(q)}&class=${classId}&status=${status}${linksPending ? "&links=pending" : ""}`;

  return (
    <>
      <PageHeader title="Students" sub={`${n} record${n === 1 ? "" : "s"}`}
        actions={can(me, "students:export") && <a className="btn btn-ghost" href={`/portal/export/students?class=${classId}&status=${status}`}>Export CSV</a>} />
      <Card className="mb-5">
        <form className="grid gap-3 sm:grid-cols-[1fr_200px_160px_auto]" role="search">
          <input name="q" defaultValue={q} className="input" placeholder="Search name or admission number" aria-label="Search students" />
          <select name="class" defaultValue={classId} className="select" aria-label="Class"><option value="">All classes</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
          <select name="status" defaultValue={status} className="select" aria-label="Status"><option value="">Any status</option>
            {["enrolled", "active", "graduated", "withdrawn", "transferred", "archived"].map((s) => <option key={s}>{s}</option>)}</select>
          <button className="btn btn-primary">Filter</button>
        </form>
      </Card>

      {can(me, "students:create") && (
        <details className="card card-pad mb-5">
          <summary className="cursor-pointer font-display text-lg">Enrol a new student</summary>
          <p className="mt-1 text-sm text-muted">A unique access code is generated for the student. They use it to activate their account.</p>
          <div className="mt-4">
            <ActionForm action={enrolStudent} submit="Enrol and generate access code" className="grid gap-4 sm:grid-cols-3">
              <Field label="First name" name="firstName" required />
              <Field label="Last name" name="lastName" required />
              <Field label="Middle name" name="middleName" />
              <Field label="Admission number" name="admissionNo" required />
              <Field label="Date of birth" name="dob" type="date" hint="Used to verify parents who link this student." />
              <Select label="Gender" name="gender" options={[{ value: "Female", label: "Female" }, { value: "Male", label: "Male" }]} />
              <Select label="Class" name="classId" options={opts(classes, (c) => c.label)} />
              <Field label="Parent / guardian name" name="guardianName" />
              <Field label="Parent / guardian phone" name="guardianPhone" type="tel" />
              <Field label="Parent / guardian email" name="guardianEmail" type="email" hint="A parent using this email is linked automatically." />
            </ActionForm>
          </div>
        </details>
      )}

      {rows.length === 0 ? <Empty title="No students found">Adjust the filters or enrol a student.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Admission no.</th><th>Class</th><th>Account</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td><Link className="font-bold text-royal hover:underline" href={`/portal/students/${s.id}`}>{s.last_name}, {s.first_name}</Link></td>
                  <td>{s.admission_no}</td>
                  <td>{s.class_name ? classLabel({ name: s.class_name, arm: s.arm, department: s.dept }) : "—"}</td>
                  <td><Badge tone={s.user_id ? "ok" : "warn"}>{s.user_id ? "Activated" : "Not activated"}</Badge></td>
                  <td><Badge tone={statusTone(s.status)}>{s.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pages={Math.ceil(n / size)} base={base} />
    </>
  );
}
