import Link from "next/link";
import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listDepartments, opts, pageParams, str } from "@/lib/data";
import { Badge, Card, Empty, Field, PageHeader, Pager, Select, statusTone } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { ROLE_LABEL, STAFF_ROLES } from "@/lib/logic/permissions";
import { createStaff } from "./actions";

export const metadata = { title: "Staff" };

export default async function StaffList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("staff:view");
  const sp = await searchParams;
  const q = str(sp.q).trim(), status = str(sp.status) || "active";
  const { page, size, offset } = pageParams(sp);
  const depts = await listDepartments(me.schoolId);
  const where = sql`u.school_id = ${me.schoolId} AND u.role NOT IN ('student','parent') AND u.status = ${status}
    ${q ? sql`AND (u.first_name ILIKE ${"%" + q + "%"} OR u.last_name ILIKE ${"%" + q + "%"} OR u.email ILIKE ${"%" + q + "%"})` : sql``}`;
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM users u WHERE ${where}`;
  const rows = await sql`SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.status, p.position, p.is_senior, p.years_experience, d.name AS dept
                         FROM users u LEFT JOIN staff_profiles p ON p.user_id = u.id LEFT JOIN departments d ON d.id = p.department_id
                         WHERE ${where} ORDER BY u.last_name, u.first_name LIMIT ${size} OFFSET ${offset}`;
  const creatable = STAFF_ROLES.filter((r) => me.role === "super_admin" || r !== "proprietor");
  return (
    <>
      <PageHeader title="Staff" sub={`${n} ${status} staff account${n === 1 ? "" : "s"}`} />
      <Card className="mb-5">
        <form className="grid gap-3 sm:grid-cols-[1fr_180px_auto]" role="search">
          <input name="q" defaultValue={q} className="input" placeholder="Search name or email" aria-label="Search staff" />
          <select name="status" defaultValue={status} className="select" aria-label="Status">{["active", "suspended", "archived"].map((s) => <option key={s}>{s}</option>)}</select>
          <button className="btn btn-primary">Filter</button>
        </form>
      </Card>
      {can(me, "staff:create") && (
        <details className="card card-pad mb-5">
          <summary className="cursor-pointer font-display text-lg">Add a staff member</summary>
          <p className="mt-1 text-sm text-muted">No password is typed or shown. A one-time invitation link lets the staff member choose their own.</p>
          <div className="mt-4">
            <ActionForm action={createStaff} submit="Create account and invitation" className="grid gap-4 sm:grid-cols-3">
              <Field label="First name" name="firstName" required />
              <Field label="Last name" name="lastName" required />
              <Field label="Email (username)" name="email" type="email" required />
              <Select label="Role" name="role" required allowEmpty={false} defaultValue="teacher" options={creatable.map((r) => ({ value: r, label: ROLE_LABEL[r] ?? r }))} />
              <Field label="Position / title" name="position" placeholder="e.g. Mathematics Teacher" />
              <Select label="Department" name="departmentId" options={opts(depts, (d) => d.name)} />
              <Field label="Employee ID" name="employeeId" />
              <Field label="Qualification" name="qualification" />
              <Field label="Phone" name="phone" type="tel" />
              <Field label="Years of experience" name="years" type="number" min={0} />
              <Field label="Employment date" name="employmentDate" type="date" />
            </ActionForm>
          </div>
        </details>
      )}
      {rows.length === 0 ? <Empty title="No staff accounts yet" /> : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Role</th><th>Position</th><th>Department</th><th>Experience</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link className="font-bold text-royal hover:underline" href={`/portal/staff/${r.id}`}>{r.last_name}, {r.first_name}</Link>
                    {r.is_senior && <> <Badge tone="info">Senior</Badge></>}<br /><span className="text-xs text-muted">{r.email}</span></td>
                  <td>{ROLE_LABEL[r.role] ?? r.role}</td><td>{r.position ?? "—"}</td><td>{r.dept ?? "—"}</td>
                  <td>{r.years_experience ? `${r.years_experience} yrs` : "—"}</td><td><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pages={Math.ceil(n / size)} base={`/portal/staff?q=${encodeURIComponent(q)}&status=${status}`} />
    </>
  );
}
