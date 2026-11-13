import { RESOURCES } from "@/lib/logic/permissions";
import { hideDev } from "@/lib/visibility";
import { notFound } from "next/navigation";
import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listDepartments, opts, ymd } from "@/lib/data";
import { classLabel, getSetting } from "@/lib/settings";
import { isSenior, type Seniority } from "@/lib/logic/academics";
import { Badge, Card, Field, Notice, PageHeader, Select, TextArea, statusTone } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { ResetLink } from "@/components/reset-link";
import { ROLE_LABEL, STAFF_ROLES, isRoot } from "@/lib/logic/permissions";
import { addExtraRole, removeExtraRole, saveGrants, setStaffRole, setStaffStatus, updateStaff } from "../actions";

export const dynamic = "force-dynamic";

export default async function StaffDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const me = await requirePerm("staff:view");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [u] = await sql`SELECT u.*, p.* , u.id AS id FROM users u LEFT JOIN staff_profiles p ON p.user_id = u.id
                         WHERE u.id = ${id} AND u.school_id = ${me.schoolId} AND u.role NOT IN ('student','parent') ${hideDev(me, "u.role")}`;
  if (!u) notFound();
  const depts = await listDepartments(me.schoolId);
  const rule = await getSetting<Seniority>("seniority");
  const grants = new Set((await sql`SELECT perm FROM user_grants WHERE user_id = ${id}`).map((g) => g.perm as string));
  const extraRoles = await sql`SELECT role FROM user_roles WHERE user_id = ${id}`;
  const classTeacherOf = await sql`SELECT c.name, c.arm, d.name AS dept FROM classes c LEFT JOIN departments d ON d.id = c.department_id WHERE c.class_teacher_id = ${id} AND NOT c.archived`;
  const subjectLoad = await sql`SELECT c.name, c.arm, d.name AS dept, s.name AS subject FROM class_subjects cs JOIN classes c ON c.id = cs.class_id JOIN subjects s ON s.id = cs.subject_id
                                LEFT JOIN departments d ON d.id = c.department_id WHERE cs.teacher_id = ${id} AND NOT c.archived`;
  const transfers = await sql`SELECT t.*, f.name AS from_name, f.arm AS from_arm, c.name AS to_name, c.arm AS to_arm FROM teacher_transfers t
                              LEFT JOIN classes f ON f.id = t.from_class_id LEFT JOIN classes c ON c.id = t.to_class_id WHERE t.teacher_id = ${id} ORDER BY t.created_at DESC LIMIT 20`;
  const edit = can(me, "staff:edit");
  const eligibleSenior = rule ? isSenior({ years: u.years_experience ?? 0, qualification: u.qualification ?? "", positionRank: 0 }, rule) : false;

  return (
    <>
      <PageHeader eyebrow={ROLE_LABEL[u.role] ?? u.role} title={`${u.first_name} ${u.last_name}`} sub={u.email} actions={<Badge tone={statusTone(u.status)}>{u.status}</Badge>} />
      {sp.created && <div className="mb-5"><Notice kind="ok">Account created. Use “Generate password-reset link” under Account control to give the staff member a one-time link for choosing their own password.</Notice></div>}
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <h2 className="text-xl">Professional profile</h2>
          <div className="mt-3">
            {edit ? (
              <ActionForm action={updateStaff} submit="Save profile" className="grid gap-3 sm:grid-cols-2" encType="multipart/form-data">
                <input type="hidden" name="id" value={id} />
                <Field label="First name" name="firstName" defaultValue={u.first_name} required />
                <Field label="Last name" name="lastName" defaultValue={u.last_name} required />
                <Field label="Phone" name="phone" defaultValue={u.phone} />
                <Field label="Employee ID" name="employeeId" defaultValue={u.employee_id} />
                <Field label="Position" name="position" defaultValue={u.position} />
                <Select label="Department" name="departmentId" defaultValue={u.department_id} options={opts(depts, (d) => d.name)} />
                <Field label="Qualification" name="qualification" defaultValue={u.qualification} />
                <Field label="Professional certification" name="certification" defaultValue={u.certification} />
                <Field label="Years of experience" name="years" type="number" min={0} defaultValue={u.years_experience} />
                <Field label="Employment date" name="employmentDate" type="date" defaultValue={ymd(u.employment_date)} />
                <Field label="Specialisation" name="specialization" defaultValue={u.specialization} />
                <Field label="Subjects taught (display)" name="subjectsText" defaultValue={u.subjects_text} />
                <div className="sm:col-span-2"><TextArea label="Biography" name="bio" defaultValue={u.bio} /></div>
                <div className="field"><label htmlFor="photo">Photograph (PNG/JPG/WebP, max 4 MB)</label><input id="photo" name="photo" type="file" accept="image/png,image/jpeg,image/webp" className="input" /></div>
                <Field label="Display order" name="sort" type="number" defaultValue={u.sort ?? 100} />
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="isSenior" defaultChecked={u.is_senior} /> Senior staff{eligibleSenior && !u.is_senior ? " (meets seniority rule)" : ""}</label>
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="public" defaultChecked={u.public ?? true} /> Show on public staff portfolio</label>
              </ActionForm>
            ) : <p className="text-sm text-ink-2">{u.bio ?? "No biography yet."}</p>}
          </div>
        </Card>

        <div className="grid h-fit gap-5">
          <Card>
            <h2 className="text-xl">Current responsibilities</h2>
            <div className="mt-2 text-sm">
              <p className="font-bold">Class teacher of</p>
              {classTeacherOf.length === 0 ? <p className="text-muted">No class.</p> : <p>{classTeacherOf.map((c) => classLabel({ name: c.name, arm: c.arm, department: c.dept })).join(", ")}</p>}
              <p className="mt-3 font-bold">Subjects</p>
              {subjectLoad.length === 0 ? <p className="text-muted">No subject assignments.</p> : (
                <ul>{subjectLoad.map((s, i) => <li key={i}>{s.subject} — {classLabel({ name: s.name, arm: s.arm, department: s.dept })}</li>)}</ul>
              )}
            </div>
          </Card>
          <Card>
            <h2 className="text-xl">Transfer history</h2>
            {transfers.length === 0 ? <p className="mt-2 text-sm text-muted">No transfers recorded.</p> : (
              <ul className="mt-2 divide-y divide-line text-sm">
                {transfers.map((t) => <li key={t.id} className="py-2">{t.kind === "class_teacher" ? "Class teacher" : "Subject"}:{" "}
                  {t.from_name ? classLabel({ name: t.from_name, arm: t.from_arm }) : "—"} → {t.to_name ? classLabel({ name: t.to_name, arm: t.to_arm }) : "—"}
                  <span className="block text-xs text-muted">{new Date(t.created_at).toLocaleDateString("en-GB")} {t.remarks}</span></li>)}
              </ul>
            )}
          </Card>
          {can(me, "roles:manage") && !isRoot(u.role) && (
            <Card>
              <h2 className="text-xl">Role</h2>
              <form action={setStaffRole} className="mt-3 flex gap-2">
                <input type="hidden" name="id" value={id} />
                <select name="role" className="select" defaultValue={u.role} aria-label="Role">{(isRoot(me.role) ? [...STAFF_ROLES, "super_admin"] : STAFF_ROLES).map((r) => <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>)}</select>
                <button className="btn btn-primary">Change</button>
              </form>
            </Card>
          )}
          {isRoot(me.role) && !isRoot(u.role) && u.id !== me.id && (
            <Card>
              <h2 className="text-xl">Additional roles</h2>
              <p className="mt-1 text-sm text-muted">One person can do several jobs, for example subject teacher, class teacher and HR admin. Their permissions are the combination of all their roles.</p>
              <ul className="mt-3 flex flex-wrap gap-2">{extraRoles.length === 0 && <li className="text-sm text-muted">None.</li>}
                {extraRoles.map((r) => (
                  <li key={r.role} className="badge badge-info">{ROLE_LABEL[r.role as string] ?? r.role}
                    <form action={removeExtraRole} className="inline"><input type="hidden" name="id" value={id} /><input type="hidden" name="role" value={r.role} /><button className="ml-1 font-bold" aria-label="Remove this role">×</button></form></li>))}</ul>
              <form action={addExtraRole} className="mt-3 flex gap-2"><input type="hidden" name="id" value={id} />
                <select name="role" className="select" aria-label="Add a role">{[...STAFF_ROLES, "super_admin"].filter((r) => r !== u.role && !extraRoles.some((x) => x.role === r)).map((r) => <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>)}</select>
                <button className="btn btn-primary">Add role</button></form>
            </Card>
          )}
          {isRoot(me.role) && !isRoot(u.role) && u.id !== me.id && (
            <Card>
              <h2 className="text-xl">Special access</h2>
              <p className="mt-1 text-sm text-muted">Give this person any segment or menu on top of their role: <b>View</b> to open it, <b>Manage</b> to change things (for example Branches to add campuses and set coordinates). Or add the Super Admin role above for everything.</p>
              <form action={saveGrants} className="mt-3">
                <input type="hidden" name="id" value={id} />
                <div className="max-h-72 overflow-y-auto rounded-xl border border-line"><table className="tbl text-sm"><thead><tr><th>Segment</th><th>View</th><th>Manage</th></tr></thead>
                  <tbody>{RESOURCES.map((r) => (
                    <tr key={r}><td className="capitalize">{r.replace("_", " ")}</td>
                      <td><input type="checkbox" name="grant" value={`${r}:view`} defaultChecked={grants.has(`${r}:view`)} aria-label={`View ${r}`} /></td>
                      <td><input type="checkbox" name="grant" value={`${r}:manage`} defaultChecked={grants.has(`${r}:manage`)} aria-label={`Manage ${r}`} /></td></tr>))}</tbody></table></div>
                <button className="btn btn-primary mt-3">Save special access</button>
              </form>
            </Card>
          )}
          {can(me, "staff:archive") && u.id !== me.id && !isRoot(u.role) && (
            <Card>
              <h2 className="text-xl">Account control</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {(u.status === "pending" ? ["approve", "reject"] as const : ["suspend", "archive", "restore"] as const).map((op) => (
                  <form key={op} action={setStaffStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="op" value={op} />
                    <button className={`btn btn-sm capitalize ${op === "restore" || op === "approve" ? "btn-primary" : "btn-danger"}`}>{op}</button></form>
                ))}
              </div>
              {can(me, "users:manage") && <div className="mt-4 border-t border-line pt-4"><ResetLink userId={id} /></div>}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
