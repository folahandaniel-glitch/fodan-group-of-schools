import { redirect } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { studentOf } from "@/lib/scope";
import { Badge, Card, Empty, Notice, PageHeader } from "@/components/ui";
import { beginAssessment } from "./actions";

export const metadata = { title: "Assignments & tests" };
const LABEL: Record<string, string> = { assignment: "Assignment", ca: "CA test", exam: "Terminal exam", mock: "Make-up mock exam", classwork: "Classwork", practice: "Assignment" };

export default async function Work({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requireMe();
  if (me.role !== "student") redirect("/portal");
  const sp = await searchParams;
  const st = await studentOf(me.id);
  if (!st) return <Empty title="Student record not found" />;
  const rows = await sql`
    SELECT a.id, a.title, a.kind, a.duration_min, a.attempt_limit, a.start_at, a.due_at, s.name AS subject,
      (SELECT count(*)::int FROM attempts t WHERE t.assessment_id = a.id AND t.student_id = ${st.id}) AS used,
      (SELECT t.id FROM attempts t WHERE t.assessment_id = a.id AND t.student_id = ${st.id} AND t.status = 'in_progress' LIMIT 1) AS open_attempt,
      (SELECT max(CASE WHEN t.max_score > 0 THEN round((t.score / t.max_score * 100)::numeric, 0) END) FROM attempts t WHERE t.assessment_id = a.id AND t.student_id = ${st.id} AND t.status = 'submitted') AS best,
      a.released,
      (SELECT count(*)::int FROM exam_grants g WHERE g.assessment_id = a.id AND g.student_id = ${st.id} AND NOT g.used AND (g.window_until IS NULL OR g.window_until > now())) AS grants,
      (SELECT to_char(sl.day, 'DD Mon YYYY') || ' ' || sl.start_time || ' (' || sl.duration_min || ' min)' FROM exam_slots sl WHERE sl.assessment_id = a.id AND sl.class_id = ${st.class_id} LIMIT 1) AS slot
    FROM assessments a LEFT JOIN subjects s ON s.id = a.subject_id
    WHERE a.status IN ('published','closed') AND ((a.class_id = ${st.class_id} AND a.kind NOT IN ('mock','classwork','practice')) OR EXISTS (SELECT 1 FROM exam_grants g WHERE g.assessment_id = a.id AND g.student_id = ${st.id} AND NOT g.used AND (g.window_until IS NULL OR g.window_until > now())))
    ORDER BY a.due_at NULLS LAST, a.created_at DESC`;
  const now = Date.now();
  return (
    <>
      <PageHeader title="Assignments & tests" sub="Assignments, mid-term CA tests and terminal examinations for your class." />
      {sp.error && <div className="mb-4"><Notice kind="bad">{sp.error}</Notice></div>}
      {rows.length === 0 ? <Empty title="Nothing assigned yet">Your teachers will publish work here.</Empty> : (
        <div className="grid gap-3">
          {rows.map((r) => {
            const g = r.grants > 0;
            const closed = !g && r.due_at && new Date(r.due_at).getTime() < now;
            const notOpen = !g && r.start_at && new Date(r.start_at).getTime() > now;
            const canStart = r.open_attempt || g || (!closed && !notOpen && r.used < r.attempt_limit);
            return (
              <Card key={r.id} className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-display text-lg">{r.title}</p>
                  <p className="text-sm text-muted">{r.subject} · {LABEL[r.kind]} · {r.duration_min} min · attempts {r.used}/{r.attempt_limit}
                    {r.slot ? ` · timetable ${r.slot}` : ""}{g ? " · RETAKE / MAKE-UP ALLOWED" : ""}{r.due_at ? ` · due ${new Date(r.due_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" })}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  {r.best !== null && (r.released ? <Badge tone="ok">Best {r.best}%</Badge> : <Badge>Submitted</Badge>)}
                  {closed && r.best === null && <Badge tone="bad">Closed</Badge>}
                  {notOpen && <Badge tone="warn">Not open yet</Badge>}
                  {canStart && (
                    <form action={beginAssessment}><input type="hidden" name="id" value={r.id} />
                      <button className="btn btn-primary">{r.open_attempt ? "Resume" : r.used > 0 ? "Try again" : "Start"}</button></form>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
