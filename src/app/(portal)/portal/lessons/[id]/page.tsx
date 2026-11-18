import { notFound } from "next/navigation";
import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses, listSubjects, listTerms, opts, ymd } from "@/lib/data";
import { wideScope } from "@/lib/scope";
import { allSettings } from "@/lib/settings";
import { Badge, Card, Field, Notice, PageHeader, Select, TextArea, statusTone } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { PrintButton } from "@/components/print-button";
import { DiagramView } from "@/components/diagram";
import { DETAIL_FIELDS, LESSON_HINTS, LESSON_LABELS, TEXT_FIELDS } from "@/lib/logic/lesson";
import { DIAGRAM_KINDS, cleanDiagram, type Diagram } from "@/lib/logic/diagram";
import { generateLessonNote, lessonTransition, saveLesson } from "../actions";

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

  const body = (l?.body ?? {}) as Record<string, any>;
  const diagrams: Diagram[] = ((body.diagrams as Partial<Diagram>[]) ?? []).map((d) => cleanDiagram(d)).filter(Boolean) as Diagram[];
  const own = isNew || l?.teacher_id === me.id;
  const editable = isNew || ((own || can(me, "lessons:manage")) && !["approved", "published"].includes(l?.status));
  const mats = !isNew ? await sql`SELECT id, title, kind, url, file_id FROM resources WHERE lesson_id = ${id}` : [];
  const brand = (await allSettings()).brand as { school: string };
  const clsRow = l?.class_id ? classes.find((c) => c.id === l!.class_id) : null;
  const subRow = l?.subject_id ? subjects.find((s) => s.id === l!.subject_id) : null;
  const slots = Math.max(diagrams.length + 1, 2);

  return (
    <>
      <PageHeader eyebrow={isNew ? "New" : `Lesson note · ${l!.teacher}`} title={isNew ? "New lesson note" : l!.topic}
        actions={!isNew && <div className="no-print flex items-center gap-2"><Badge tone={statusTone(l!.status)}>{l!.status}</Badge><PrintButton label="Print" /></div>} />
      {l?.review_comment && <div className="mb-4"><Notice kind={l.status === "rejected" ? "bad" : "info"}>Reviewer: {l.review_comment}</Notice></div>}

      {isNew && can(me, "lessons:create") && (
        <Card className="mb-5"><h2 className="text-xl">Generate a draft in the standard template</h2>
          <p className="mt-1 text-sm text-muted">Pick the class, subject and topic. You get a full note (objectives, materials, steps, evaluation, assignment) with a suggested diagram or graph. If the topic is in the scheme of work, its content is used. Then edit it as you like.</p>
          <ActionForm action={generateLessonNote} submit="Generate lesson note" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select label="Class" name="classId" required options={opts(classes, (c) => c.label)} />
            <Select label="Subject" name="subjectId" required options={opts(subjects, (s) => s.name)} />
            <Field label="Topic" name="topic" required placeholder="e.g. The water cycle" />
            <Field label="Sub-topic (optional)" name="subtopic" />
            <Field label="Duration (minutes)" name="duration" type="number" min={10} max={120} defaultValue="40" />
            <Field label="Week" name="week" type="number" min={1} max={20} />
          </ActionForm></Card>
      )}

      {editable ? (
        <Card>
          {isNew && <h2 className="mb-3 text-xl">…or write it yourself</h2>}
          <ActionForm action={saveLesson} submit="Save lesson note" className="grid gap-4 sm:grid-cols-2">
            {!isNew && <input type="hidden" name="id" value={id} />}
            <div className="sm:col-span-2"><Field label="Topic" name="topic" defaultValue={l?.topic} required /></div>
            <Select label="Class" name="classId" defaultValue={l?.class_id} options={opts(classes, (c) => c.label)} />
            <Select label="Subject" name="subjectId" defaultValue={l?.subject_id} options={opts(subjects, (s) => s.name)} />
            <Select label="Term" name="termId" defaultValue={l?.term_id} options={opts(terms, (t) => `${t.session} · ${t.name}`)} />
            <Field label="Week" name="week" type="number" min={1} max={20} defaultValue={l?.week} />
            <Field label="Date" name="lessonDate" type="date" defaultValue={ymd(l?.lesson_date)} />
            {DETAIL_FIELDS.map((k) => <Field key={k} label={LESSON_LABELS[k]} name={k} defaultValue={body[k]} />)}
            {TEXT_FIELDS.map((k) => <div key={k} className="sm:col-span-2"><TextArea label={LESSON_LABELS[k]} name={k} defaultValue={body[k]} rows={k === "presentation" ? 7 : k === "objectives" ? 5 : 3} hint={LESSON_HINTS[k]} /></div>)}
            <fieldset className="grid gap-4 rounded-xl border border-line p-4 sm:col-span-2">
              <legend className="px-1 text-xs font-bold uppercase tracking-wider text-muted">Diagrams, charts and graphs</legend>
              <p className="text-sm text-muted">Choose a type and type the values; it is drawn for you. Leave the box empty to skip it. Save to see the drawing.</p>
              <ul className="grid gap-1 text-xs text-muted sm:grid-cols-2">{DIAGRAM_KINDS.map((k) => <li key={k.key}><b>{k.label}:</b> {k.help}</li>)}</ul>
              {Array.from({ length: slots }, (_, i) => { const d = diagrams[i]; return (
                <div key={i} className="grid gap-3 rounded-lg bg-paper-2 p-3 sm:grid-cols-2">
                  <div className="field"><label htmlFor={`dk${i}`}>Type</label><select id={`dk${i}`} name={`dk${i}`} className="select" defaultValue={d?.kind ?? "bar"}>{DIAGRAM_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select></div>
                  <Field label="Title" name={`dt${i}`} defaultValue={d?.title} />
                  <div className="sm:col-span-2"><TextArea label="Values (see the format under each type)" name={`dd${i}`} defaultValue={d?.data} rows={4} /></div>
                  <div className="sm:col-span-2"><Field label="Caption" name={`dc${i}`} defaultValue={d?.caption} /></div>
                  {d && <div className="sm:col-span-2"><DiagramView d={d} /></div>}
                </div>); })}
            </fieldset>
          </ActionForm>
        </Card>
      ) : (
        <article className="card card-pad text-sm leading-relaxed">
          <header className="mb-4 border-b border-line pb-3 text-center"><p className="text-xs font-bold uppercase tracking-widest text-muted">{brand.school}</p><h2 className="text-2xl">Lesson note</h2></header>
          <table className="tbl mb-4"><tbody>
            <tr><th>Subject</th><td>{subRow?.name ?? "-"}</td><th>Class</th><td>{clsRow?.label ?? "-"}</td></tr>
            <tr><th>Topic</th><td>{l!.topic}</td><th>Sub-topic</th><td>{body.subtopic || "-"}</td></tr>
            <tr><th>Date</th><td>{ymd(l!.lesson_date) || "-"}</td><th>Week</th><td>{l!.week ?? "-"}</td></tr>
            <tr><th>Duration</th><td>{body.duration || "-"}</td><th>Period</th><td>{body.period || "-"}</td></tr>
            <tr><th>Number of learners</th><td>{body.classSize || "-"}</td><th>Average age / Sex</th><td>{body.averageAge || "-"} / {body.sex || "-"}</td></tr>
          </tbody></table>
          <dl className="grid gap-4">
            {TEXT_FIELDS.filter((k) => body[k]).map((k) => (
              <div key={k}><dt className="text-xs font-bold uppercase tracking-wider text-muted">{LESSON_LABELS[k]}</dt><dd className="mt-1 whitespace-pre-line text-ink-2">{body[k]}</dd></div>
            ))}
          </dl>
          {diagrams.length > 0 && <div className="mt-4"><p className="text-xs font-bold uppercase tracking-wider text-muted">Diagrams, charts and graphs</p>{diagrams.map((d, i) => <DiagramView key={i} d={d} />)}</div>}
        </article>
      )}
      {editable && !isNew && diagrams.length === 0 && <p className="mt-2 text-xs text-muted">No diagrams yet. Add one above to illustrate the lesson.</p>}

      {!isNew && mats.length > 0 && (
        <Card className="mt-5"><h2 className="text-xl">Attached materials</h2>
          <ul className="mt-2 text-sm">{mats.map((m) => <li key={m.id}><a className="font-semibold text-royal hover:underline" href={m.file_id ? `/api/files/${m.file_id}` : m.url} target="_blank" rel="noopener noreferrer">{m.title}</a> <Badge>{m.kind}</Badge></li>)}</ul>
        </Card>
      )}

      {!isNew && (
        <Card className="no-print mt-5">
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
