import { redirect } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { studentOf } from "@/lib/scope";
import { getSetting } from "@/lib/settings";
import { Badge, Card, Empty, Notice, PageHeader } from "@/components/ui";
import { DEFAULT_EXAM_ELIGIBILITY, MOCK_CATEGORIES } from "@/lib/logic/academics";
import { beginAssessment } from "../work/actions";

export const metadata = { title: "Mock centre" };

export default async function Mocks({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requireMe();
  if (me.role !== "student") redirect("/portal");
  const sp = await searchParams;
  const st = await studentOf(me.id);
  if (!st) return <Empty title="Student record not found" />;
  const elig = (await getSetting<Record<string, number[]>>("eligibility")) ?? DEFAULT_EXAM_ELIGIBILITY;
  const level = st.class_level as number;
  const cats = MOCK_CATEGORIES.filter((c) => (elig[c.key] ?? []).includes(level));
  const rows = cats.length ? await sql`
    SELECT a.id, a.title, a.mock_category, a.mock_type, a.duration_min, a.attempt_limit, s.name AS subject,
      (SELECT count(*)::int FROM assessment_questions aq WHERE aq.assessment_id = a.id) AS questions,
      (SELECT count(*)::int FROM attempts t WHERE t.assessment_id = a.id AND t.student_id = ${st.id}) AS used,
      (SELECT t.id FROM attempts t WHERE t.assessment_id = a.id AND t.student_id = ${st.id} AND t.status = 'in_progress' LIMIT 1) AS open_attempt,
      (SELECT max(CASE WHEN t.max_score > 0 THEN round((t.score / t.max_score * 100)::numeric, 0) END) FROM attempts t WHERE t.assessment_id = a.id AND t.student_id = ${st.id} AND t.status = 'submitted') AS best
    FROM assessments a LEFT JOIN subjects s ON s.id = a.subject_id
    WHERE a.school_id = ${st.school_id} AND a.kind = 'mock' AND a.status = 'published'
      AND a.mock_category = ANY(${cats.map((c) => c.key)}) AND (a.class_id IS NULL OR a.class_id = ${st.class_id})
    ORDER BY a.mock_category, a.created_at DESC` : [];
  return (
    <>
      <PageHeader title="Mock centre" sub="Practise for the examinations your class is eligible for. Mocks give instant feedback and do not affect your term result." />
      {sp.error && <div className="mb-4"><Notice kind="bad">{sp.error}</Notice></div>}
      {cats.length === 0 && <Empty title="No mock examinations for your class level">Mocks open for Basic 5–6 (Common Entrance), JSS 2–3 (BECE) and SSS 2–3 (NECO, WAEC, JAMB).</Empty>}
      {cats.map((c) => {
        const list = rows.filter((r) => r.mock_category === c.key);
        return (
          <section key={c.key} className="mb-8">
            <h2 className="text-2xl">{c.label}</h2><p className="text-sm text-muted">{c.blurb}</p>
            {list.length === 0 ? <p className="mt-3 text-sm text-muted">No {c.label} mocks published yet.</p> : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {list.map((r) => (
                  <Card key={r.id}>
                    <p className="font-display text-lg">{r.title}</p>
                    <p className="text-sm text-muted">{r.subject ?? "All subjects"} · {r.mock_type ?? "Mock"} · {r.questions} questions · {r.duration_min} min</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm">{r.best !== null ? <Badge tone="ok">Best {r.best}%</Badge> : <Badge>Not attempted</Badge>} <span className="text-xs text-muted">{r.used}/{r.attempt_limit} attempts</span></span>
                      {(r.open_attempt || r.used < r.attempt_limit) && (
                        <form action={beginAssessment}><input type="hidden" name="id" value={r.id} /><button className="btn btn-primary btn-sm">{r.open_attempt ? "Resume" : "Start"}</button></form>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
