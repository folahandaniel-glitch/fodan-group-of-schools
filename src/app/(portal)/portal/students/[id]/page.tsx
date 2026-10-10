import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { canSeeStudent } from "@/lib/scope";
import { decrypt } from "@/lib/crypto";
import { audit } from "@/lib/security";
import { classLabel } from "@/lib/settings";
import { ymd } from "@/lib/data";
import { Badge, Card, Field, PageHeader, Select, statusTone } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { ResetLink } from "@/components/reset-link";
import { codeAction, linkDecision, setStudentStatus, updateStudent } from "../actions";

export const dynamic = "force-dynamic";

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePerm("students:view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(await canSeeStudent(me, id))) notFound();
  const [s] = await sql`SELECT s.*, c.name AS class_name, c.arm, d.name AS dept FROM students s
                         LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN departments d ON d.id = c.department_id
                         WHERE s.id = ${id} AND s.school_id = ${me.schoolId}`;
  if (!s) notFound();
  const canCode = can(me, "access_codes:view");
  let code = "";
  if (canCode && s.code_enc) {
    code = decrypt(s.code_enc);
    await audit({ schoolId: me.schoolId, actorId: me.id, action: "access_code.view", entity: "student", entityId: id });
  }
  const history = await sql`
    SELECT h.*, f.name AS from_name, f.arm AS from_arm, t.name AS to_name, t.arm AS to_arm FROM student_history h
    LEFT JOIN classes f ON f.id = h.from_class_id LEFT JOIN classes t ON t.id = h.to_class_id
    WHERE h.student_id = ${id} ORDER BY h.created_at DESC`;
  const parents = await sql`SELECT l.parent_id, l.status, l.relationship, u.first_name, u.last_name, u.email, u.phone
                            FROM parent_links l JOIN users u ON u.id = l.parent_id WHERE l.student_id = ${id}`;
  const canEdit = can(me, "students:edit");

  return (
    <>
      <PageHeader eyebrow={`Admission ${s.admission_no}`} title={`${s.first_name} ${s.middle_name ?? ""} ${s.last_name}`.replace(/\s+/g, " ")}
        sub={s.class_name ? classLabel({ name: s.class_name, arm: s.arm, department: s.dept }) : "No class assigned"}
        actions={<><Badge tone={statusTone(s.status)}>{s.status}</Badge><Link className="btn btn-ghost btn-sm" href={`/portal/report/${id}`}>Report card</Link><Link className="btn btn-ghost btn-sm" href={`/portal/results?student=${id}`}>Results</Link></>} />

      <div className="grid gap-5 lg:grid-cols-2">
        {canEdit ? (
          <Card>
            <h2 className="text-xl">Student details</h2>
            <div className="mt-3">
              <ActionForm action={updateStudent} submit="Save changes" className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={id} />
                <Field label="First name" name="firstName" defaultValue={s.first_name} required />
                <Field label="Last name" name="lastName" defaultValue={s.last_name} required />
                <Field label="Date of birth" name="dob" type="date" defaultValue={ymd(s.dob)} />
                <Select label="Gender" name="gender" defaultValue={s.gender} options={[{ value: "Female", label: "Female" }, { value: "Male", label: "Male" }]} />
                <Field label="Guardian name" name="guardianName" defaultValue={s.guardian_name} />
                <Field label="Guardian phone" name="guardianPhone" defaultValue={s.guardian_phone} />
                <Field label="Guardian email" name="guardianEmail" defaultValue={s.guardian_email} />
                <Field label="Address" name="address" defaultValue={s.address} />
              </ActionForm>
            </div>
          </Card>
        ) : (
          <Card><h2 className="text-xl">Student details</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><dt className="text-muted">Gender</dt><dd>{s.gender ?? "—"}</dd><dt className="text-muted">Guardian</dt><dd>{s.guardian_name ?? "—"}</dd></dl></Card>
        )}

        <div className="grid gap-5">
          {canCode && (
            <Card>
              <h2 className="text-xl">School access code</h2>
              <p className="mt-2 break-all rounded-xl bg-paper-2 px-4 py-3 text-center font-mono text-lg font-bold tracking-wider" aria-label="Access code">{code || "—"}</p>
              <p className="mt-2 text-sm text-muted">Status: <Badge tone={statusTone(s.code_status)}>{s.code_status}</Badge>{" "}
                {s.user_id ? "Account activated." : "Not yet used to activate an account."} The code stays valid through promotions.</p>
              {can(me, "access_codes:manage") && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["regenerate", "suspend", "revoke", "restore"] as const).map((op) => (
                    <form key={op} action={codeAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="op" value={op} />
                      <button className={`btn btn-sm ${op === "restore" || op === "regenerate" ? "btn-ghost" : "btn-danger"} capitalize`}>{op}</button></form>
                  ))}
                </div>
              )}
              {s.user_id && can(me, "users:manage") && <div className="mt-4 border-t border-line pt-4"><ResetLink userId={s.user_id} /></div>}
            </Card>
          )}
          <Card>
            <h2 className="text-xl">Linked parents / guardians</h2>
            {parents.length === 0 ? <p className="mt-2 text-sm text-muted">No parent has linked this student yet.</p> : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {parents.map((p) => (
                  <li key={p.parent_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span><b>{p.first_name} {p.last_name}</b> <span className="text-muted">{p.relationship}</span><br /><span className="text-xs text-muted">{p.email} · {p.phone}</span></span>
                    <span className="flex items-center gap-2">
                      <Badge tone={p.status === "active" ? "ok" : "warn"}>{p.status}</Badge>
                      {canEdit && (
                        <>
                          {p.status === "pending" && <form action={linkDecision}><input type="hidden" name="parent" value={p.parent_id} /><input type="hidden" name="student" value={id} /><input type="hidden" name="op" value="approve" /><button className="btn btn-ghost btn-sm">Approve</button></form>}
                          <form action={linkDecision}><input type="hidden" name="parent" value={p.parent_id} /><input type="hidden" name="student" value={id} /><input type="hidden" name="op" value="remove" /><button className="btn btn-danger btn-sm">Remove</button></form>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {can(me, "students:archive") && (
            <Card>
              <h2 className="text-xl">Enrolment status</h2>
              <form action={setStudentStatus} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="id" value={id} />
                <select name="status" className="select" aria-label="New status" defaultValue={s.status}>{["active", "graduated", "withdrawn", "transferred", "archived"].map((x) => <option key={x}>{x}</option>)}</select>
                <input name="remarks" className="input" placeholder="Remarks" aria-label="Remarks" />
                <button className="btn btn-primary">Update</button>
              </form>
              <p className="hint mt-2">Leaving statuses suspend the account; history and results are always preserved.</p>
            </Card>
          )}
        </div>
      </div>

      <Card className="mt-5">
        <h2 className="text-xl">Class history</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {history.map((h) => (
            <li key={h.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span><b className="capitalize">{h.action}</b>{" "}
                {h.from_name ? classLabel({ name: h.from_name, arm: h.from_arm }) : "—"} → {h.to_name ? classLabel({ name: h.to_name, arm: h.to_arm }) : "—"}
                {h.remarks && <span className="text-muted"> · {h.remarks}</span>}</span>
              <span className="text-xs text-muted">{new Date(h.created_at).toLocaleDateString("en-GB")}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
