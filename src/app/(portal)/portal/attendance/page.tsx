import { requireMe, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses, str } from "@/lib/data";
import { canSeeStudent, childIds, studentOf, teacherClassIds, wideScope } from "@/lib/scope";
import { Badge, Card, Empty, PageHeader, statusTone } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { markStaffAttendance, markStudentAttendance } from "./actions";

export const metadata = { title: "Attendance" };

export default async function Attendance({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  if (!can(me, "attendance:view")) return <Empty title="Not permitted" />;
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  // Learners and parents: summary + recent days per child.
  if (me.role === "student" || me.role === "parent") {
    let ids: string[] = [];
    if (me.role === "student") ids = [(await studentOf(me.id))?.id ?? ""];
    else { const kids = await childIds(me.id); const want = str(sp.student); ids = want && kids.includes(want) ? [want] : kids; }
    const out = [];
    for (const id of ids.filter(Boolean)) {
      if (!(await canSeeStudent(me, id))) continue;
      const [s] = await sql`SELECT first_name, last_name FROM students WHERE id = ${id}`;
      const recent = await sql`SELECT day, status FROM attendance WHERE kind = 'student' AND subject_ref = ${id} ORDER BY day DESC LIMIT 30`;
      out.push({ s, recent });
    }
    return (
      <>
        <PageHeader title="Attendance" />
        {out.length === 0 ? <Empty title="No attendance recorded yet" /> : out.map(({ s, recent }, i) => {
          const present = recent.filter((r) => r.status === "present" || r.status === "late").length;
          return (
            <Card key={i} className="mb-4">
              <h2 className="text-xl">{s.first_name} {s.last_name}</h2>
              <p className="text-sm text-muted">{recent.length ? `${present} of the last ${recent.length} recorded days present or late` : "No days recorded."}</p>
              <ul className="mt-3 flex flex-wrap gap-2">{recent.map((r) => <li key={String(r.day)}><Badge tone={statusTone(r.status)}>{new Date(r.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {r.status}</Badge></li>)}</ul>
            </Card>
          );
        })}
      </>
    );
  }

  const day = /^\d{4}-\d{2}-\d{2}$/.test(str(sp.day)) ? str(sp.day) : today;
  const scoped = wideScope(me) ? null : await teacherClassIds(me.id);
  const classes = await listClasses(me.schoolId, scoped ? { ids: scoped } : {});
  const classId = str(sp.class);
  const kids = classId && classes.some((c) => c.id === classId)
    ? await sql`SELECT s.id, s.first_name, s.last_name, a.status FROM students s LEFT JOIN attendance a ON a.subject_ref = s.id AND a.kind = 'student' AND a.day = ${day}
                WHERE s.class_id = ${classId} AND s.status IN ('active','enrolled') ORDER BY s.last_name, s.first_name` : [];
  const showStaff = str(sp.mode) === "staff" && (can(me, "attendance:edit") || can(me, "attendance:manage"));
  const staff = showStaff ? await sql`SELECT u.id, u.first_name, u.last_name, a.status FROM users u LEFT JOIN attendance a ON a.subject_ref = u.id AND a.kind = 'staff' AND a.day = ${day}
                                      WHERE u.school_id = ${me.schoolId} AND u.role NOT IN ('student','parent') AND u.status = 'active' ORDER BY u.last_name` : [];
  const opt = (name: string, current: string | null, list: string[]) => (
    <fieldset className="flex gap-1">
      <legend className="sr-only">Status</legend>
      {list.map((s) => (
        <label key={s} className="cursor-pointer"><input type="radio" name={name} value={s} defaultChecked={(current ?? "present") === s} className="peer sr-only" />
          <span className="badge peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 capitalize">{s}</span></label>
      ))}
    </fieldset>
  );
  return (
    <>
      <PageHeader title="Attendance" sub="Mark the register for a class or for staff." />
      <Card className="mb-5">
        <form className="flex flex-wrap items-end gap-3" role="search">
          <div className="field"><label htmlFor="mode">Register</label><select id="mode" name="mode" className="select" defaultValue={showStaff ? "staff" : "students"}><option value="students">Students</option>{(can(me, "attendance:edit") || can(me, "attendance:manage")) && <option value="staff">Staff</option>}</select></div>
          <div className="field min-w-[12rem]"><label htmlFor="class">Class</label><select id="class" name="class" className="select" defaultValue={classId}><option value="">Select…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
          <div className="field"><label htmlFor="day">Date</label><input id="day" name="day" type="date" defaultValue={day} max={today} className="input" /></div>
          <button className="btn btn-primary">Open</button>
        </form>
      </Card>
      {showStaff ? (
        <ActionForm action={markStaffAttendance} submit="Save staff register">
          <input type="hidden" name="day" value={day} />
          <div className="card divide-y divide-line">{staff.map((s) => <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"><span className="font-semibold">{s.last_name}, {s.first_name}</span>{opt(`a_${s.id}`, s.status, ["present", "late", "absent", "leave"])}</div>)}</div>
        </ActionForm>
      ) : kids.length === 0 ? <Empty title="Choose a class to mark the register" /> : (
        <ActionForm action={markStudentAttendance} submit="Save register">
          <input type="hidden" name="classId" value={classId} /><input type="hidden" name="day" value={day} />
          <div className="card divide-y divide-line">{kids.map((s) => <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"><span className="font-semibold">{s.last_name}, {s.first_name}</span>{opt(`a_${s.id}`, s.status, ["present", "late", "absent", "excused"])}</div>)}</div>
        </ActionForm>
      )}
    </>
  );
}
