import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { LEVEL_OPTIONS, TERM_NAMES, levelName, weekNo } from "@/lib/curriculum";
import { Badge, Card, Empty, Field, PageHeader, TextArea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { deleteTopic, loadScheme, reviewLesson, reviewResource, saveTopic } from "../actions";

export const metadata = { title: "Manage curriculum" };
export const dynamic = "force-dynamic";
type Row = Record<string, any>;

export default async function Manage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("curriculum:manage");
  const sp = await searchParams;
  const S = me.schoolId;
  const level = Number(str(sp.level)) || 7, term = [1, 2, 3].includes(Number(str(sp.term))) ? Number(str(sp.term)) : 1, subject = str(sp.subject);

  const counts: Row[] = await sql`SELECT level, count(*)::int AS n FROM curriculum_topics WHERE school_id = ${S} GROUP BY level ORDER BY level`;
  const subjects: Row[] = await sql`SELECT DISTINCT subject FROM curriculum_topics WHERE school_id = ${S} AND level = ${level} AND term = ${term} ORDER BY subject`;
  const topics: Row[] = subject ? await sql`SELECT * FROM curriculum_topics WHERE school_id = ${S} AND level = ${level} AND term = ${term} AND subject = ${subject}` : [];
  topics.sort((a, b) => weekNo(a.week) - weekNo(b.week));
  const pendLessons: Row[] = await sql`SELECT l.topic_id, t.topic, t.subject, t.level FROM topic_lessons l JOIN curriculum_topics t ON t.id = l.topic_id WHERE t.school_id = ${S} AND l.status = 'pending' LIMIT 30`;
  const pendRes: Row[] = await sql`SELECT r.id, r.title, r.url, r.topic_id, t.topic FROM resources r JOIN curriculum_topics t ON t.id = r.topic_id WHERE r.school_id = ${S} AND NOT r.published LIMIT 30`;
  const href = (o: Record<string, string | number>) => `/portal/study/manage?${new URLSearchParams({ level: String(level), term: String(term), ...(subject ? { subject } : {}), ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) })}`;

  return (
    <>
      <PageHeader title="Manage curriculum" sub="Load the NERDC scheme of work, then add, edit or remove topics and approve teachers' lessons and resources."
        actions={<Link href="/portal/study" className="btn btn-ghost btn-sm">← Study centre</Link>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><h2 className="text-xl">NERDC scheme of work</h2>
          <p className="mt-1 text-sm text-muted">Loads JSS 1 to SSS 3: 34 subjects, about 4,100 topics. Running it again adds only what is missing; nothing you edited is overwritten.</p>
          <p className="mt-2 text-sm">{counts.length ? counts.map((c) => `${levelName(c.level)}: ${c.n}`).join(" · ") : "Nothing loaded yet."}</p>
          <ActionForm action={loadScheme} submit="Load / refresh the scheme" className="mt-3"><span className="hint">This can take up to a minute.</span></ActionForm>
        </Card>
        <Card><h2 className="text-xl">Waiting for approval</h2>
          {pendLessons.length + pendRes.length === 0 ? <p className="mt-2 text-sm text-muted">Nothing is waiting.</p> : (
            <ul className="mt-2 divide-y divide-line text-sm">
              {pendLessons.map((l) => (
                <li key={l.topic_id} className="flex items-center justify-between gap-2 py-2"><span><Badge tone="warn">lesson</Badge> <Link className="font-bold text-royal" href={`/portal/study/topic/${l.topic_id}`}>{l.topic}</Link><br /><span className="text-xs text-muted">{levelName(l.level)} · {l.subject}</span></span>
                  <form action={reviewLesson}><input type="hidden" name="topic" value={l.topic_id} /><input type="hidden" name="op" value="approve" /><button className="btn btn-ghost btn-sm">Approve</button></form></li>))}
              {pendRes.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2"><span><Badge tone="warn">resource</Badge> <a className="font-bold text-royal" href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a><br /><span className="text-xs text-muted">{r.topic}</span></span>
                  <form action={reviewResource}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="topic" value={r.topic_id} /><input type="hidden" name="op" value="approve" /><button className="btn btn-ghost btn-sm">Approve</button></form></li>))}
            </ul>)}
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="text-xl">Topics</h2>
        <form className="mt-3 flex flex-wrap gap-2" role="search">
          <select name="level" defaultValue={level} className="select !w-auto" aria-label="Class">{LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <select name="term" defaultValue={term} className="select !w-auto" aria-label="Term">{TERM_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select>
          <button className="btn btn-primary btn-sm">Show subjects</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">{subjects.map((s) => <Link key={s.subject} href={href({ subject: s.subject })} className={`badge text-sm ${subject === s.subject ? "badge-info" : ""}`}>{s.subject}</Link>)}</div>
        {subject && (topics.length === 0 ? <div className="mt-4"><Empty title="No topics" /></div> : (
          <ul className="mt-4 divide-y divide-line">{topics.map((t) => (
            <li key={t.id} className="py-3 text-sm"><p className="font-bold">Week {t.week || "–"} · {t.topic} {!t.teaching && <Badge>not taught</Badge>}</p>
              <details className="mt-1"><summary className="cursor-pointer font-bold text-royal">Edit</summary><TopicForm t={t} />
                <form action={deleteTopic} className="mt-2"><input type="hidden" name="id" value={t.id} /><button className="btn btn-danger btn-sm">Delete topic</button></form></details></li>))}</ul>))}
        <details className="mt-5 border-t border-line pt-4"><summary className="cursor-pointer font-display text-lg">Add a topic</summary><TopicForm t={{ level, term, subject }} /></details>
      </Card>
    </>
  );
}

function TopicForm({ t }: { t: Row }) {
  return (
    <ActionForm action={saveTopic} submit={t.id ? "Save topic" : "Add topic"} small className="mt-3 grid gap-3 sm:grid-cols-3">
      {t.id && <input type="hidden" name="id" value={t.id} />}
      <div className="field"><label>Class</label><select name="level" className="select" defaultValue={String(t.level)}>{LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
      <div className="field"><label>Term</label><select name="term" className="select" defaultValue={String(t.term)}>{TERM_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select></div>
      <Field label="Week" name="week" defaultValue={t.week} />
      <div className="sm:col-span-2"><Field label="Subject" name="subject" defaultValue={t.subject} required /></div>
      <Field label="Topic" name="topic" defaultValue={t.topic} required />
      <div className="sm:col-span-3"><TextArea label="What the scheme covers" name="content" rows={2} defaultValue={t.content} /></div>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="teaching" defaultChecked={t.teaching ?? true} /> Taught topic (untick for exams / revision weeks)</label>
    </ActionForm>
  );
}
