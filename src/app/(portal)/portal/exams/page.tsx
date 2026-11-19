import Link from "next/link";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses, listSubjects, str } from "@/lib/data";
import { childIds, studentOf } from "@/lib/scope";
import { Badge, Card, Empty, Field, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { PrintButton } from "@/components/print-button";
import { addMin } from "@/lib/logic/exam-tt";
import { addSlot, deleteSlot, generateTimetable, loadTermAssessments, publishTimetable, uploadTimetable } from "./actions";

export const metadata = { title: "Exam timetable" };
export const dynamic = "force-dynamic";
type Row = Record<string, any>;
const dlabel = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export default async function Exams({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  const sp = await searchParams;
  const manage = can(me, "exams:manage");
  const learner = me.role === "student" || me.role === "parent";
  const S = me.schoolId;
  const tts: Row[] = await sql`SELECT id, name, kind, start_date::text AS s, end_date::text AS e, status, file_id, (SELECT count(*)::int FROM exam_slots x WHERE x.timetable_id = t.id) AS n
    FROM exam_timetables t WHERE school_id = ${S} ${manage ? sql`` : sql`AND status = 'published'`} ORDER BY created_at DESC LIMIT 30`;
  const sel = tts.find((t) => t.id === str(sp.tt)) ?? tts[0];
  let myClasses: string[] | null = null;
  if (me.role === "student") { const st = await studentOf(me.id); myClasses = st?.class_id ? [st.class_id as string] : []; }
  if (me.role === "parent") { const ids = await childIds(me.id); myClasses = ids.length ? (await sql`SELECT DISTINCT class_id FROM students WHERE id = ANY(${ids}) AND class_id IS NOT NULL`).map((r) => r.class_id as string) : []; }
  const classes = await listClasses(S);
  const subjects = manage ? await listSubjects(S) : [];
  const cf = str(sp.c);
  const slots: Row[] = sel ? await sql`SELECT sl.id, sl.class_id, sl.day::text AS day, sl.start_time, sl.duration_min, s.name AS subject, c.name AS cname, c.arm
    FROM exam_slots sl JOIN subjects s ON s.id = sl.subject_id JOIN classes c ON c.id = sl.class_id
    WHERE sl.timetable_id = ${sel.id} ${myClasses ? sql`AND sl.class_id = ANY(${myClasses})` : /^[0-9a-f-]{36}$/i.test(cf) ? sql`AND sl.class_id = ${cf}` : sql``}
    ORDER BY c.level, c.arm, sl.day, sl.start_time LIMIT 800` : [];
  const byClass = new Map<string, Row[]>();
  for (const s of slots) byClass.set(`${s.cname}${s.arm ?? ""}`, [...(byClass.get(`${s.cname}${s.arm ?? ""}`) ?? []), s]);
  const q = (o: Record<string, string>) => `/portal/exams?${new URLSearchParams({ ...(sel ? { tt: sel.id } : {}), ...(cf ? { c: cf } : {}), ...o })}`;

  return (
    <>
      <PageHeader title="Exam timetable" sub="When each CA test and terminal exam holds. Exam times and duration follow this timetable." actions={manage && <Link href="/portal/exams/integrity" className="btn btn-ghost">Integrity & make-ups</Link>} />

      {manage && <Card className="mb-5"><h2 className="text-xl">Standard questions</h2><p className="mt-1 text-sm text-muted">Create this term's CA test (20 questions, weeks 1 to 7) and terminal exam (40 questions, weeks 1 to 13) for every class and subject, built from the scheme of work. Run it once; it skips anything already loaded.</p><ActionForm action={loadTermAssessments} submit="Load CA and exam questions" small className="mt-3"><span /></ActionForm></Card>}
      {manage && (
        <div className="mb-5 grid gap-5 lg:grid-cols-2">
          <Card><h2 className="text-xl">Generate automatically</h2>
            <p className="mt-1 text-sm text-muted">Pick the dates and start times. Every class gets its subjects with no two papers at the same time. Mathematics and English come first.</p>
            <ActionForm action={generateTimetable} submit="Generate timetable" className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Name" name="name" required placeholder="e.g. First Term Examination 2026" /></div>
              <div className="field"><label htmlFor="gk">Type</label><select id="gk" name="kind" className="select"><option value="exam">Terminal exam</option><option value="ca">CA test</option></select></div>
              <Field label="Minutes per paper" name="minutes" type="number" placeholder="90 exam / 45 CA" />
              <Field label="First day" name="start" type="date" required /><Field label="Last day" name="end" type="date" required />
              <div className="sm:col-span-2"><Field label="Start times each day" name="sessions" defaultValue="08:30, 11:00" hint="Separate with commas. Each time is one paper per class." /></div>
              <div className="field sm:col-span-2"><label>Classes</label><select name="classes" className="select" defaultValue="all"><option value="all">All classes</option><option value="pick">Only the ticked classes</option></select>
                <details className="mt-2 text-sm"><summary className="cursor-pointer font-semibold">Tick classes</summary><div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">{classes.map((c) => <label key={c.id} className="flex items-center gap-2"><input type="checkbox" name="cls" value={c.id} /> {c.label}</label>)}</div></details></div>
            </ActionForm></Card>
          <Card><h2 className="text-xl">Upload a timetable you already have</h2>
            <p className="mt-1 text-sm text-muted">A PDF or picture. It is published straight away for everyone to open.</p>
            <ActionForm action={uploadTimetable} submit="Upload and publish" encType="multipart/form-data" className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Name" name="name" required /></div>
              <div className="field"><label htmlFor="uk">Type</label><select id="uk" name="kind" className="select"><option value="exam">Terminal exam</option><option value="ca">CA test</option></select></div><div />
              <Field label="First day" name="start" type="date" required /><Field label="Last day" name="end" type="date" required />
              <div className="field sm:col-span-2"><label htmlFor="uf">File (PDF, PNG, JPG)</label><input id="uf" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="input" required /></div>
            </ActionForm></Card>
        </div>
      )}

      {tts.length === 0 ? <Empty title="No exam timetable yet">{manage ? "Generate one above." : "The school has not published one."}</Empty> : (
        <>
          <nav className="mb-4 flex flex-wrap gap-2" aria-label="Timetables">{tts.map((t) => <Link key={t.id} href={`/portal/exams?tt=${t.id}`} className={`badge text-sm ${sel?.id === t.id ? "badge-info" : ""}`}>{t.name} {t.status === "draft" && "(draft)"}</Link>)}</nav>
          {sel && (
            <Card className="mb-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-xl">{sel.name}</h2><p className="text-sm text-muted">{sel.kind === "ca" ? "CA test" : "Terminal exam"} · {dlabel(sel.s)} to {dlabel(sel.e)} · <Badge tone={sel.status === "published" ? "ok" : "warn"}>{sel.status}</Badge></p></div>
                <div className="no-print flex flex-wrap gap-2">
                  {sel.file_id && <a className="btn btn-gold btn-sm" href={`/api/files/${sel.file_id}`} target="_blank" rel="noopener noreferrer">Open the timetable file</a>}
                  {slots.length > 0 && <PrintButton label="Print" />}
                  {manage && <form action={publishTimetable} className="flex gap-2"><input type="hidden" name="id" value={sel.id} />
                    {sel.status === "draft" && sel.n > 0 && <button name="op" value="publish" className="btn btn-primary btn-sm">Publish</button>}
                    {sel.status === "published" && sel.n > 0 && <button name="op" value="unpublish" className="btn btn-ghost btn-sm">Unpublish</button>}
                    <button name="op" value="delete" className="btn btn-danger btn-sm">Delete</button></form>}
                </div>
              </div>
              {manage && !myClasses && <form className="no-print mt-3 flex gap-2"><input type="hidden" name="tt" value={sel.id} /><select name="c" defaultValue={cf} className="select !w-auto" aria-label="Class"><option value="">All classes</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select><button className="btn btn-ghost btn-sm">Show</button></form>}
              {slots.length === 0 ? <p className="mt-4 text-sm text-muted">{sel.file_id ? "This timetable is a file. Use the button above to open it." : "No papers yet."}</p> : (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">{[...byClass.entries()].map(([cl, rows]) => (
                  <div key={cl} className="break-inside-avoid overflow-x-auto rounded-xl border border-line"><p className="bg-paper-2 px-3 py-2 text-sm font-bold">{cl}</p>
                    <table className="tbl text-sm"><thead><tr><th>Date</th><th>Time</th><th>Subject</th>{manage && <th />}</tr></thead>
                      <tbody>{rows.map((s) => (<tr key={s.id}><td>{dlabel(String(s.day).slice(0, 10))}</td><td className="whitespace-nowrap">{s.start_time} to {addMin(s.start_time, s.duration_min)}</td><td className="font-semibold">{s.subject}</td>
                        {manage && <td><form action={deleteSlot}><input type="hidden" name="id" value={s.id} /><button className="btn btn-ghost btn-sm" aria-label="Delete paper">✕</button></form></td>}</tr>))}</tbody></table></div>))}</div>)}
            </Card>
          )}
          {manage && sel && !learner && (
            <Card><h2 className="text-xl">Draw it yourself: add a paper</h2>
              <p className="mt-1 text-sm text-muted">A paper that would overlap another paper of the same class is refused.</p>
              <ActionForm action={addSlot} submit="Add paper" className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6"><input type="hidden" name="tt" value={sel.id} />
                <div className="field"><label htmlFor="ac">Class</label><select id="ac" name="class" className="select" required><option value="">Choose…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
                <div className="field"><label htmlFor="as">Subject</label><select id="as" name="subject" className="select" required><option value="">Choose…</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <Field label="Day" name="day" type="date" required /><Field label="Start" name="start" type="time" required defaultValue="08:30" /><Field label="Minutes" name="minutes" type="number" defaultValue={sel.kind === "ca" ? "45" : "90"} />
              </ActionForm></Card>
          )}
        </>
      )}
    </>
  );
}
