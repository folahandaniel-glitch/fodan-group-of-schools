import Link from "next/link";
import { requireMe, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses, listStaff, listSubjects, str } from "@/lib/data";
import { childIds, isClassTeacherOf, studentOf, watToday, wideScope } from "@/lib/scope";
import { allSettings, currentTerm } from "@/lib/settings";
import { getSchedule } from "@/lib/schedule-server";
import { availability, maxPeriods, periodAt, timeline, type Schedule } from "@/lib/schedule";
import { PrintButton } from "@/components/print-button";
import { Badge, Card, Empty, Logo, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { publishTimetable, registerPeriod, saveTimetable } from "./actions";

export const metadata = { title: "Timetable" };
export const dynamic = "force-dynamic";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
type Row = Record<string, any>;

const TINTS = ["--color-royal", "--color-gold-2", "--color-ok", "--color-bad", "--color-warn", "--color-strong-2", "--color-gold", "--color-royal-2"];
/** Same subject, same colour, every time. */
const tintOf = (name: string | null | undefined) => {
  if (!name) return undefined;
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { background: `color-mix(in srgb, var(${TINTS[h % TINTS.length]}) 17%, var(--color-card))`, borderColor: `color-mix(in srgb, var(${TINTS[h % TINTS.length]}) 45%, transparent)` };
};
const clock = (d: unknown) => new Date(String(d)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

export default async function Timetable({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  if (!can(me, "timetable:view") && !can(me, "timetable:edit")) return <Empty title="Not permitted" />;
  const sp = await searchParams;
  const schedule = await getSchedule();
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
      {can(me, "settings:edit") && <Link href="/portal/settings?tab=periods" className="badge text-sm">Set up periods &amp; breaks ↗</Link>}
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
    return (
      <>
        <PageHeader title="Timetable" sub="Register each period you teach, at its timetabled time. This is your teaching attendance." />
        {tabs}
        <Card><h2 className="text-xl">Today · {now.dow < 5 ? DAYS[now.dow] : "Weekend"}</h2>
          {mine.length === 0 ? <p className="mt-2 text-sm text-muted">No periods assigned to you today.</p> : (
            <ul className="mt-3 divide-y divide-line">{mine.map((p) => {
              const w = periodAt(schedule, now.dow, p.period);
              const open = !w || now.minutes >= w.start - 10;
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span><span className="font-bold">Period {p.period}</span> <span className="text-sm text-muted">{w?.label ?? ""}</span><br />{p.subject} · {p.name}{p.arm} {p.room ? `· ${p.room}` : ""}</span>
                  {p.registered_at ? <Badge tone={p.status === "late" ? "warn" : "ok"}>Registered {clock(p.registered_at)}{p.status === "late" ? " (late)" : ""}</Badge>
                    : open ? <ActionForm action={registerPeriod} submit="Register this period" small className="flex items-center gap-2"><input type="hidden" name="slot" value={p.id} /></ActionForm>
                    : <Badge>Opens 10 min before</Badge>}
                </li>);
            })}</ul>)}
        </Card>
        <Card className="mt-5"><h2 className="text-xl">My week</h2>
          {week.length === 0 ? <p className="mt-2 text-sm text-muted">Nothing published yet.</p> : (
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">{week.map((w, i) => <li key={i}><strong>{DAYS[w.day]}</strong> · P{w.period} {periodAt(schedule, w.day, w.period)?.label ?? ""} · {w.subject} · {w.name}{w.arm}</li>)}</ul>)}
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
            <table className="tbl text-sm"><thead><tr><th>Period</th><th>Time</th><th>Class</th><th>Subject</th><th>Teacher</th><th>Register</th></tr></thead>
              <tbody>{rows.map((r, i) => (
                <tr key={i}><td>{r.period}</td><td>{periodAt(schedule, dow, r.period)?.label ?? ""}</td><td>{r.name}{r.arm}</td><td>{r.subject}</td><td>{r.teacher}</td>
                  <td>{r.registered_at ? <Badge tone={r.status === "late" ? "warn" : "ok"}>{clock(r.registered_at)}{r.status === "late" ? " late" : ""}</Badge> : <Badge tone="bad">Not registered</Badge>}</td></tr>))}</tbody></table>)}
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
  const classes = learner ? [] : await listClasses(me.schoolId);
  const led = (await sql`SELECT id FROM classes WHERE class_teacher_id = ${me.id} AND NOT archived`).map((r) => r.id as string);
  if (!classId && !learner && !wide && led.length) classId = led[0];
  const canEditThis = edit && !learner && classId !== "" && (wide || (await isClassTeacherOf(me.id, classId)));
  const [subjects, staff] = await Promise.all([listSubjects(me.schoolId), listStaff(me.schoolId)]);
  const slots: Row[] = classId ? await sql`SELECT t.day, t.period, t.subject_id, t.teacher_id, t.room, t.published, s.name AS subject, u.first_name || ' ' || u.last_name AS teacher
                                    FROM timetable_slots t LEFT JOIN subjects s ON s.id = t.subject_id LEFT JOIN users u ON u.id = t.teacher_id
                                    WHERE t.class_id = ${classId} AND t.school_id = ${me.schoolId}` : [];
  const visible = learner ? slots.filter((s) => s.published) : slots;
  const at = (d: number, p: number) => visible.find((s) => s.day === d && s.period === p);
  const published = slots.length > 0 && slots.every((s) => s.published);
  const brand = (await allSettings()).brand as { school: string };
  const term = await currentTerm();
  const className = classes.find((c) => c.id === classId)?.label ?? (slots[0] ? "Your class" : "");
  const draft = slots.length > 0 && slots.some((s) => !s.published);
  const dayNo = /^[0-4]$/.test(str(sp.day)) ? Number(str(sp.day)) : null;
  const dayLine = (d: number) => { const t = timeline(schedule, d); const f = t.periods[0], l = t.periods[t.periods.length - 1]; return f && l ? `${DAYS[d]}: ${String(Math.floor(f.start / 60)).padStart(2, "0")}:${String(f.start % 60).padStart(2, "0")} to ${t.close || l.label.split(" – ")[1]}` : ""; };

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
      {!classId ? <Empty title="Choose a class" /> : !canEditThis && visible.length === 0 ? <Empty title={learner ? "No timetable published yet" : "Nothing timetabled yet"} /> : (
        <>
          {canEditThis && draft && <p className="mb-3"><Badge tone="warn">Draft: not yet visible to students and parents</Badge></p>}
          {canEditThis && (
            <div className="no-print mb-5">
              <p className="mb-2 text-sm font-bold">Click a day to add its timetable</p>
              <nav className="flex flex-wrap gap-2" aria-label="Choose a day">
                {DAYS.map((d, i) => <Link key={d} href={`/portal/timetable?class=${classId}&day=${i}`} className={`btn btn-sm ${dayNo === i ? "btn-primary" : "btn-ghost"}`}>{d}</Link>)}
              </nav>
              {dayNo !== null && (() => {
                const t = timeline(schedule, dayNo);
                const rows = [...t.periods.map((p) => ({ kind: "p" as const, at: p.start, p })), ...t.breaks.map((b) => ({ kind: "b" as const, at: b.start, b }))].sort((x, y) => x.at - y.at);
                return (
                  <Card className="mt-3">
                    <h2 className="text-xl">{DAYS[dayNo]}</h2>
                    <p className="text-sm text-muted">{dayLine(dayNo)}{t.noLesson.length ? ` · no lessons in period${t.noLesson.length > 1 ? "s" : ""} ${t.noLesson.join(", ")}` : ""}. An admin sets the periods and breaks under Settings → Timetable.</p>
                    <ActionForm action={saveTimetable} submit={`Save ${DAYS[dayNo]}${can(me, "timetable:publish") ? "" : " (draft)"}`} className="mt-3 grid gap-2">
                      <input type="hidden" name="classId" value={classId} /><input type="hidden" name="day" value={dayNo} />
                      {rows.map((r) => {
                        if (r.kind === "b") return <div key={`b${r.b.start}`} className="tt-break"><div className="rounded-lg py-1 text-center text-xs font-extrabold uppercase tracking-[0.3em] text-gold">{r.b.label} · {r.b.end - r.b.start} min</div></div>;
                        const p = r.p, av = availability(schedule, dayNo, p.n), c = at(dayNo, p.n);
                        return !av.open ? (
                          <div key={p.n} className="tt-off flex items-center gap-3 rounded-xl px-3 py-2 text-sm"><b className="w-24 shrink-0">Period {p.n}</b><span className="text-muted">{p.label}</span><span className="ml-auto font-bold">{av.reason}</span></div>
                        ) : (
                          <div key={p.n} className="grid items-center gap-2 rounded-xl border border-line p-2 sm:grid-cols-[8rem_1fr_1fr_6rem]" style={tintOf(c?.subject)}>
                            <span className="text-sm"><b>Period {p.n}</b><br /><span className="text-xs text-muted">{p.label} · {p.end - p.start} min</span></span>
                            <select name={`s_${dayNo}_${p.n}`} defaultValue={c?.subject_id ?? ""} className="select" aria-label={`Subject, ${DAYS[dayNo]} period ${p.n}`}><option value="">— No lesson —</option>{subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                            <select name={`t_${dayNo}_${p.n}`} defaultValue={c?.teacher_id ?? ""} className="select" aria-label={`Teacher, ${DAYS[dayNo]} period ${p.n}`}><option value="">Teacher…</option>{staff.map((x) => <option key={x.id} value={x.id}>{x.last_name} {x.first_name[0]}.</option>)}</select>
                            <input name={`r_${dayNo}_${p.n}`} defaultValue={c?.room ?? ""} className="input" placeholder="Room" aria-label="Room" />
                          </div>);
                      })}
                    </ActionForm>
                  </Card>);
              })()}
            </div>
          )}
          <div className="tt-sheet">
            <div className="tt-head">
              <span className="rounded-xl bg-white p-1"><Logo size={44} /></span>
              <div className="min-w-0 flex-1"><p className="font-display text-xl leading-tight">{brand.school}</p>
                <p className="text-sm text-white/80">Class timetable · {className}{term ? ` · ${term.session_name} ${term.name}` : ""}</p></div>
              <span className="no-print"><PrintButton /></span>
            </div>
            <div className="overflow-x-auto p-2">
              <TimetableTable schedule={schedule} dayHref={canEditThis ? (d) => `/portal/timetable?class=${classId}&day=${d}` : undefined} activeDay={dayNo}
                cell={(d, n, label) => {
                  const av = availability(schedule, d, n);
                  if (!av.open) return <td key={d} className="tt-c tt-off">{av.reason}</td>;
                  const c = at(d, n);
                  return <td key={d} className="tt-c" style={tintOf(c?.subject)}><span className="tt-t !mt-0 !opacity-60">{label}</span>{c ? <><b>{c.subject}</b><span className="tt-t">{c.teacher}</span>{c.room && <span className="tt-room">{c.room}</span>}</> : <span className="text-muted">—</span>}</td>;
                }} />
            </div>
          </div>
          {canEditThis && can(me, "timetable:publish") && (
            <form action={publishTimetable} className="no-print mt-3"><input type="hidden" name="classId" value={classId} /><input type="hidden" name="publish" value={published ? "0" : "1"} />
              <button className="btn btn-gold">{published ? "Unpublish timetable" : "Publish timetable to students & parents"}</button></form>
          )}
        </>
      )}
    </>
  );
}

/** Period rows (1..most periods in any day). Each cell shows that weekday's own times; break rows follow the first weekday group. */
function TimetableTable({ schedule, cell, dayHref, activeDay }: { schedule: Schedule; cell: (d: number, n: number, label: string) => React.ReactNode; dayHref?: (d: number) => string; activeDay?: number | null }) {
  const rows = maxPeriods(schedule);
  const ref = timeline(schedule, 0);
  return (
    <table className="tt">
      <thead><tr><th>Period</th>{DAYS.map((d, i) => <th key={d} className="tt-day" style={activeDay === i ? { outline: "3px solid var(--color-gold-2)" } : undefined}>{dayHref ? <Link href={dayHref(i)} className="block underline-offset-4 hover:underline">{d} ✎</Link> : d}</th>)}</tr></thead>
      <tbody>
        {Array.from({ length: rows }, (_, i) => i + 1).map((n) => (
          <FragmentRows key={n}>
            <tr><td className="tt-p">{n}</td>{DAYS.map((_, d) => cell(d, n, periodAt(schedule, d, n)?.label ?? ""))}</tr>
            {ref.breaks.filter((b) => b.afterN === n).map((b) => <tr key={b.start} className="tt-break"><td colSpan={6}>{b.label} · {b.end - b.start} min</td></tr>)}
          </FragmentRows>
        ))}
      </tbody>
    </table>
  );
}
function FragmentRows({ children }: { children: React.ReactNode }) { return <>{children}</>; }
