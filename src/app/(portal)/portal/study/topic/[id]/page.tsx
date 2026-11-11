import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { TERM_NAMES, levelName, visibleLevels } from "@/lib/curriculum";
import { Badge, Card, Field, PageHeader, TextArea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { addResource, reviewLesson, reviewResource, saveLesson, toggleStudied } from "../../actions";

export const dynamic = "force-dynamic";
type Row = Record<string, any>;

export default async function Topic({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMe();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [t] = await sql`SELECT * FROM curriculum_topics WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!t) notFound();
  const levels = await visibleLevels(me);
  if (!levels.some((l) => l.level === t.level)) notFound(); // learners only see their own class's topics

  const manage = can(me, "curriculum:manage");
  const author = manage || can(me, "curriculum:create") || can(me, "curriculum:edit");
  const [lesson] = await sql`SELECT body, status FROM topic_lessons WHERE topic_id = ${id}`;
  const resources: Row[] = await sql`SELECT id, title, kind, url, platform, published FROM resources WHERE topic_id = ${id} AND school_id = ${me.schoolId} ${author ? sql`` : sql`AND published`} ORDER BY created_at`;
  const [done] = me.role === "student" ? await sql`SELECT 1 FROM topic_progress WHERE user_id = ${me.id} AND topic_id = ${id}` : [];
  const showLesson = lesson && (lesson.status === "approved" || author);

  return (
    <>
      <PageHeader eyebrow={`${levelName(t.level)} · ${TERM_NAMES[t.term - 1]} · Week ${t.week || "–"}`} title={t.topic} sub={t.subject}
        actions={<Link href={`/portal/study?level=${t.level}&term=${t.term}&subject=${encodeURIComponent(t.subject)}`} className="btn btn-ghost btn-sm">← {t.subject}</Link>} />
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {t.content && <Card><h2 className="text-xl">What the scheme covers</h2><p className="mt-2 whitespace-pre-wrap">{t.content}</p></Card>}
          <Card>
            <h2 className="text-xl">Lesson {lesson?.status === "pending" && <Badge tone="warn">awaiting approval</Badge>}</h2>
            {showLesson ? <div className="mt-3 whitespace-pre-wrap text-[1.02rem] leading-8">{lesson.body}</div> : <p className="mt-2 text-sm text-muted">The lesson for this topic has not been written yet. Use the resources while you wait.</p>}
            {manage && lesson?.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <form action={reviewLesson}><input type="hidden" name="topic" value={id} /><input type="hidden" name="op" value="approve" /><button className="btn btn-primary btn-sm">Approve lesson</button></form>
                <form action={reviewLesson}><input type="hidden" name="topic" value={id} /><input type="hidden" name="op" value="reject" /><button className="btn btn-danger btn-sm">Reject</button></form>
              </div>)}
            {author && (
              <details className="mt-4 border-t border-line pt-4"><summary className="cursor-pointer font-bold text-royal">{lesson ? "Edit lesson" : "Write the lesson"}</summary>
                <ActionForm action={saveLesson} submit={manage ? "Publish lesson" : "Save for approval"} className="mt-3 grid gap-3"><input type="hidden" name="topic" value={id} />
                  <TextArea label="Lesson" name="body" rows={14} defaultValue={lesson?.body} hint="Plain text. Use blank lines between paragraphs. Maths can use $…$ notation." required /></ActionForm></details>)}
          </Card>
        </div>
        <div className="space-y-5">
          {me.role === "student" && (
            <Card><form action={toggleStudied}><input type="hidden" name="topic" value={id} />
              <button className={`btn w-full ${done ? "btn-ghost" : "btn-gold"}`}>{done ? "✓ Studied (tap to undo)" : "Mark as studied"}</button></form></Card>)}
          <Card><h2 className="text-xl">Resources</h2>
            {resources.length === 0 ? <p className="mt-2 text-sm text-muted">No resources yet.</p> : (
              <ul className="mt-2 divide-y divide-line text-sm">{resources.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                  <span><a className="font-bold text-royal" target="_blank" rel="noopener noreferrer" href={r.url}>{r.title}</a> {!r.published && <Badge tone="warn">pending</Badge>}<br /><span className="text-xs text-muted">{r.platform ?? r.kind}</span></span>
                  {manage && <span className="flex gap-1">
                    {!r.published && <form action={reviewResource}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="topic" value={id} /><input type="hidden" name="op" value="approve" /><button className="btn btn-ghost btn-sm">Approve</button></form>}
                    <form action={reviewResource}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="topic" value={id} /><input type="hidden" name="op" value="remove" /><button className="btn btn-danger btn-sm">Remove</button></form></span>}
                </li>))}</ul>)}
            {author && (
              <details className="mt-3 border-t border-line pt-3"><summary className="cursor-pointer font-bold text-royal">Add a resource link</summary>
                <ActionForm action={addResource} submit="Add" small className="mt-3 grid gap-3"><input type="hidden" name="topic" value={id} />
                  <Field label="Title" name="title" required /><Field label="Link (YouTube, PDF, website)" name="url" type="url" required /></ActionForm></details>)}
          </Card>
          {me.role === "student" && <Link href="/portal/mocks" className="btn btn-ghost w-full">Practise in the Mock centre →</Link>}
        </div>
      </div>
    </>
  );
}
