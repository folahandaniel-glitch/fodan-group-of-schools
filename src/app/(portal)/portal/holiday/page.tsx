import Link from "next/link";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { LEVEL_OPTIONS, TERM_NAMES, levelName, visibleLevels } from "@/lib/curriculum";
import { Badge, Card, Empty, Field, PageHeader, TextArea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { createProgramme, enrol, unenrol } from "./actions";

export const metadata = { title: "Holiday hub" };
export const dynamic = "force-dynamic";

const naira = (n: number | string) => (Number(n) === 0 ? "Free" : `₦${Number(n).toLocaleString("en-NG")}`);
const d = (v: unknown) => new Date(v as string).toLocaleDateString("en-GB");
type Row = Record<string, any>;

export default async function Holiday() {
  const me = await requireMe();
  const manage = can(me, "holiday:manage");
  const learner = me.role === "student" || me.role === "parent";
  const S = me.schoolId;

  if (manage) {
    const progs: Row[] = await sql`SELECT p.*, (SELECT count(*)::int FROM holiday_sessions s WHERE s.programme_id = p.id) AS sessions,
      (SELECT count(*)::int FROM holiday_enrolments e WHERE e.programme_id = p.id) AS enrolled FROM holiday_programmes p WHERE p.school_id = ${S} ORDER BY p.starts_on DESC LIMIT 100`;
    const subjects: Row[] = await sql`SELECT DISTINCT subject FROM curriculum_topics WHERE school_id = ${S} ORDER BY subject`;
    return (
      <>
        <PageHeader title="Holiday hub" sub="Run paid or free holiday coaching. Sessions come from the scheme of work; parents enrol and, once paid, the lessons unlock." />
        <Card className="mb-6"><h2 className="text-xl">New programme</h2>
          <ActionForm action={createProgramme} submit="Create programme" className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2"><Field label="Title" name="title" required placeholder="Easter Mathematics Coaching" /></div>
            <div className="field"><label htmlFor="lv">Class</label><select id="lv" name="level" className="select" defaultValue="7">{LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div className="field"><label htmlFor="sj">Subject (from the scheme of work)</label><input id="sj" name="subject" list="subjects" className="input" /><datalist id="subjects">{subjects.map((s) => <option key={s.subject} value={s.subject} />)}</datalist></div>
            <div className="field"><label htmlFor="tm">Term</label><select id="tm" name="term" className="select"><option value="">—</option>{TERM_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select></div>
            <Field label="Fee (₦, 0 = free)" name="fee" type="number" defaultValue={0} />
            <Field label="Starts" name="starts" type="date" required /><Field label="Ends" name="ends" type="date" required /><Field label="Places (blank = unlimited)" name="capacity" type="number" />
            <div className="sm:col-span-3"><TextArea label="Or type the sessions yourself (one per line)" name="sessions" rows={3} hint="Leave blank to build sessions from the scheme of work for the subject and term above." /></div>
          </ActionForm></Card>
        {progs.length === 0 ? <Empty title="No programmes yet" /> : (
          <ul className="grid gap-3 sm:grid-cols-2">{progs.map((p) => (
            <li key={p.id}><Link href={`/portal/holiday/${p.id}`} className="card card-lift gold-top block p-4">
              <p className="font-display text-lg">{p.title} {!p.active && <Badge tone="bad">closed</Badge>}</p>
              <p className="text-sm text-muted">{levelName(p.level)} · {d(p.starts_on)} to {d(p.ends_on)}</p>
              <p className="mt-1 text-sm">{p.sessions} sessions · {p.enrolled}{p.capacity ? `/${p.capacity}` : ""} enrolled · {naira(p.fee)}</p></Link></li>))}</ul>)}
      </>
    );
  }

  const kids = await visibleLevels(me);
  const blocks = await Promise.all(kids.filter((k) => k.studentId).map(async (k) => {
    const progs: Row[] = await sql`SELECT p.*, (SELECT count(*)::int FROM holiday_enrolments e WHERE e.programme_id = p.id) AS taken,
        (SELECT id FROM holiday_enrolments e WHERE e.programme_id = p.id AND e.student_id = ${k.studentId!}) AS enrol_id,
        (SELECT paid FROM holiday_enrolments e WHERE e.programme_id = p.id AND e.student_id = ${k.studentId!}) AS paid
      FROM holiday_programmes p WHERE p.school_id = ${S} AND p.active AND p.level = ${k.level} AND p.ends_on >= current_date ORDER BY p.starts_on`;
    for (const p of progs) p.sessionRows = p.paid ? await sql`SELECT session_no, title, topic_id FROM holiday_sessions WHERE programme_id = ${p.id} ORDER BY session_no` : [];
    return { k, progs };
  }));

  return (
    <>
      <PageHeader title="Holiday hub" sub="Coaching programmes during the holidays. Enrol your child; lessons unlock once the programme is free or paid." />
      {!learner && <Empty title="Holiday programmes are managed by the school office" />}
      {learner && blocks.length === 0 && <Empty title="No child or class found">Your account is not linked to a student yet.</Empty>}
      {blocks.map(({ k, progs }) => (
        <section key={k.studentId} className="mb-8">
          {me.role === "parent" && <h2 className="mb-2 text-xl">{k.label}</h2>}
          {progs.length === 0 ? <p className="text-sm text-muted">No programmes are open for this class right now.</p> : (
            <div className="space-y-3">{progs.map((p) => {
              const full = p.capacity && p.taken >= p.capacity;
              return (
                <Card key={p.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-display text-lg">{p.title}</p><p className="text-sm text-muted">{d(p.starts_on)} to {d(p.ends_on)} · {naira(p.fee)}</p></div>
                    {p.enrol_id ? (
                      <div className="flex items-center gap-2">{p.paid ? <Badge tone="ok">Enrolled</Badge> : <Badge tone="warn">Awaiting payment</Badge>}
                        {!p.paid && <form action={unenrol}><input type="hidden" name="id" value={p.enrol_id} /><button className="btn btn-ghost btn-sm">Cancel</button></form>}</div>
                    ) : full ? <Badge tone="bad">Full</Badge> : (
                      <form action={enrol}><input type="hidden" name="programme" value={p.id} /><input type="hidden" name="student" value={k.studentId} /><button className="btn btn-primary btn-sm">Enrol</button></form>)}
                  </div>
                  {p.enrol_id && !p.paid && <p className="mt-2 text-sm text-muted">Pay {naira(p.fee)} at the school office. Once the bursar confirms, the sessions unlock.</p>}
                  {p.paid && (
                    <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">{p.sessionRows.map((s: Row) => <li key={s.session_no}>{s.topic_id ? <Link className="font-bold text-royal" href={`/portal/study/topic/${s.topic_id}`}>{s.title}</Link> : s.title}</li>)}</ol>)}
                </Card>);
            })}</div>)}
        </section>))}
    </>
  );
}
