import Link from "next/link";
import { redirect } from "next/navigation";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { Badge, Card, Empty, PageHeader, Stat } from "@/components/ui";
import { service } from "@/lib/logic/hr";
import { hideDev } from "@/lib/visibility";
import { HrNav } from "../hr-nav";

export const metadata = { title: "Staff directory" };
export const dynamic = "force-dynamic";
type Row = Record<string, any>;

export default async function Directory({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  if (["student", "parent"].includes(me.role)) redirect("/portal");
  if (!(can(me, "hrm:manage") || can(me, "hrm:review") || can(me, "staff:view"))) redirect("/forbidden");
  const sp = await searchParams, q = str(sp.q).trim().slice(0, 60), like = "%" + q.replace(/[%_\\]/g, "") + "%";
  const rows: Row[] = await sql`
    SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.status, p.position, p.category, p.employment_date, p.employment_status, p.employee_id, b.name AS branch,
      (SELECT count(*)::int FROM hr_leave l WHERE l.user_id = u.id AND l.status = 'approved' AND l.from_on <= current_date AND l.to_on >= current_date) AS on_leave
    FROM users u LEFT JOIN staff_profiles p ON p.user_id = u.id LEFT JOIN branches b ON b.id = (SELECT branch_id FROM staff_profiles WHERE user_id = u.id)
    WHERE u.school_id = ${me.schoolId} AND u.role NOT IN ('student','parent') ${hideDev(me, "u.role")} ${q ? sql`AND (u.first_name ILIKE ${like} OR u.last_name ILIKE ${like} OR p.position ILIKE ${like})` : sql``}
    ORDER BY u.last_name, u.first_name LIMIT 500`;
  const active = rows.filter((r) => r.status === "active");
  const byCat = (c: string) => active.filter((r) => r.category === c).length;
  return (
    <>
      <PageHeader title="Staff directory" sub="Everyone who works at the school, with position, branch and length of service." />
      <HrNav current="/portal/hrm/directory" />
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Active staff" value={active.length} /><Stat label="Teaching" value={byCat("teaching")} tone="royal" /><Stat label="Non-teaching" value={byCat("non_teaching")} /><Stat label="On leave today" value={rows.filter((r) => r.on_leave > 0).length} tone="royal" /></section>
      <Card className="mb-5"><form className="flex flex-wrap gap-2" role="search"><input name="q" defaultValue={q} className="input !w-72" placeholder="Search name or position" aria-label="Search staff" /><button className="btn btn-primary btn-sm">Search</button></form></Card>
      <Card pad={false} className="overflow-x-auto">
        {rows.length === 0 ? <div className="p-5"><Empty title="No staff found" /></div> : (
          <table className="tbl min-w-[46rem] text-sm"><thead><tr><th>Name</th><th>Position</th><th>Branch</th><th>Service</th><th>Contact</th><th>Status</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}><td className="font-bold"><Link className="text-royal" href={`/portal/staff/${r.id}`}>{r.last_name}, {r.first_name}</Link><br /><span className="text-xs font-normal text-muted">{r.employee_id ?? ""}</span></td>
                <td>{r.position ?? r.role}</td><td>{r.branch ?? "-"}</td><td>{service(r.employment_date)}</td><td className="text-xs">{r.email}<br />{r.phone}</td>
                <td>{r.on_leave > 0 ? <Badge tone="warn">on leave</Badge> : <Badge tone={r.status === "active" ? "ok" : undefined}>{r.status}</Badge>}</td></tr>))}</tbody></table>)}
      </Card>
    </>
  );
}
