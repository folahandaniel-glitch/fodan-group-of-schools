import Link from "next/link";
import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { pageParams, str } from "@/lib/data";
import { Badge, Card, Empty, PageHeader, Pager, statusTone } from "@/components/ui";
import { ROLE_LABEL, ROLES } from "@/lib/logic/permissions";
import { setUserStatus, revokeSessions } from "./actions";
import { ResetLink } from "@/components/reset-link";

export const metadata = { title: "Users & access" };

export default async function Users({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("users:view");
  const sp = await searchParams;
  const q = str(sp.q).trim(), role = str(sp.role), status = str(sp.status);
  const { page, size, offset } = pageParams(sp, 25);
  const where = sql`school_id = ${me.schoolId} ${role ? sql`AND role = ${role}` : sql``} ${status ? sql`AND status = ${status}` : sql``}
    ${q ? sql`AND (email ILIKE ${"%" + q + "%"} OR first_name ILIKE ${"%" + q + "%"} OR last_name ILIKE ${"%" + q + "%"})` : sql``}`;
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM users WHERE ${where}`;
  const rows = await sql`SELECT id, email, first_name, last_name, role, status, mfa_enabled, last_login, failed_logins FROM users WHERE ${where} ORDER BY created_at DESC LIMIT ${size} OFFSET ${offset}`;
  const manage = can(me, "users:manage");
  return (
    <>
      <PageHeader title="Users & access" sub="Account control without password visibility: suspend, restore, revoke sessions or issue a one-time reset link." />
      <Card className="mb-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_200px_160px_auto]" role="search">
          <input name="q" defaultValue={q} className="input" placeholder="Search name or email" aria-label="Search users" />
          <select name="role" defaultValue={role} className="select" aria-label="Role"><option value="">All roles</option>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
          <select name="status" defaultValue={status} className="select" aria-label="Status"><option value="">Any status</option>{["active", "suspended", "archived"].map((s) => <option key={s}>{s}</option>)}</select>
          <button className="btn btn-primary">Filter</button>
        </form>
      </Card>
      {rows.length === 0 ? <Empty title="No users" /> : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>User</th><th>Role</th><th>Security</th><th>Last sign-in</th><th>Status</th>{manage && <th>Actions</th>}</tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.last_name}, {u.first_name}</b><br /><span className="text-xs text-muted">{u.email}</span></td>
                  <td>{ROLE_LABEL[u.role] ?? u.role}</td>
                  <td className="text-xs">{u.mfa_enabled ? <Badge tone="ok">2FA</Badge> : <Badge>No 2FA</Badge>}{u.failed_logins > 0 && <> <Badge tone="warn">{u.failed_logins} failed</Badge></>}</td>
                  <td className="text-xs">{u.last_login ? new Date(u.last_login).toLocaleString("en-GB") : "Never"}</td>
                  <td><Badge tone={statusTone(u.status)}>{u.status}</Badge></td>
                  {manage && (
                    <td className="min-w-[14rem]">
                      {u.role !== "super_admin" && u.id !== me.id && (
                        <div className="flex flex-wrap gap-1">
                          <form action={setUserStatus}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="status" value={u.status === "active" ? "suspended" : "active"} />
                            <button className="btn btn-ghost btn-sm">{u.status === "active" ? "Suspend" : "Restore"}</button></form>
                          <form action={revokeSessions}><input type="hidden" name="id" value={u.id} /><button className="btn btn-ghost btn-sm">Sign out everywhere</button></form>
                        </div>
                      )}
                      {u.role !== "super_admin" && <div className="mt-1"><ResetLink userId={u.id} /></div>}
                      {["student"].includes(u.role) ? null : u.role !== "parent" && <Link className="mt-1 inline-block text-xs font-bold text-royal hover:underline" href={`/portal/staff/${u.id}`}>Profile</Link>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pages={Math.ceil(n / size)} base={`/portal/users?q=${encodeURIComponent(q)}&role=${role}&status=${status}`} />
    </>
  );
}
