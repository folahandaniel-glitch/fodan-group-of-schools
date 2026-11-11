import Link from "next/link";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { addDays, mondayOf, SHIFTS, SHIFT_TONE } from "@/lib/roster";
import { watToday } from "@/lib/scope";
import { Card, Empty, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { saveRoster } from "./actions";

export const metadata = { title: "Duty roster" };
export const dynamic = "force-dynamic";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type Row = Record<string, any>;

export default async function Roster({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  if (me.role === "student" || me.role === "parent") return <Empty title="Not available" />;
  const sp = await searchParams;
  const manage = can(me, "hrm:manage");
  const week = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(str(sp.week)) ? str(sp.week) : watToday().day);
  const days = DAYS.map((_, i) => addDays(week, i));
  const staff: Row[] = await sql`SELECT u.id, u.first_name, u.last_name, p.position FROM users u LEFT JOIN staff_profiles p ON p.user_id = u.id
    WHERE u.school_id = ${me.schoolId} AND u.status = 'active' AND u.role NOT IN ('student','parent','developer') ${manage ? sql`` : sql`AND u.id = ${me.id}`} ORDER BY u.last_name, u.first_name LIMIT 400`;
  const shifts: Row[] = await sql`SELECT user_id, to_char(day, 'YYYY-MM-DD') AS d, shift FROM roster_shifts WHERE school_id = ${me.schoolId} AND day BETWEEN ${week}::date AND ${days[6]}::date`;
  const at = (u: string, d: string) => shifts.find((s) => s.user_id === u && s.d === d)?.shift as string | undefined;
  const tint = (s?: string) => (s ? { background: `color-mix(in srgb, var(${SHIFT_TONE[s]}) 20%, var(--color-card))` } : undefined);
  const nav = (n: number) => `/portal/roster?week=${addDays(week, n)}`;

  return (
    <>
      <PageHeader title="Duty roster" sub={manage ? "Plan the week for every staff member. Staff see their own shifts; a day marked Off is never counted as an absence." : "Your shifts for the week."} />
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Link href={nav(-7)} className="btn btn-ghost btn-sm">← Previous week</Link>
        <span className="badge badge-info text-sm">{new Date(week).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {new Date(days[6]).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
        <Link href={nav(7)} className="btn btn-ghost btn-sm">Next week →</Link>
        <Link href="/portal/roster" className="btn btn-ghost btn-sm">This week</Link>
      </div>
      {staff.length === 0 ? <Empty title="No staff to roster" /> : manage ? (
        <ActionForm action={saveRoster} submit="Save roster" className="grid gap-3">
          <input type="hidden" name="week" value={week} />
          <Card pad={false} className="overflow-x-auto">
            <table className="tbl min-w-[56rem] text-sm"><thead><tr><th>Staff</th>{days.map((d, i) => <th key={d}>{DAYS[i]}<br /><span className="font-normal normal-case text-muted">{new Date(d).getUTCDate()}</span></th>)}</tr></thead>
              <tbody>{staff.map((s) => (
                <tr key={s.id}><td className="whitespace-nowrap"><b>{s.last_name}, {s.first_name}</b><br /><span className="text-xs text-muted">{s.position}</span></td>
                  {days.map((d, i) => (
                    <td key={d} style={tint(at(s.id, d))}><select name={`r_${s.id}_${i}`} defaultValue={at(s.id, d) ?? ""} className="select !min-h-8 !py-1 text-xs" aria-label={`${s.last_name} ${DAYS[i]}`}><option value="">—</option>{SHIFTS.map((x) => <option key={x}>{x}</option>)}</select></td>))}</tr>))}</tbody></table>
          </Card>
        </ActionForm>
      ) : (
        <Card><div className="grid grid-cols-2 gap-2 sm:grid-cols-7">{days.map((d, i) => {
          const sh = at(me.id, d);
          return <div key={d} className="rounded-2xl border border-line p-3 text-center" style={tint(sh)}><p className="text-xs font-bold uppercase tracking-wider text-muted">{DAYS[i]} {new Date(d).getUTCDate()}</p><p className="mt-1 font-bold">{sh ?? "—"}</p></div>;
        })}</div></Card>
      )}
    </>
  );
}
