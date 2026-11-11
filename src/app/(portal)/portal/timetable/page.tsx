import Link from "next/link";
import { requireMe, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses, listStaff, listSubjects, str } from "@/lib/data";
import { childIds, isClassTeacherOf, periodWindow, studentOf, watToday, wideScope } from "@/lib/scope";
import { getSetting } from "@/lib/settings";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { publishTimetable, registerPeriod, saveTimetable } from "./actions";

export const metadata = { title: "Timetable" };
export const dynamic = "force-dynamic";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
type Row = Record<string, any>;

export default async function Timetable({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  if (!can(me, "timetable:view") && !can(me, "timetable:edit")) return <Empty title="Not permitted" />;
  const sp = await searchParams;
  const periods = (await getSetting<{ n: number; label: string }[]>("periods")) ?? [];
  const learner = me.role === "student" || me.role === "parent";
  const wide = wideScope(me);
  const manager = !learner && (wide || can(me, "attendance:manage") || can(me, "hrm:manage"));
  const [{ n: teaches }] = learner ? [{ n: 0 }] : await sql`SELECT count(*)::int AS n FROM timetable_slots WHERE teacher_id = ${me.id}`;
  const view = str(sp.view) === "mine" && !learner ? "mine" : str(sp.view) === "log" && manager ? "log" : "class";

  const tabs = !learner && (
    <nav className="mb-5 flex flex-wrap gap-2" aria-label="Timetable views">
      <Link href="/portal/timetable" className={`badge text-sm ${view === "class" ? "badge-info" : ""}`}>Class timetable</Link>
      {teaches > 0 && <Link href="/portal/timetable?view=mine" className={`badge text-sm ${view === "mine" ? "badge-info" : ""}`}>My periods today</Link>}
      {manager && <Link href="/portal/timetable?view=log" className={`badge text-sm ${view === "log" ? "badge-info" : ""}`}>Period register log</Link>}
    </nav>
  );

  if (view === "mine") {
    const now = watToday();
    const mine: Row[] = await sql`SELECT t.id, t.period, t.room, c.name, c.arm, s.name AS subject, r.registered_at, r.status
      FROM timetable_slots t JOIN classes c ON c.id = t.class_id LEFT JOIN subjects s ON s.id = t.subject_id
      LEFT JOIN period_registers r ON r.class_id = t.class_id AND r.day = ${now.day} AND r.period = t.period
      WHERE t.teacher_id = ${me.id} AND t.school_id = ${me.schoolId} AND t.day = ${now.dow} AND t.published ORDER BY t.period`;
    const week: Row[] = await sql`SELECT t.day, t.period, c.name, c.arm, s.name AS subject FROM timetable_slots t JOIN classes c ON c.id = t.class_id LEFT JOIN subjects s ON s.id = t.subject_id
      WHERE t.teacher_id = ${me.id} AND t.school_id = ${me.schoolId} AND t.published ORDER BY t.day, t.period`;
    const label = (p: number) => periods.find((x) => x.n === p)?.label ?? "";
    return (
      <>
        <PageHeader title="Timetable" sub="Register each period you teach, at its timetabled time. This is your teaching attendance." />
        {tabs}
        <Card><h2 className="text-xl">Today · {now.dow < 5 ? DAYS[now.dow] : "Weekend"}</h2>
          {mine.length === 0 ? <p className="mt-2 text-sm text-muted">No periods assigned to you today.</p> : (
            <ul className="mt-3 divide-y divide-line">{mine.map((p) => {
              const w = periodWindow(label(p.period));
              const open = !w || now.minutes >= w.start - 10;
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span><span className="font-bold">Period {p.period}</span> <span className="text-sm text-muted">{label(p.period)}</span><br />{p.subject} · {p.name}{p.arm} {p.room ? `· ${p.room}` : ""}</span>
                  {p.registered_at ? <Badge tone={p.status === "late" ? "warn" : "ok"}>Registered {new Date(p.registered_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" })}{p.status === "late" ? " (late)" : ""}</Badge>
                    : open ? <ActionForm action={registerPeriod} submit="Register this period" small className="flex items-center gap-2"><input type="hidden" name="slot" value={p.id} /></ActionForm>
                    : <Badge>Opens 10 min before</Badge>}
                </li>);
            })}</ul>)}
        </Card>
        <Card className="mt-5"><h2 className="text-xl">My week</h2>
          {week.length === 0 ? <p className="mt-2 text-sm text-muted">Nothing published yet.</p> : (
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">{week.map((w, i) => <li key={i}><strong>{DAYS[w.day]}</strong> · P{w.period} · {w.subject} · {w.name}{w.arm}</li>)}</ul>)}
        </Card>
      </>
    );
  }

  if (view === "log") {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(str(sp.date)) ? str(sp.date) : watToday().day;
    const dow = (new Date(date + "T00:00:00Z").getUTCDay() + 6) % 7;
    const rows: Row[] = dow > 4 ? [] : await sql`SELECT t.period, c.name, c.arm, s.name AS subject, u.first_name || ' ' || u.last_name AS teacher, r.registered_at, r.status
      FROM timetable_slots t JOIN classes c ON c.id = t.class_id LEFT JOIN subjects s ON s.id = t.subject_id LEFT JOIN users u ON u.id = t.teacher_id
      LEFT JOIN period_registers r ON r.class_id = t.class_id AND r.day = ${date} AND r.period = t.period
      WHERE t.school_id = ${me.schoolId} AND t.day = ${dow} AND t.published AND t.teacher_id IS NOT NULL ORDER BY t.period, c.name`;
    const taught = rows.filter((r) => r.registered_at).length;
    return (
      <>
        <PageHeader title="Timetable" sub="Who registered the periods they were timetabled to teach."
          actions={can(me, "reports:export") || wide ? <a className="btn btn-ghost btn-sm" href="/portal/export/period-registers">Download Excel</a> : undefined} />
        {tabs}
        <Card className="mb-4"><form className="flex flex-wrap items-end gap-3" role="search"><input type="hidden" name="view" value="log" />
          <div className="field"><label htmlFor="date">Date</label><input id="date" name="date" type="date" defaultValue={date} className="input" /></div><button className="btn btn-primary">Show</button></form></Card>
        <Card pad={false} className="overflow-x-auto">
          {rows.length === 0 ? <div className="p-5"><Empty title="No timetabled periods on this day" /></div> : (
            <table className="tbl text-sm"><thead><tr><th>Period</th><th>Class</th><th>Subject</th><th>Teacher</th><th>Register</th></tr></thead>
              <tbody>{rows.map((r, i) => (
                <tr key={i}><td>{r.period}</td><td>{r.name}{r.arm}</td><td>{r.subject}</td><td>{r.teacher}</td>
                  <td>{r.registered_at ? <Badge tone={r.status === "late" ? "warn" : "ok"}>{new Date(r.registered_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" })}{r.status === "late" ? " late" : ""}</Badge> : <Badge tone="bad">Not registered</Badge>}</td></tr>))}</tbody></table>)}
        </Card>
        {rows.length > 0 && <p className="mt-3 text-sm text-muted">{taught} of {rows.length} periods registered.</p>}
      </>
    );
  }

  const edit = can(me, "timetable:edit");
  let classId = str(sp.class);
  if (me.role === "student") classId = (await studentOf(me.id))?.class_id ?? "";
  if (me.role === "parent") {
    const kids = await childIds(me.id);
    const cls = kids.length ? await sql`SELECT DISTINCT class_id FROM students WHERE id = ANY(${kids}) AND class_id IS NOT NULL` : [];
    if (!cls.some((c) => c.class_id === classId)) classId = cls[0]?.class_id ?? "";
  }
  const all = learner ? [] : await listClasses(me.schoolId);
  const led = (await sql`SELECT id FROM classes WHERE class_teacher_id = ${me.id} AND NOT archived`).map((r) => r.id as string);
  const classes = wide || learner ? all : all.filter((c) => led.includes(c.id) || true);
  if (!classId && !learner && !wide && led.length) classId = led[0];
  const canEditThis = edit && !learner && classId !== "" && (wide || (await isClassTeacherOf(me.id, classId)));
  const [subjects, staff] = await Promise.all([listSubjects(me.schoolId), listStaff(me.schoolId)]);
  const slots: Row[] = classId ? await sql`SELECT t.day, t.period, t.subject_id, t.teacher_id, t.room, t.published, s.name AS subject, u.first_name || ' ' || u.last_name AS teacher
                                    FROM timetable_slots t LEFT JOIN subjects s ON s.id = t.subject_id LEFT JOIN users u ON u.id = t.teacher_id
                                    WHERE t.class_id = ${classId} AND t.school_id = ${me.schoolId}` : [];
  const visible = learner ? slots.filter((s) => s.published) : slots;
  const at = (d: number, p: number) => visible.find((s) => s.day === d && s.period === p);
  const published = slots.length > 0 && slots.every((s) => s.published);
  const draft = slots.length > 0 && slots.some((s) => !s.published);

  return (
    <>
      <PageHeader title="Timetable" sub={learner ? "Your class timetable." : "Class teachers draft the timetable of their class; a school leader publishes it. A teacher cannot be in two classes at the same time."} />
      {tabs}
      {!learner && (
        <Card className="mb-5">
          <form className="flex flex-wrap items-end gap-3" role="search">
            <div className="field min-w-[14rem]"><label htmlFor="class">Class</label>
              <select id="class" name="class" className="select" defaultValue={classId}><option value="">Select a class…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}{led.includes(c.id) ? " (my class)" : ""}</option>)}</select></div>
            <button className="btn btn-primary">Open</button>
          </form>
        </Card>
      )}
      {!classId ? <Empty title="Choose a class" /> : canEditThis ? (
        <>
          {draft && <p className="mb-3"><Badge tone="warn">Draft: not yet visible to students and parents</Badge></p>}
          <ActionForm action={saveTimetable} submit={can(me, "timetable:publish") ? "Save timetable" : "Save draft"} className="grid gap-3">
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
      ) : visible.length === 0 ? <Empty title={learner ? "No timetable published yet" : "Nothing timetabled yet"} /> : (
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
