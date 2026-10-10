import { notFound } from "next/navigation";
import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { teacherClassIds, wideScope } from "@/lib/scope";
import { Badge, Card, Notice, PageHeader, Stat, statusTone } from "@/components/ui";
import { addPoolQuestions, releaseResults, removePoolQuestion, setAssessmentStatus } from "../actions";

export const dynamic = "force-dynamic";

export default async function AssessmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePerm("assessments:view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [a] = await sql`SELECT a.*, s.name AS subject, c.name AS class_name, c.arm FROM assessments a LEFT JOIN subjects s ON s.id = a.subject_id LEFT JOIN classes c ON c.id = a.class_id
                        WHERE a.id = ${id} AND a.school_id = ${me.schoolId}`;
  if (!a) notFound();
  const owner = a.created_by === me.id || wideScope(me) || (a.class_id && (await teacherClassIds(me.id)).includes(a.class_id));
  if (!owner) notFound();
  const pool = await sql`SELECT q.id, q.text, q.correct, aq.marks, q.status FROM assessment_questions aq JOIN questions q ON q.id = aq.question_id WHERE aq.assessment_id = ${id} ORDER BY q.created_at`;
  const bank = await sql`SELECT q.id, q.text, q.marks, q.topic FROM questions q
                         WHERE q.school_id = ${me.schoolId} AND q.status = 'APPROVED'
                           ${a.subject_id ? sql`AND q.subject_id = ${a.subject_id}` : sql``}
                           ${a.mock_category ? sql`AND (q.exam_category = ${a.mock_category} OR q.exam_category IS NULL)` : sql``}
                           AND q.id NOT IN (SELECT question_id FROM assessment_questions WHERE assessment_id = ${id})
                         ORDER BY q.created_at DESC LIMIT 100`;
  const subs = await sql`SELECT s.first_name, s.last_name, s.admission_no, count(t.id)::int AS attempts,
                           max(CASE WHEN t.max_score > 0 THEN round((t.score / t.max_score * 100)::numeric, 1) END) AS best
                         FROM attempts t JOIN students s ON s.id = t.student_id WHERE t.assessment_id = ${id} AND t.status = 'submitted'
                         GROUP BY s.id, s.first_name, s.last_name, s.admission_no ORDER BY s.last_name`;
  const avg = subs.length ? Math.round((subs.reduce((x, r) => x + Number(r.best ?? 0), 0) / subs.length) * 10) / 10 : null;
  const edit = can(me, "assessments:edit");
  const locked = a.status === "closed";

  return (
    <>
      <PageHeader eyebrow={a.kind === "ca" ? "CA test" : a.kind} title={a.title}
        sub={`${a.subject ?? "No subject"} · ${a.class_name ? `${a.class_name} ${a.arm}` : "Open mock"} · ${a.duration_min} min · ${a.attempt_limit} attempt(s)${a.draw_count ? ` · draws ${a.draw_count} of pool` : ""}`}
        actions={<Badge tone={statusTone(a.status)}>{a.status}</Badge>} />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Questions in pool" value={pool.length} />
        <Stat label="Submitted" value={subs.length} tone="royal" />
        <Stat label="Average best score" value={avg !== null ? `${avg}%` : "—"} />
      </div>

      {edit && (
        <Card className="mb-5">
          <div className="flex flex-wrap items-center gap-2">
            {a.status === "draft" && can(me, "assessments:publish") && <form action={setAssessmentStatus}><input type="hidden" name="id" value={id} /><button name="op" value="publish" className="btn btn-gold" disabled={pool.length === 0}>Publish to students</button></form>}
            {a.status === "published" && <form action={setAssessmentStatus}><input type="hidden" name="id" value={id} /><button name="op" value="close" className="btn btn-primary">Close assessment</button></form>}
            {["published", "closed"].includes(a.status) && <form action={setAssessmentStatus}><input type="hidden" name="id" value={id} /><button name="op" value="reopen" className="btn btn-ghost">Back to draft</button></form>}
            {a.kind !== "mock" && can(me, "results:publish") && a.status !== "draft" && (
              <form action={releaseResults}><input type="hidden" name="id" value={id} /><button className="btn btn-ghost">Release results to students &amp; parents</button></form>
            )}
          </div>
          {pool.length === 0 && <div className="mt-3"><Notice>Add approved questions below before publishing.</Notice></div>}
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl">Question pool ({pool.length})</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {pool.length === 0 && <li className="py-2 text-muted">No questions yet.</li>}
            {pool.map((q) => (
              <li key={q.id} className="flex items-start justify-between gap-3 py-2">
                <span><span className="line-clamp-2">{q.text}</span><span className="text-xs text-muted">Answer {q.correct} · {q.marks} mark(s)</span></span>
                {edit && !locked && <form action={removePoolQuestion}><input type="hidden" name="id" value={id} /><input type="hidden" name="q" value={q.id} /><button className="btn btn-danger btn-sm" aria-label="Remove question">×</button></form>}
              </li>
            ))}
          </ul>
        </Card>
        {edit && !locked && (
          <Card>
            <h2 className="text-xl">Add from approved bank</h2>
            {bank.length === 0 ? <p className="mt-2 text-sm text-muted">No more approved questions for this subject. Add or approve questions in the Question bank.</p> : (
              <form action={addPoolQuestions}>
                <input type="hidden" name="id" value={id} />
                <ul className="mt-3 max-h-96 divide-y divide-line overflow-auto text-sm">
                  {bank.map((q) => <li key={q.id}><label className="flex items-start gap-2 py-2"><input type="checkbox" name="q" value={q.id} className="mt-1" /><span className="line-clamp-2">{q.text}</span></label></li>)}
                </ul>
                <button className="btn btn-primary mt-3">Add selected</button>
              </form>
            )}
          </Card>
        )}
      </div>

      <Card className="mt-5">
        <h2 className="text-xl">Submissions</h2>
        {subs.length === 0 ? <p className="mt-2 text-sm text-muted">No submissions yet.</p> : (
          <div className="mt-3 overflow-x-auto"><table className="tbl"><thead><tr><th>Student</th><th>Admission no.</th><th>Attempts</th><th>Best score</th></tr></thead>
            <tbody>{subs.map((s, i) => <tr key={i}><td>{s.last_name}, {s.first_name}</td><td>{s.admission_no}</td><td>{s.attempts}</td><td><b>{s.best ?? "—"}%</b></td></tr>)}</tbody></table></div>
        )}
      </Card>
    </>
  );
}
