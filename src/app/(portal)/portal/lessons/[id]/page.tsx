import { notFound } from "next/navigation";
import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses, listSubjects, listTerms, opts, ymd } from "@/lib/data";
import { wideScope } from "@/lib/scope";
import { Badge, Card, Field, Notice, PageHeader, Select, TextArea, statusTone } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { LESSON_FIELDS, LESSON_LABELS } from "@/lib/logic/lesson";
import { lessonTransition, saveLesson } from "../actions";

export const dynamic = "force-dynamic";

export default async function LessonEditor({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePerm("lessons:view");
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [classes, subjects, terms] = await Promise.all([listClasses(me.schoolId), listSubjects(me.schoolId), listTerms(me.schoolId)]);
  let l: Record<string, any> | null = null;
  if (!isNew) {
    const found = await sql`SELECT l.*, u.first_name || ' ' || u.last_name AS teacher FROM lesson_notes l JOIN users u ON u.id = l.teacher_id WHERE l.id = ${id} AND l.school_id = ${me.schoolId}`;
    l = (found[0] as Record<string, any> | undefined) ?? null;
    if (!l) notFound();
    if (l.teacher_id !== me.id && !wideScope(me) && !can(me, "lessons:review")) notFound();
  } else if (!can(me, "lessons:create")) notFound();

  const body = (l?.body ?? {}) as Record<string, string>;
  const own = isNew || l?.teacher_id === me.id;
  const editable = isNew || ((own || can(me, "lessons:manage")) && !["approved", "published"].includes(l?.status));
  const mats = !isNew ? await sql`SELECT id, title, kind, url, file_id FROM resources WHERE lesson_id = ${id}` : [];

  return (
    <>
      <PageHeader eyebrow={isNew ? "New" : `Lesson note · ${l!.teacher}`} title={isNew ? "New lesson note" : l!.topic}
        actions={!isNew && <Badge tone={statusTone(l!.status)}>{l!.status}</Badge>} />
      {l?.review_comment && <div className="mb-4"><Notice kind={l.status === "rejected" ? "bad" : "info"}>Reviewer: {l.review_comment}</Notice></div>}

      <Card>
        {editable ? (
          <ActionForm action={saveLesson} submit="Save lesson note" className="grid gap-4 sm:grid-cols-2">
            {!isNew && <input type="hidden" name="id" value={id} />}
            <div className="sm:col-span-2"><Field label="Topic" name="topic" defaultValue={l?.topic} required /></div>
            <Select label="Class" name="classId" defaultValue={l?.class_id} options={opts(classes, (c) => c.label)} />
            <Select label="Subject" name="subjectId" defaultValue={l?.subject_id} options={opts(subjects, (s) => s.name)} />
            <Select label="Term" name="termId" defaultValue={l?.term_id} options={opts(terms, (t) => `${t.session} · ${t.name}`)} />
            <Field label="Week" name="week" type="number" min={1} max={20} defaultValue={l?.week} />
            <Field label="Date" name="lessonDate" type="date" defaultValue={ymd(l?.lesson_date)} />
            {LESSON_FIELDS.map((k) => (
              <div key={k} className={k === "subtopic" ? "" : "sm:col-span-2"}>
                {k === "subtopic" ? <Field label={LESSON_LABELS[k]} name={k} defaultValue={body[k]} /> : <TextArea label={LESSON_LABELS[k]} name={k} defaultValue={body[k]} rows={k === "presentation" ? 6 : 3} />}
              </div>
            ))}
          </ActionForm>
        ) : (
          <dl className="grid gap-4 text-sm">
            {LESSON_FIELDS.filter((k) => body[k]).map((k) => (
              <div key={k}><dt className="label">{LESSON_LABELS[k]}</dt><dd className="mt-1 whitespace-pre-line text-ink-2">{body[k]}</dd></div>
            ))}
          </dl>
        )}
      </Card>

      {!isNew && mats.length > 0 && (
        <Card className="mt-5"><h2 className="text-xl">Attached materials</h2>
          <ul className="mt-2 text-sm">{mats.map((m) => <li key={m.id}><a className="font-semibold text-royal hover:underline" href={m.file_id ? `/api/files/${m.file_id}` : m.url} target="_blank" rel="noopener noreferrer">{m.title}</a> <Badge>{m.kind}</Badge></li>)}</ul>
        </Card>
      )}

      {!isNew && (
        <Card className="mt-5">
          <h2 className="text-xl">Workflow</h2>
          <form action={lessonTransition} className="mt-3 grid gap-3">
            <input type="hidden" name="id" value={id} />
            <TextArea label="Reviewer comment (optional)" name="comment" rows={2} />
            <div className="flex flex-wrap gap-2">
              {own && ["draft", "rejected"].includes(l!.status) && <button name="op" value="submit" className="btn btn-primary">Submit for review</button>}
              {can(me, "lessons:review") && l!.status === "submitted" && <button name="op" value="review" className="btn btn-ghost">Mark reviewed</button>}
              {can(me, "lessons:approve") && ["submitted", "reviewed"].includes(l!.status) && <button name="op" value="approve" className="btn btn-gold">Approve</button>}
              {can(me, "lessons:review") && ["submitted", "reviewed"].includes(l!.status) && <button name="op" value="reject" className="btn btn-danger">Reject</button>}
              {can(me, "lessons:publish") && l!.status === "approved" && <button name="op" value="publish" className="btn btn-primary">Publish</button>}
              {can(me, "lessons:archive") && l!.status !== "archived" && <button name="op" value="archive" className="btn btn-ghost">Archive</button>}
              {can(me, "lessons:manage") && ["approved", "published", "archived", "rejected"].includes(l!.status) && <button name="op" value="reopen" className="btn btn-ghost">Reopen as draft</button>}
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
