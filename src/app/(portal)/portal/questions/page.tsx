import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses, listDepartments, listSubjects, listTerms, opts, pageParams, str } from "@/lib/data";
import { wideScope } from "@/lib/scope";
import { Badge, Card, Empty, Field, PageHeader, Pager, Select, TextArea, statusTone } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { QuestionImport } from "@/components/question-import";
import { MOCK_CATEGORIES } from "@/lib/logic/academics";
import { addQuestion, reviewQuestions } from "./actions";

export const metadata = { title: "Question bank" };

export default async function Questions({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("questions:view");
  const sp = await searchParams;
  const status = str(sp.status), subject = str(sp.subject), q = str(sp.q).trim();
  const { page, size, offset } = pageParams(sp, 20);
  const [subjects, classes, terms, depts] = await Promise.all([listSubjects(me.schoolId), listClasses(me.schoolId), listTerms(me.schoolId), listDepartments(me.schoolId)]);
  const mineOnly = !(wideScope(me) || can(me, "questions:approve") || can(me, "questions:review"));
  const where = sql`q.school_id = ${me.schoolId} ${mineOnly ? sql`AND q.author_id = ${me.id}` : sql``}
    ${status ? sql`AND q.status = ${status}` : sql``} ${subject ? sql`AND q.subject_id = ${subject}` : sql``}
    ${q ? sql`AND q.text ILIKE ${"%" + q + "%"}` : sql``}`;
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM questions q WHERE ${where}`;
  const rows = await sql`SELECT q.id, q.text, q.options, q.correct, q.status, q.difficulty, q.marks, q.copyright, q.topic, s.name AS subject, c.name AS class_name, u.first_name || ' ' || u.last_name AS author
                         FROM questions q LEFT JOIN subjects s ON s.id = q.subject_id LEFT JOIN classes c ON c.id = q.class_id LEFT JOIN users u ON u.id = q.author_id
                         WHERE ${where} ORDER BY q.created_at DESC LIMIT ${size} OFFSET ${offset}`;
  const [counts] = await sql`SELECT count(*) FILTER (WHERE status = 'PENDING_REVIEW')::int AS pending, count(*) FILTER (WHERE status = 'APPROVED')::int AS approved FROM questions WHERE school_id = ${me.schoolId}`;
  const canCreate = can(me, "questions:create");
  const subjOpts = opts(subjects, (s) => s.name), classOpts = opts(classes, (c) => c.label), termOpts = opts(terms, (t) => `${t.session} · ${t.name}`), deptOpts = opts(depts, (d) => d.name);

  return (
    <>
      <PageHeader title="Question bank" sub={`${counts.approved} approved · ${counts.pending} pending review. Only approved questions can enter examinations.`}
        actions={can(me, "questions:export") && <a className="btn btn-ghost btn-sm" href="/portal/export/questions">Export CSV</a>} />

      {canCreate && (
        <div className="mb-5 grid gap-4">
          <details className="card card-pad">
            <summary className="cursor-pointer font-display text-lg">Add a question</summary>
            <div className="mt-4">
              <ActionForm action={addQuestion} submit="Save question" className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3"><TextArea label="Question (use $…$ for maths, e.g. $x^2+3x=0$)" name="text" required rows={3} /></div>
                {["A", "B", "C", "D"].map((k) => <Field key={k} label={`Option ${k}`} name={`opt${k}`} required={k <= "B"} />)}
                <Select label="Correct answer" name="correct" required allowEmpty={false} options={["A", "B", "C", "D"].map((k) => ({ value: k, label: k }))} />
                <Select label="Subject" name="subjectId" options={subjOpts} />
                <Select label="Class" name="classId" options={classOpts} />
                <Select label="Department" name="departmentId" options={deptOpts} />
                <Select label="Term" name="termId" options={termOpts} />
                <Field label="Topic" name="topic" /><Field label="Subtopic" name="subtopic" />
                <Select label="Difficulty" name="difficulty" defaultValue="medium" allowEmpty={false} options={["easy", "medium", "hard"].map((d) => ({ value: d, label: d }))} />
                <Field label="Marks" name="marks" type="number" min={0.5} step={0.5} defaultValue={1} />
                <Select label="Exam category (mock)" name="examCategory" options={MOCK_CATEGORIES.map((m) => ({ value: m.key, label: m.label }))} />
                <Select label="Copyright status" name="copyright" defaultValue="teacher_authored" allowEmpty={false}
                  options={[["original", "Original"], ["teacher_authored", "Teacher-authored"], ["licensed", "Licensed"], ["authorised", "Authorised"]].map(([v, l]) => ({ value: v, label: l }))} />
                <Field label="Source" name="source" />
                <div className="sm:col-span-3"><TextArea label="Explanation" name="explanation" rows={2} /></div>
              </ActionForm>
            </div>
          </details>
          <details className="card card-pad">
            <summary className="cursor-pointer font-display text-lg">Import from Excel, Word, PowerPoint or PDF</summary>
            <div className="mt-4"><QuestionImport subjects={subjOpts} classes={classOpts} terms={termOpts} departments={deptOpts} /></div>
          </details>
        </div>
      )}

      <Card className="mb-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_200px_200px_auto]" role="search">
          <input name="q" defaultValue={q} className="input" placeholder="Search question text" aria-label="Search" />
          <select name="subject" defaultValue={subject} className="select" aria-label="Subject"><option value="">All subjects</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select name="status" defaultValue={status} className="select" aria-label="Status"><option value="">Any status</option>{["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"].map((s) => <option key={s}>{s}</option>)}</select>
          <button className="btn btn-primary">Filter</button>
        </form>
      </Card>

      {rows.length === 0 ? <Empty title="No questions match" /> : (
        <form action={reviewQuestions}>
          <div className="card overflow-x-auto">
            <table className="tbl">
              <thead><tr><th className="w-8"></th><th>Question</th><th>Subject / class</th><th>Answer</th><th>Marks</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><input type="checkbox" name="q" value={r.id} aria-label="Select question" /></td>
                    <td className="max-w-md"><p className="line-clamp-2">{r.text}</p>
                      <p className="mt-1 text-xs text-muted">{(r.options as { key: string; text: string }[]).map((o) => `${o.key}. ${o.text}`).join("  ·  ")}</p></td>
                    <td className="text-xs">{r.subject ?? "—"}<br />{r.class_name ?? ""}<br /><span className="text-muted">{r.author}</span></td>
                    <td className="font-bold">{r.correct}</td><td>{r.marks}</td>
                    <td><Badge tone={statusTone(r.status)}>{r.status.replace("_", " ")}</Badge><br /><span className="text-xs text-muted">{r.copyright}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {can(me, "questions:approve") && <><button name="op" value="approve" className="btn btn-gold btn-sm">Approve selected</button><button name="op" value="reject" className="btn btn-danger btn-sm">Reject selected</button></>}
            {can(me, "questions:edit") && <><button name="op" value="pending" className="btn btn-ghost btn-sm">Back to pending</button><button name="op" value="archive" className="btn btn-ghost btn-sm">Archive selected</button></>}
          </div>
        </form>
      )}
      <Pager page={page} pages={Math.ceil(n / size)} base={`/portal/questions?q=${encodeURIComponent(q)}&status=${status}&subject=${subject}`} />
    </>
  );
}
