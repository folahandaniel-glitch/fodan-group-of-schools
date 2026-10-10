import Link from "next/link";
import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses, listSubjects, listTerms, opts, str } from "@/lib/data";
import { teacherClassIds, wideScope } from "@/lib/scope";
import { classLabel } from "@/lib/settings";
import { Badge, Card, Empty, Field, PageHeader, Select, TextArea, statusTone } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { MOCK_CATEGORIES, MOCK_TYPES } from "@/lib/logic/academics";
import { createAssessment } from "./actions";

export const metadata = { title: "Assessments" };

const LABEL: Record<string, string> = { assignment: "Assignment", ca: "CA test", exam: "Terminal exam", mock: "Mock" };

export default async function Assessments({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("assessments:view");
  const sp = await searchParams;
  const kind = str(sp.kind);
  const wide = wideScope(me);
  const mine = wide ? null : await teacherClassIds(me.id);
  const [classes, subjects, terms] = await Promise.all([
    listClasses(me.schoolId, mine ? { ids: mine } : {}), listSubjects(me.schoolId), listTerms(me.schoolId),
  ]);
  const rows = await sql`
    SELECT a.id, a.title, a.kind, a.status, a.due_at, a.mock_category, s.name AS subject, c.name AS class_name, c.arm, d.name AS dept,
           (SELECT count(*)::int FROM assessment_questions aq WHERE aq.assessment_id = a.id) AS questions,
           (SELECT count(*)::int FROM attempts t WHERE t.assessment_id = a.id AND t.status = 'submitted') AS submissions
    FROM assessments a LEFT JOIN subjects s ON s.id = a.subject_id LEFT JOIN classes c ON c.id = a.class_id LEFT JOIN departments d ON d.id = c.department_id
    WHERE a.school_id = ${me.schoolId} ${kind ? sql`AND a.kind = ${kind}` : sql``}
      ${wide ? sql`` : sql`AND (a.created_by = ${me.id} OR a.class_id = ANY(${mine ?? []}))`}
    ORDER BY a.created_at DESC LIMIT 100`;
  return (
    <>
      <PageHeader title="Assessments" sub="Assignments (10), Mid-term CA tests (30), Terminal exams (60) and mock examinations. Weights are configurable in Settings." />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Type filter">
        {["", "assignment", "ca", "exam", "mock"].map((k) => <Link key={k} href={k ? `/portal/assessments?kind=${k}` : "/portal/assessments"} className={`badge ${kind === k ? "badge-info" : ""}`}>{k ? LABEL[k] : "All"}</Link>)}
      </nav>
      {can(me, "assessments:create") && (
        <details className="card card-pad mb-5">
          <summary className="cursor-pointer font-display text-lg">Create an assessment</summary>
          <div className="mt-4">
            <ActionForm action={createAssessment} submit="Create and add questions" className="grid gap-4 sm:grid-cols-3">
              <Select label="Type" name="kind" required allowEmpty={false} defaultValue={kind || "assignment"} options={Object.entries(LABEL).map(([v, l]) => ({ value: v, label: l }))} />
              <div className="sm:col-span-2"><Field label="Title" name="title" required /></div>
              <Select label="Class" name="classId" options={opts(classes, (c) => c.label)} hint="Required except for open mocks." />
              <Select label="Subject" name="subjectId" options={opts(subjects, (s) => s.name)} />
              <Select label="Term" name="termId" options={opts(terms, (t) => `${t.session} · ${t.name}`)} />
              <Field label="Opens" name="startAt" type="datetime-local" />
              <Field label="Closes / due" name="dueAt" type="datetime-local" />
              <Field label="Duration (minutes)" name="duration" type="number" min={1} max={300} defaultValue={30} />
              <Field label="Attempts allowed" name="attempts" type="number" min={1} defaultValue={1} />
              <Field label="Pass mark (%)" name="passMark" type="number" min={0} max={100} defaultValue={40} />
              <Field label="Questions to draw" name="drawCount" type="number" min={1} hint="Leave empty to use the whole pool. A bigger pool gives different students different questions." />
              <Field label="Topic" name="topic" />
              <Select label="Mock category" name="mockCategory" options={MOCK_CATEGORIES.map((m) => ({ value: m.key, label: m.label }))} />
              <Select label="Mock type" name="mockType" options={MOCK_TYPES.map((m) => ({ value: m, label: m }))} />
              <div className="sm:col-span-3"><TextArea label="Instructions" name="instructions" rows={2} /></div>
            </ActionForm>
          </div>
        </details>
      )}
      {rows.length === 0 ? <Empty title="No assessments yet" /> : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Title</th><th>Type</th><th>Subject / class</th><th>Questions</th><th>Submitted</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link className="font-bold text-royal hover:underline" href={`/portal/assessments/${r.id}`}>{r.title}</Link></td>
                  <td>{LABEL[r.kind]}{r.mock_category && <span className="block text-xs text-muted uppercase">{r.mock_category}</span>}</td>
                  <td>{r.subject ?? "—"}<br /><span className="text-xs text-muted">{r.class_name ? classLabel({ name: r.class_name, arm: r.arm, department: r.dept }) : "Open"}</span></td>
                  <td>{r.questions}</td><td>{r.submissions}</td><td><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
