import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { Badge, Card, Empty, Field, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { assignBranch, saveBranch, saveFineRules, waiveFine } from "./actions";

export const metadata = { title: "Branches & fines" };
export const dynamic = "force-dynamic";

export default async function Branches() {
  const me = await requirePerm("branches:view");
  const manage = can(me, "branches:manage");
  const rules = (await getSetting<{ workStart: string; graceMinutes: number; perMinute: number; lateFlat: number; absentFine: number; defaultRadius: number; enabled: boolean }>("fines")) ?? { workStart: "08:00", graceMinutes: 10, perMinute: 0, lateFlat: 500, absentFine: 0, defaultRadius: 150, enabled: true };
  const branches = await sql`SELECT b.*, (SELECT count(*)::int FROM staff_profiles p WHERE p.branch_id = b.id) AS staff FROM branches b WHERE b.school_id = ${me.schoolId} ORDER BY b.name`;
  const staff = manage ? await sql`SELECT u.id, u.first_name, u.last_name, p.branch_id FROM users u JOIN staff_profiles p ON p.user_id = u.id
                                   WHERE u.school_id = ${me.schoolId} AND u.status = 'active' ORDER BY u.last_name LIMIT 300` : [];
  const fines = can(me, "fines:view") ? await sql`SELECT f.id, f.day, f.reason, f.amount, f.status, u.first_name || ' ' || u.last_name AS name FROM fines f JOIN users u ON u.id = f.user_id
                                                  WHERE f.school_id = ${me.schoolId} ORDER BY f.day DESC, f.created_at DESC LIMIT 40` : [];
  return (
    <>
      <PageHeader title="Branches, clock-in rules & fines" sub="Add branches with map coordinates, assign staff, and set the rules that fines are calculated from." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl">Branches</h2>
          {branches.length === 0 ? <div className="mt-3"><Empty title="No branches yet" /></div> : (
            <ul className="mt-3 divide-y divide-line">
              {branches.map((b) => (
                <li key={b.id} className="py-3">
                  <p className="font-bold">{b.name} {!b.active && <Badge tone="bad">inactive</Badge>}</p>
                  <p className="text-xs text-muted">{b.address} · {b.lat?.toFixed(5)}, {b.lng?.toFixed(5)} · {b.radius_m} m · {b.staff} staff</p>
                  {manage && (
                    <details className="mt-2"><summary className="cursor-pointer text-sm font-bold text-royal">Edit</summary>
                      <div className="mt-2"><ActionForm action={saveBranch} submit="Save" small className="grid gap-2 sm:grid-cols-2">
                        <input type="hidden" name="id" value={b.id} />
                        <Field label="Name" name="name" defaultValue={b.name} required /><Field label="Coordinates (lat, lng)" name="coords" defaultValue={`${b.lat}, ${b.lng}`} required />
                        <Field label="Address" name="address" defaultValue={b.address} /><Field label="Radius (m)" name="radius" type="number" defaultValue={b.radius_m} />
                        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={b.active} /> Active</label>
                      </ActionForm></div></details>
                  )}
                </li>
              ))}
            </ul>
          )}
          {manage && (
            <div className="mt-4 border-t border-line pt-4"><h3 className="text-lg">Add a branch</h3>
              <ActionForm action={saveBranch} submit="Add branch" className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field label="Name" name="name" required /><Field label="Coordinates" name="coords" required placeholder="6.5244, 3.3792" hint="Right-click the spot in Google Maps and copy the numbers." />
                <Field label="Address" name="address" /><Field label="Clock-in radius (m)" name="radius" type="number" defaultValue={rules.defaultRadius} />
              </ActionForm></div>
          )}
        </Card>

        <Card>
          <h2 className="text-xl">Fine rules</h2>
          {can(me, "fines:manage") ? (
            <div className="mt-3"><ActionForm action={saveFineRules} submit="Save rules" className="grid gap-3 sm:grid-cols-2">
              <Field label="Resumption time" name="workStart" defaultValue={rules.workStart} hint="24-hour, e.g. 08:00" />
              <Field label="Grace (minutes)" name="graceMinutes" type="number" defaultValue={rules.graceMinutes} />
              <Field label="Flat fine for lateness (₦)" name="lateFlat" type="number" defaultValue={rules.lateFlat} />
              <Field label="Extra per late minute (₦)" name="perMinute" type="number" defaultValue={rules.perMinute} />
              <Field label="Absence fine (₦)" name="absentFine" type="number" defaultValue={rules.absentFine} />
              <Field label="Default radius (m)" name="defaultRadius" type="number" defaultValue={rules.defaultRadius} />
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="enabled" defaultChecked={rules.enabled} /> Apply fines automatically</label>
            </ActionForm></div>
          ) : <p className="mt-2 text-sm text-muted">Resume {rules.workStart}, grace {rules.graceMinutes} min, flat ₦{rules.lateFlat}.</p>}
        </Card>
      </div>

      {manage && staff.length > 0 && (
        <Card className="mt-5"><h2 className="text-xl">Assign staff to a branch</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {staff.map((s) => (
              <li key={s.id}><form action={assignBranch} className="flex items-center gap-2"><input type="hidden" name="user" value={s.id} />
                <span className="w-40 shrink-0 truncate text-sm font-semibold">{s.last_name}, {s.first_name}</span>
                <select name="branch" defaultValue={s.branch_id ?? ""} className="select !min-h-9 !py-1 text-sm" aria-label={`Branch for ${s.first_name}`}><option value="">None</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                <button className="btn btn-ghost btn-sm">Set</button></form></li>
            ))}
          </ul>
        </Card>
      )}

      {fines.length > 0 && (
        <Card className="mt-5"><h2 className="text-xl">Recent fines</h2>
          <div className="mt-3 overflow-x-auto"><table className="tbl"><thead><tr><th>Staff</th><th>Date</th><th>Reason</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>{fines.map((f) => (
              <tr key={f.id}><td>{f.name}</td><td>{new Date(f.day).toLocaleDateString("en-GB")}</td><td>{f.reason}</td><td>₦{Number(f.amount).toLocaleString()}</td>
                <td><Badge tone={f.status === "waived" ? "ok" : "warn"}>{f.status}</Badge></td>
                <td>{can(me, "fines:manage") && <form action={waiveFine}><input type="hidden" name="id" value={f.id} /><button className="btn btn-ghost btn-sm">{f.status === "waived" ? "Re-apply" : "Waive"}</button></form>}</td></tr>))}</tbody></table></div>
        </Card>
      )}
    </>
  );
}
