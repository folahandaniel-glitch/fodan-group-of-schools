import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { kpiScore } from "@/lib/logic/payroll";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Staff performance" };
export const dynamic = "force-dynamic";

export default async function Performance({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("performance:view");
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(str(sp.month)) ? str(sp.month) : new Date().toISOString().slice(0, 7);
  const from = `${month}-01`;
  const all = can(me, "performance:manage") || can(me, "*");
  const rows = await sql`
    SELECT u.id, u.first_name, u.last_name, p.position,
      (SELECT count(*)::int FROM clock_entries c WHERE c.user_id = u.id AND c.day >= ${from}::date AND c.day < ${from}::date + interval '1 month') AS days,
      (SELECT count(*)::int FROM clock_entries c WHERE c.user_id = u.id AND c.late_minutes = 0 AND c.day >= ${from}::date AND c.day < ${from}::date + interval '1 month') AS ontime,
      (SELECT count(*)::int FROM records r WHERE r.module = 'deliverables' AND r.owner_id = u.id AND r.data->>'period' = ${month}) AS d_total,
      (SELECT count(*)::int FROM records r WHERE r.module = 'deliverables' AND r.owner_id = u.id AND r.data->>'period' = ${month} AND r.status = 'approved') AS d_ok,
      (SELECT count(*)::int FROM records r WHERE r.module = 'tasks' AND r.assignee_id = u.id AND r.created_at >= ${from}::date AND r.created_at < ${from}::date + interval '1 month') AS t_total,
      (SELECT count(*)::int FROM records r WHERE r.module = 'tasks' AND r.assignee_id = u.id AND r.status = 'done' AND r.created_at >= ${from}::date AND r.created_at < ${from}::date + interval '1 month') AS t_ok
    FROM users u LEFT JOIN staff_profiles p ON p.user_id = u.id
    WHERE u.school_id = ${me.schoolId} AND u.role NOT IN ('student','parent') AND u.status = 'active' ${all ? sql`` : sql`AND u.id = ${me.id}`}
    ORDER BY u.last_name LIMIT 300`;
  const scored = (rows as unknown as Record<string, any>[]).map((r) => {
    const score = kpiScore({ punctuality: r.days ? Math.round((r.ontime / r.days) * 100) : null, deliverables: r.d_total ? Math.round((r.d_ok / r.d_total) * 100) : null, tasks: r.t_total ? Math.round((r.t_ok / r.t_total) * 100) : null });
    const flags = [r.days && r.days - r.ontime >= 3 ? "3+ late arrivals" : "", r.t_total - r.t_ok >= 3 ? "3+ open tasks" : "", score !== null && score < 50 ? "KPI under 50%" : ""].filter(Boolean);
    return { ...r, score, flags } as Record<string, any>;
  });
  return (
    <>
      <PageHeader title="Staff performance" sub="KPI = 40% punctuality (clock-in) + 40% approved deliverables + 20% completed tasks for the month. Missing parts are excluded, not counted as zero." />
      <Card className="mb-5"><form className="flex flex-wrap items-end gap-3" role="search">
        <div className="field"><label htmlFor="month">Month</label><input id="month" name="month" type="month" defaultValue={month} className="input" /></div>
        <button className="btn btn-primary">Show</button></form></Card>
      {scored.length === 0 ? <Empty title="No staff to show" /> : (
        <div className="card overflow-x-auto"><table className="tbl text-sm">
          <thead><tr><th>Staff</th><th>Punctuality</th><th>Deliverables</th><th>Tasks</th><th>KPI</th><th>Flags</th></tr></thead>
          <tbody>{scored.map((r) => (
            <tr key={r.id}><td><b>{r.last_name}, {r.first_name}</b><br /><span className="text-xs text-muted">{r.position}</span></td>
              <td>{r.days ? `${r.ontime}/${r.days} on time` : "—"}</td><td>{r.d_total ? `${r.d_ok}/${r.d_total} approved` : "—"}</td><td>{r.t_total ? `${r.t_ok}/${r.t_total} done` : "—"}</td>
              <td className="font-display text-xl">{r.score ?? "—"}{r.score !== null && "%"}</td>
              <td>{r.flags.map((f: string) => <Badge key={f} tone="warn">{f}</Badge>)}</td></tr>))}</tbody></table></div>
      )}
    </>
  );
}
