import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses, listSubjects, listTerms, str } from "@/lib/data";
import { teacherClassIds, wideScope } from "@/lib/scope";
import { currentTerm, getSetting } from "@/lib/settings";
import { Card, Empty, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { DEFAULT_WEIGHTS, type Weights } from "@/lib/logic/scoring";
import { recomputeAll, releaseSheet, saveMarkSheet } from "./actions";

export const metadata = { title: "Mark sheet" };

export default async function MarkSheet({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("results:view");
  const sp = await searchParams;
  const scoped = wideScope(me) ? null : await teacherClassIds(me.id);
  const [classes, subjects, terms, cur] = await Promise.all([listClasses(me.schoolId, scoped ? { ids: scoped } : {}), listSubjects(me.schoolId), listTerms(me.schoolId), currentTerm()]);
  const classId = str(sp.class), subjectId = str(sp.subject), termId = str(sp.term) || cur?.id || "";
  const w = (await getSetting<Weights>("weights")) ?? DEFAULT_WEIGHTS;
  const valid = classId && subjectId && termId && classes.some((c) => c.id === classId);
  const rows = valid ? await sql`
    SELECT s.id, s.first_name, s.last_name, s.admission_no, r.assignment, r.ca, r.exam, r.total, r.grade, r.teacher_remark, r.released
    FROM students s LEFT JOIN results r ON r.student_id = s.id AND r.term_id = ${termId} AND r.subject_id = ${subjectId}
    WHERE s.class_id = ${classId} AND s.school_id = ${me.schoolId} AND s.status IN ('active','enrolled') ORDER BY s.last_name, s.first_name` : [];
  return (
    <>
      <PageHeader title="Mark sheet" sub={`Scores are weighted ${w.assignment} (assignments) + ${w.ca} (CA) + ${w.exam} (exam) = 100. CBT results fill in automatically; enter paper marks here.`} />
      <Card className="mb-5">
        <form className="grid gap-3 sm:grid-cols-4" role="search">
          <div className="field"><label htmlFor="class">Class</label><select id="class" name="class" className="select" defaultValue={classId}><option value="">Select…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
          <div className="field"><label htmlFor="subject">Subject</label><select id="subject" name="subject" className="select" defaultValue={subjectId}><option value="">Select…</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="field"><label htmlFor="term">Term</label><select id="term" name="term" className="select" defaultValue={termId}>{terms.map((t) => <option key={t.id} value={t.id}>{t.session} · {t.name}</option>)}</select></div>
          <div className="flex items-end"><button className="btn btn-primary">Open</button></div>
        </form>
      </Card>
      {!valid ? <Empty title="Choose a class, subject and term" /> : rows.length === 0 ? <Empty title="No students in this class" /> : (
        <>
          <ActionForm action={saveMarkSheet} submit="Save mark sheet" className="grid gap-3">
            <input type="hidden" name="classId" value={classId} /><input type="hidden" name="subjectId" value={subjectId} /><input type="hidden" name="termId" value={termId} />
            <div className="card overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>Student</th><th>Assign. /{w.assignment}</th><th>CA /{w.ca}</th><th>Exam /{w.exam}</th><th>Total</th><th>Grade</th><th>Teacher remark</th><th>Released</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap"><input type="hidden" name="sid" value={r.id} />{r.last_name}, {r.first_name}</td>
                      <td><input name={`a_${r.id}`} type="number" step="0.1" min={0} max={w.assignment} defaultValue={r.assignment ?? ""} className="input !min-h-9 !w-20 !py-1" aria-label={`Assignment score for ${r.first_name}`} /></td>
                      <td><input name={`c_${r.id}`} type="number" step="0.1" min={0} max={w.ca} defaultValue={r.ca ?? ""} className="input !min-h-9 !w-20 !py-1" aria-label={`CA score for ${r.first_name}`} /></td>
                      <td><input name={`e_${r.id}`} type="number" step="0.1" min={0} max={w.exam} defaultValue={r.exam ?? ""} className="input !min-h-9 !w-20 !py-1" aria-label={`Exam score for ${r.first_name}`} /></td>
                      <td className="font-bold">{r.total ?? "—"}</td><td className="font-bold">{r.grade ?? "—"}</td>
                      <td><input name={`r_${r.id}`} defaultValue={r.teacher_remark ?? ""} className="input !min-h-9 !py-1" aria-label={`Remark for ${r.first_name}`} /></td>
                      <td>{r.released ? "Yes" : "Held"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ActionForm>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={recomputeAll}><input type="hidden" name="classId" value={classId} /><input type="hidden" name="subjectId" value={subjectId} /><input type="hidden" name="termId" value={termId} /><button className="btn btn-ghost btn-sm">Recompute from CBT attempts</button></form>
            {can(me, "results:publish") && (
              <>
                <form action={releaseSheet}><input type="hidden" name="classId" value={classId} /><input type="hidden" name="subjectId" value={subjectId} /><input type="hidden" name="termId" value={termId} /><button className="btn btn-gold btn-sm">Release to students &amp; parents</button></form>
                <form action={releaseSheet}><input type="hidden" name="classId" value={classId} /><input type="hidden" name="subjectId" value={subjectId} /><input type="hidden" name="termId" value={termId} /><input type="hidden" name="hold" value="1" /><button className="btn btn-danger btn-sm">Hold results</button></form>
              </>
            )}
            {can(me, "results:export") || can(me, "reports:export") ? <a className="btn btn-ghost btn-sm" href={`/portal/export/results?class=${classId}&subject=${subjectId}&term=${termId}`}>Export CSV</a> : null}
          </div>
        </>
      )}
    </>
  );
}
