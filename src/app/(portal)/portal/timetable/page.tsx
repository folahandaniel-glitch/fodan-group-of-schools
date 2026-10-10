import { requireMe, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses, listStaff, listSubjects, str } from "@/lib/data";
import { childIds, studentOf } from "@/lib/scope";
import { getSetting } from "@/lib/settings";
import { Card, Empty, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { publishTimetable, saveTimetable } from "./actions";

export const metadata = { title: "Timetable" };
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default async function Timetable({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  if (!can(me, "timetable:view")) return <Empty title="Not permitted" />;
  const sp = await searchParams;
  const periods = (await getSetting<{ n: number; label: string }[]>("periods")) ?? [];
  const learner = me.role === "student" || me.role === "parent";
  const edit = can(me, "timetable:edit");

  let classId = str(sp.class);
  if (me.role === "student") classId = (await studentOf(me.id))?.class_id ?? "";
  if (me.role === "parent") {
    const kids = await childIds(me.id);
    const cls = kids.length ? await sql`SELECT DISTINCT class_id FROM students WHERE id = ANY(${kids}) AND class_id IS NOT NULL` : [];
    if (!cls.some((c) => c.class_id === classId)) classId = cls[0]?.class_id ?? "";
  }
  const classes = learner ? [] : await listClasses(me.schoolId);
  const [subjects, staff] = await Promise.all([listSubjects(me.schoolId), listStaff(me.schoolId)]);
  const slots = classId ? await sql`SELECT t.day, t.period, t.subject_id, t.teacher_id, t.room, t.published, s.name AS subject, u.first_name || ' ' || u.last_name AS teacher
                                    FROM timetable_slots t LEFT JOIN subjects s ON s.id = t.subject_id LEFT JOIN users u ON u.id = t.teacher_id
                                    WHERE t.class_id = ${classId} AND t.school_id = ${me.schoolId}` : [];
  const visible = learner ? slots.filter((s) => s.published) : slots;
  const at = (d: number, p: number) => visible.find((s) => s.day === d && s.period === p);
  const published = slots.length > 0 && slots.every((s) => s.published);

  return (
    <>
      <PageHeader title="Timetable" sub={learner ? "Your class timetable." : "Build the class timetable. Teachers cannot be placed in two classes at the same time."} />
      {!learner && (
        <Card className="mb-5">
          <form className="flex flex-wrap items-end gap-3" role="search">
            <div className="field min-w-[14rem]"><label htmlFor="class">Class</label>
              <select id="class" name="class" className="select" defaultValue={classId}><option value="">Select a class…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
            <button className="btn btn-primary">Open</button>
          </form>
        </Card>
      )}
      {!classId ? <Empty title="Choose a class" /> : edit && !learner ? (
        <>
          <ActionForm action={saveTimetable} submit="Save timetable" className="grid gap-3">
            <input type="hidden" name="classId" value={classId} />
            <div className="card overflow-x-auto">
              <table className="tbl text-xs">
                <thead><tr><th>Period</th>{DAYS.map((d) => <th key={d}>{d}</th>)}</tr></thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.n}>
                      <td className="whitespace-nowrap font-bold">{p.n}<br /><span className="font-normal text-muted">{p.label}</span></td>
                      {DAYS.map((_, d) => {
                        const s = at(d, p.n);
                        return (
                          <td key={d} className="min-w-[9rem]">
                            <select name={`s_${d}_${p.n}`} defaultValue={s?.subject_id ?? ""} className="select !min-h-8 !py-1 text-xs" aria-label={`Subject, ${DAYS[d]} period ${p.n}`}>
                              <option value="">—</option>{subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                            <select name={`t_${d}_${p.n}`} defaultValue={s?.teacher_id ?? ""} className="select mt-1 !min-h-8 !py-1 text-xs" aria-label={`Teacher, ${DAYS[d]} period ${p.n}`}>
                              <option value="">Teacher…</option>{staff.map((x) => <option key={x.id} value={x.id}>{x.last_name} {x.first_name[0]}.</option>)}</select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ActionForm>
          {can(me, "timetable:publish") && (
            <form action={publishTimetable} className="mt-3"><input type="hidden" name="classId" value={classId} /><input type="hidden" name="publish" value={published ? "0" : "1"} />
              <button className="btn btn-gold">{published ? "Unpublish timetable" : "Publish timetable to students & parents"}</button></form>
          )}
        </>
      ) : visible.length === 0 ? <Empty title="No timetable published yet" /> : (
        <div className="card overflow-x-auto">
          <table className="tbl text-sm">
            <thead><tr><th>Period</th>{DAYS.map((d) => <th key={d}>{d}</th>)}</tr></thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.n}><td className="whitespace-nowrap font-bold">{p.n}<br /><span className="font-normal text-muted">{p.label}</span></td>
                  {DAYS.map((_, d) => { const s = at(d, p.n); return <td key={d}>{s ? <><b>{s.subject}</b><br /><span className="text-xs text-muted">{s.teacher}{s.room ? ` · ${s.room}` : ""}</span></> : "—"}</td>; })}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
