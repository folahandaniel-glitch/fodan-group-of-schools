import Link from "next/link";
import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { canSeeStudent, childIds, studentOf } from "@/lib/scope";
import { listTerms, str } from "@/lib/data";
import { currentTerm, getSetting } from "@/lib/settings";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { gradeFor, type GradeBand, DEFAULT_GRADES } from "@/lib/logic/scoring";

export const metadata = { title: "Results" };

export default async function Results({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  const sp = await searchParams;
  const term = await currentTerm();
  const termId = str(sp.term) || term?.id || "";
  let studentId = str(sp.student);
  const bands = (await getSetting<GradeBand[]>("grading")) ?? DEFAULT_GRADES;
  const terms = await listTerms(me.schoolId);

  if (me.role === "student") studentId = (await studentOf(me.id))?.id ?? "";
  else if (me.role === "parent") {
    const kids = await childIds(me.id);
    if (!studentId || !kids.includes(studentId)) studentId = kids[0] ?? "";
  } else if (!studentId) {
    return (
      <>
        <PageHeader title="Results" sub="Open a student's profile or the mark sheet to see results." />
        <Empty title="Choose a student"><Link className="font-bold text-royal hover:underline" href="/portal/students">Go to students</Link> or the <Link className="font-bold text-royal hover:underline" href="/portal/mark-sheet">mark sheet</Link>.</Empty>
      </>
    );
  }
  if (!studentId || !(await canSeeStudent(me, studentId))) return <Empty title="No results to show" />;
  const learner = me.role === "student" || me.role === "parent";
  const [s] = await sql`SELECT first_name, last_name FROM students WHERE id = ${studentId}`;
  const rows = await sql`SELECT r.*, sub.name AS subject FROM results r JOIN subjects sub ON sub.id = r.subject_id
                         WHERE r.student_id = ${studentId} AND r.term_id = ${termId} ${learner ? sql`AND r.released = true` : sql``} ORDER BY sub.name`;
  const mocks = await sql`SELECT a.title, a.mock_category, max(CASE WHEN t.max_score > 0 THEN round((t.score / t.max_score * 100)::numeric, 0) END) AS best, count(*)::int AS tries
                          FROM attempts t JOIN assessments a ON a.id = t.assessment_id WHERE t.student_id = ${studentId} AND a.kind = 'mock' AND t.status = 'submitted'
                          GROUP BY a.id, a.title, a.mock_category ORDER BY max(t.submitted_at) DESC LIMIT 10`;
  const avg = rows.length ? Math.round((rows.reduce((x, r) => x + Number(r.total), 0) / rows.length) * 10) / 10 : null;

  return (
    <>
      <PageHeader eyebrow="Academic results" title={`${s.first_name} ${s.last_name}`} sub={avg !== null ? `Term average ${avg} · ${gradeFor(avg, bands).grade}` : undefined}
        actions={<Link className="btn btn-primary btn-sm" href={`/portal/report/${studentId}?term=${termId}`}>Report card</Link>} />
      <form className="mb-4 flex flex-wrap items-end gap-3" role="search">
        {!learner && <input type="hidden" name="student" value={studentId} />}
        {me.role === "parent" && <input type="hidden" name="student" value={studentId} />}
        <div className="field"><label htmlFor="term">Term</label>
          <select id="term" name="term" className="select" defaultValue={termId}>{terms.map((t) => <option key={t.id} value={t.id}>{t.session} · {t.name}</option>)}</select></div>
        <button className="btn btn-ghost">Show</button>
      </form>
      {rows.length === 0 ? <Empty title="No results available for this term yet">{learner ? "Results appear once released by the school." : "No results have been computed yet."}</Empty> : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Subject</th><th>Assignment /10</th><th>CA /30</th><th>Exam /60</th><th>Total /100</th><th>Grade</th><th>Remark</th>{!learner && <th>Released</th>}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-bold">{r.subject}</td><td>{r.assignment ?? "—"}</td><td>{r.ca ?? "—"}</td><td>{r.exam ?? "—"}</td>
                  <td className="font-bold">{r.total}</td><td><Badge tone={r.grade === "F" ? "bad" : r.grade === "A" ? "ok" : undefined}>{r.grade}</Badge></td>
                  <td className="max-w-xs text-xs text-ink-2">{r.teacher_remark || r.remark}</td>
                  {!learner && <td><Badge tone={r.released ? "ok" : "warn"}>{r.released ? "Yes" : "Held"}</Badge></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {mocks.length > 0 && (
        <Card className="mt-6"><h2 className="text-xl">Mock examination practice</h2>
          <ul className="mt-2 divide-y divide-line text-sm">{mocks.map((m, i) => <li key={i} className="flex justify-between py-2"><span>{m.title} <Badge>{String(m.mock_category ?? "mock").toUpperCase()}</Badge></span><span><b>{m.best}%</b> · {m.tries} attempt(s)</span></li>)}</ul></Card>
      )}
    </>
  );
}
