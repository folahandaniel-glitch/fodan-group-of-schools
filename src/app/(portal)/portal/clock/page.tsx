import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { ClockButtons } from "@/components/clock-buttons";

export const metadata = { title: "Clock in / out" };
export const dynamic = "force-dynamic";

export default async function ClockPage() {
  const me = await requirePerm("clock:view");
  const day = new Date(Date.now() + 3600_000).toISOString().slice(0, 10);
  const [prof] = await sql`SELECT b.name, b.radius_m FROM staff_profiles p LEFT JOIN branches b ON b.id = p.branch_id WHERE p.user_id = ${me.id}`;
  const [today] = await sql`SELECT clock_in, clock_out, late_minutes FROM clock_entries WHERE user_id = ${me.id} AND day = ${day}`;
  const mine = await sql`SELECT day, clock_in, clock_out, late_minutes FROM clock_entries WHERE user_id = ${me.id} ORDER BY day DESC LIMIT 20`;
  const fines = await sql`SELECT day, reason, amount, status FROM fines WHERE user_id = ${me.id} ORDER BY day DESC LIMIT 10`;
  const team = can(me, "clock:manage")
    ? await sql`SELECT u.first_name || ' ' || u.last_name AS name, c.clock_in, c.clock_out, c.late_minutes, b.name AS branch FROM clock_entries c
                JOIN users u ON u.id = c.user_id LEFT JOIN branches b ON b.id = c.branch_id WHERE c.school_id = ${me.schoolId} AND c.day = ${day} ORDER BY c.clock_in DESC LIMIT 100`
    : [];
  const t = (d: unknown) => (d ? new Date(String(d)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }) : "—");
  return (
    <>
      <PageHeader title="Clock in / out" sub={prof?.name ? `Branch: ${prof.name} · you must be within ${prof.radius_m} m to clock.` : "You have not been assigned to a branch yet."} />
      <Card className="mb-5">
        <ClockButtons canIn={!today} canOut={!!today && !today.clock_out} />
        {today && <p className="mt-2 text-sm text-muted">Today: in {t(today.clock_in)} · out {t(today.clock_out)}{today.late_minutes > 0 ? ` · ${today.late_minutes} min late` : ""}</p>}
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><h2 className="text-xl">My recent days</h2>
          {mine.length === 0 ? <p className="mt-2 text-sm text-muted">No records yet.</p> : (
            <ul className="mt-3 divide-y divide-line text-sm">{mine.map((r) => (
              <li key={String(r.day)} className="flex justify-between py-2"><span>{new Date(r.day).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
                <span>{t(r.clock_in)} – {t(r.clock_out)} {r.late_minutes > 0 && <Badge tone="warn">{r.late_minutes} min late</Badge>}</span></li>))}</ul>)}
        </Card>
        <Card><h2 className="text-xl">My fines</h2>
          {fines.length === 0 ? <p className="mt-2 text-sm text-muted">No fines.</p> : (
            <ul className="mt-3 divide-y divide-line text-sm">{fines.map((f, i) => (
              <li key={i} className="flex justify-between py-2"><span>{f.reason}<br /><span className="text-xs text-muted">{new Date(f.day).toLocaleDateString("en-GB")}</span></span>
                <span><b>₦{Number(f.amount).toLocaleString()}</b> <Badge tone={f.status === "waived" ? "ok" : "warn"}>{f.status}</Badge></span></li>))}</ul>)}
        </Card>
      </div>
      {can(me, "clock:manage") && (
        <Card className="mt-5"><h2 className="text-xl">Everyone today</h2>
          {team.length === 0 ? <div className="mt-2"><Empty title="Nobody has clocked in yet" /></div> : (
            <div className="mt-3 overflow-x-auto"><table className="tbl"><thead><tr><th>Name</th><th>Branch</th><th>In</th><th>Out</th><th>Late</th></tr></thead>
              <tbody>{team.map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.branch ?? "—"}</td><td>{t(r.clock_in)}</td><td>{t(r.clock_out)}</td><td>{r.late_minutes > 0 ? `${r.late_minutes} min` : "—"}</td></tr>)}</tbody></table></div>)}
        </Card>
      )}
    </>
  );
}
