import { requirePerm } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses, listTerms, str } from "@/lib/data";
import { teacherClassIds, wideScope } from "@/lib/scope";
import { currentTerm, getSetting } from "@/lib/settings";
import { Card, Empty, PageHeader, Stat } from "@/components/ui";
import { DEFAULT_GRADES, gradeFor, type GradeBand } from "@/lib/logic/scoring";

export const metadata = { title: "Analytics" };

function Bar({ value, max = 100, tone = "bg-royal" }: { value: number; max?: number; tone?: string }) {
  return <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper-2" role="img" aria-label={`${value} of ${max}`}><div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>;
}

export default async function Analytics({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("analytics:view");
  const sp = await searchParams;
  const cur = await currentTerm();
  const termId = str(sp.term) || cur?.id || "";
  const scoped = wideScope(me) ? null : await teacherClassIds(me.id);
  const [classes, terms] = await Promise.all([listClasses(me.schoolId, scoped ? { ids: scoped } : {}), listTerms(me.schoolId)]);
  const bands = (await getSetting<GradeBand[]>("grading")) ?? DEFAULT_GRADES;
  const ids = classes.map((c) => c.id);
  const perClass = await sql`
    SELECT c.id, count(DISTINCT r.student_id)::int AS students, round(avg(r.total)::numeric, 1) AS avg, max(r.total) AS high, min(r.total) AS low,
           round((100.0 * count(*) FILTER (WHERE r.total >= 40) / NULLIF(count(*), 0))::numeric, 0) AS pass_rate
    FROM classes c JOIN results r ON r.class_id = c.id AND r.term_id = ${termId} WHERE c.id = ANY(${ids}) GROUP BY c.id`;
  const bySubject = await sql`
    SELECT s.name, round(avg(r.total)::numeric, 1) AS avg, count(*)::int AS n FROM results r JOIN subjects s ON s.id = r.subject_id
    WHERE r.term_id = ${termId} AND r.class_id = ANY(${ids}) GROUP BY s.name ORDER BY avg(r.total) DESC`;
  const byDept = await sql`
    SELECT d.name, count(DISTINCT r.student_id)::int AS students, round(avg(r.total)::numeric, 1) AS avg
    FROM results r JOIN classes c ON c.id = r.class_id JOIN departments d ON d.id = c.department_id
    WHERE r.term_id = ${termId} AND r.class_id = ANY(${ids}) GROUP BY d.name ORDER BY d.name`;
  const dist = await sql`SELECT grade, count(*)::int AS n FROM results WHERE term_id = ${termId} AND class_id = ANY(${ids}) GROUP BY grade`;
  const [overall] = await sql`SELECT round(avg(total)::numeric, 1) AS avg, count(*)::int AS n FROM results WHERE term_id = ${termId} AND class_id = ANY(${ids})`;
  const [mock] = await sql`SELECT round(avg(CASE WHEN t.max_score > 0 THEN t.score / t.max_score * 100 END)::numeric, 1) AS avg, count(*)::int AS n
                           FROM attempts t JOIN assessments a ON a.id = t.assessment_id WHERE a.school_id = ${me.schoolId} AND a.kind = 'mock' AND t.status = 'submitted'`;
  const byClass = new Map(perClass.map((p) => [p.id, p]));
  const gradeMax = Math.max(1, ...dist.map((d) => d.n));
  return (
    <>
      <PageHeader title="Analytics" sub="Class, subject and department performance for the selected term." />
      <Card className="mb-5">
        <form className="flex flex-wrap items-end gap-3" role="search">
          <div className="field"><label htmlFor="term">Term</label><select id="term" name="term" defaultValue={termId} className="select">{terms.map((t) => <option key={t.id} value={t.id}>{t.session} · {t.name}</option>)}</select></div>
          <button className="btn btn-primary">Apply</button>
        </form>
      </Card>
      {!overall?.n ? <Empty title="No results computed for this term yet" /> : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <Stat label="Average score" value={overall.avg} hint={`Grade ${gradeFor(Number(overall.avg), bands).grade}`} />
            <Stat label="Results recorded" value={overall.n} tone="royal" />
            <Stat label="Mock practice average" value={mock?.avg ? `${mock.avg}%` : "—"} hint={`${mock?.n ?? 0} submissions`} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <h2 className="text-xl">Grade distribution</h2>
              <ul className="mt-3 space-y-2">
                {[...bands].sort((a, b) => b.min - a.min).map((b) => {
                  const n = dist.find((d) => d.grade === b.grade)?.n ?? 0;
                  return <li key={b.grade} className="grid grid-cols-[2rem_1fr_2.5rem] items-center gap-3 text-sm"><b>{b.grade}</b><Bar value={n} max={gradeMax} tone={b.grade === "F" ? "bg-bad" : "bg-royal"} /><span className="text-right">{n}</span></li>;
                })}
              </ul>
            </Card>
            <Card>
              <h2 className="text-xl">Subject averages</h2>
              <ul className="mt-3 space-y-2">
                {bySubject.map((s) => <li key={s.name} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm"><span className="truncate">{s.name}</span><Bar value={Number(s.avg)} tone="bg-gold-2" /><span className="text-right font-bold">{s.avg}</span></li>)}
              </ul>
            </Card>
            <Card className="lg:col-span-2">
              <h2 className="text-xl">Classes</h2>
              <div className="mt-3 overflow-x-auto"><table className="tbl">
                <thead><tr><th>Class</th><th>Students</th><th>Average</th><th>Highest</th><th>Lowest</th><th>Pass rate</th></tr></thead>
                <tbody>{classes.map((c) => { const p = byClass.get(c.id); return p ? (
                  <tr key={c.id}><td className="font-bold">{c.label}</td><td>{p.students}</td><td>{p.avg}</td><td>{p.high}</td><td>{p.low}</td><td>{p.pass_rate}%</td></tr>) : null; })}</tbody>
              </table></div>
            </Card>
            {byDept.length > 0 && (
              <Card className="lg:col-span-2">
                <h2 className="text-xl">Senior Secondary departments</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {byDept.map((d) => <div key={d.name} className="rounded-xl border border-line p-4"><p className="text-sm text-muted">{d.name}</p><p className="font-display text-3xl">{d.avg}</p><p className="text-xs text-muted">{d.students} students</p></div>)}
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </>
  );
}
