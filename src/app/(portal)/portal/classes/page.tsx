import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses, listDepartments, listStaff, listSubjects, opts, str } from "@/lib/data";
import { Badge, Card, Field, PageHeader, Select } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { archiveClass, assignSubject, createClass, createDepartment, createSubject, removeClassSubject, renameClass, setClassTeacher, setDepartmentHead } from "./actions";

export const metadata = { title: "Classes & subjects" };

export default async function Classes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("classes:view");
  const sp = await searchParams;
  const showArchived = str(sp.archived) === "1";
  const [classes, subjects, depts, staff] = await Promise.all([
    listClasses(me.schoolId, { archived: showArchived }), listSubjects(me.schoolId), listDepartments(me.schoolId), listStaff(me.schoolId),
  ]);
  const assigned = await sql`SELECT cs.class_id, cs.subject_id, s.name AS subject, u.first_name || ' ' || u.last_name AS teacher
                             FROM class_subjects cs JOIN subjects s ON s.id = cs.subject_id LEFT JOIN users u ON u.id = cs.teacher_id
                             WHERE cs.class_id = ANY(${classes.map((c) => c.id)}) ORDER BY s.name`;
  const counts = await sql`SELECT class_id, count(*)::int AS n FROM students WHERE school_id = ${me.schoolId} AND status IN ('active','enrolled') GROUP BY class_id`;
  const nBy = new Map(counts.map((c) => [c.class_id, c.n]));
  const staffOpts = staff.map((s) => ({ value: s.id, label: `${s.last_name}, ${s.first_name}` }));
  const edit = can(me, "classes:edit"), assign = can(me, "classes:assign");

  return (
    <>
      <PageHeader title="Classes & subjects" sub="Create classes, appoint class teachers, allocate subject teachers and manage departments."
        actions={<a className="btn btn-ghost btn-sm" href={`/portal/classes?archived=${showArchived ? 0 : 1}`}>{showArchived ? "Hide archived" : "Show archived"}</a>} />

      <div className="grid gap-5 lg:grid-cols-3">
        {can(me, "classes:create") && (
          <Card><h2 className="text-lg">New class</h2>
            <div className="mt-3"><ActionForm action={createClass} submit="Create class">
              <Field label="Name" name="name" required placeholder="e.g. JSS 2" />
              <Field label="Arm / stream" name="arm" placeholder="e.g. A" />
              <Field label="Level (1–12)" name="level" type="number" min={1} max={12} required hint="Basic 1–6 = 1–6, JSS 1–3 = 7–9, SSS 1–3 = 10–12. Drives promotion." />
              <Select label="Department (SSS)" name="departmentId" options={opts(depts, (d) => d.name)} />
            </ActionForm></div></Card>
        )}
        {can(me, "subjects:create") && (
          <Card><h2 className="text-lg">New subject</h2>
            <div className="mt-3"><ActionForm action={createSubject} submit="Add subject">
              <Field label="Subject name" name="name" required />
              <Field label="Code" name="code" placeholder="e.g. MTH" />
              <Select label="Department" name="departmentId" options={opts(depts, (d) => d.name)} />
            </ActionForm></div></Card>
        )}
        {can(me, "classes:manage") && (
          <Card><h2 className="text-lg">Departments</h2>
            <ul className="mt-2 divide-y divide-line text-sm">
              {depts.map((d) => (
                <li key={d.id} className="py-2">
                  <form action={setDepartmentHead} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={d.id} />
                    <b className="w-24 shrink-0">{d.name}</b>
                    <select name="headId" defaultValue={d.head_id ?? ""} className="select !min-h-9 !py-1 text-xs" aria-label={`Head of ${d.name}`}><option value="">No HOD</option>
                      {staffOpts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
                    <button className="btn btn-ghost btn-sm">Set</button>
                  </form>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-line pt-3"><ActionForm action={createDepartment} submit="Add department" small><Field label="New department" name="name" required /></ActionForm></div>
          </Card>
        )}
      </div>

      <div className="mt-6 grid gap-4">
        {classes.map((c) => {
          const mine = assigned.filter((a) => a.class_id === c.id);
          return (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl">{c.label} {c.archived && <Badge tone="bad">archived</Badge>}</h2>
                  <p className="text-sm text-muted">{nBy.get(c.id) ?? 0} students · Class teacher: <b>{c.class_teacher ?? "Not assigned"}</b></p>
                </div>
                {can(me, "classes:archive") && (
                  <form action={archiveClass}><input type="hidden" name="id" value={c.id} />{c.archived && <input type="hidden" name="restore" value="1" />}
                    <button className="btn btn-danger btn-sm">{c.archived ? "Restore" : "Archive"}</button></form>
                )}
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  {assign && (
                    <form action={setClassTeacher} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="classId" value={c.id} />
                      <div className="field min-w-[12rem] flex-1"><label htmlFor={`ct-${c.id}`}>Class teacher</label>
                        <select id={`ct-${c.id}`} name="teacherId" defaultValue={c.class_teacher_id ?? ""} className="select"><option value="">— None —</option>
                          {staffOpts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                      <button className="btn btn-primary btn-sm">Assign / transfer</button>
                    </form>
                  )}
                  {edit && (
                    <form action={renameClass} className="mt-3 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={c.id} />
                      <div className="field"><label htmlFor={`n-${c.id}`}>Name</label><input id={`n-${c.id}`} name="name" defaultValue={c.name} className="input" /></div>
                      <div className="field w-24"><label htmlFor={`a-${c.id}`}>Arm</label><input id={`a-${c.id}`} name="arm" defaultValue={c.arm} className="input" /></div>
                      <button className="btn btn-ghost btn-sm">Rename</button>
                    </form>
                  )}
                </div>
                <div>
                  <p className="label">Subjects &amp; teachers</p>
                  <ul className="mt-1 divide-y divide-line text-sm">
                    {mine.length === 0 && <li className="py-2 text-muted">No subjects allocated.</li>}
                    {mine.map((m) => (
                      <li key={m.subject_id} className="flex items-center justify-between gap-2 py-1.5">
                        <span><b>{m.subject}</b> <span className="text-muted">— {m.teacher ?? "unassigned"}</span></span>
                        {can(me, "subjects:assign") && <form action={removeClassSubject}><input type="hidden" name="classId" value={c.id} /><input type="hidden" name="subjectId" value={m.subject_id} /><button className="btn btn-danger btn-sm" aria-label={`Remove ${m.subject}`}>×</button></form>}
                      </li>
                    ))}
                  </ul>
                  {can(me, "subjects:assign") && (
                    <form action={assignSubject} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input type="hidden" name="classId" value={c.id} />
                      <select name="subjectId" className="select" aria-label="Subject" required><option value="">Subject…</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                      <select name="teacherId" className="select" aria-label="Teacher"><option value="">Teacher…</option>{staffOpts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
                      <button className="btn btn-ghost btn-sm">Allocate</button>
                    </form>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
