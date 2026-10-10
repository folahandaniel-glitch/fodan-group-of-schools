import { redirect } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { classLabel, getSetting } from "@/lib/settings";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, Empty, Field, PageHeader } from "@/components/ui";
import { linkMyChild } from "./actions";

export const metadata = { title: "My children" };

export default async function Children() {
  const me = await requireMe();
  if (me.role !== "parent") redirect("/portal");
  const f = await getSetting<{ parentLinking: boolean }>("features");
  const links = await sql`SELECT l.status, s.id, s.first_name, s.last_name, s.admission_no, c.name AS class_name, c.arm, d.name AS dept
                          FROM parent_links l JOIN students s ON s.id = l.student_id LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN departments d ON d.id = c.department_id
                          WHERE l.parent_id = ${me.id} ORDER BY s.first_name`;
  return (
    <>
      <PageHeader title="My children" sub="Link each child with their school access code, admission number and date of birth." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl">Linked students</h2>
          {links.length === 0 ? <div className="mt-3"><Empty title="No children linked yet" /></div> : (
            <ul className="mt-3 divide-y divide-line">
              {links.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div><p className="font-bold">{c.first_name} {c.last_name}</p><p className="text-sm text-muted">{c.class_name ? classLabel({ name: c.class_name, arm: c.arm, department: c.dept }) : "—"} · {c.admission_no}</p></div>
                  <Badge tone={c.status === "active" ? "ok" : "warn"}>{c.status === "active" ? "Linked" : "Awaiting school approval"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="text-xl">Add a child</h2>
          {f?.parentLinking === false ? <p className="mt-2 text-sm text-muted">Linking is currently disabled. Please contact the school.</p> : (
            <div className="mt-3">
              <ActionForm action={linkMyChild} submit="Verify and link">
                <Field label="Student access code" name="code" required placeholder="FDN-XXXXX-XXXXX-XXXXX" />
                <Field label="Admission number" name="admissionNo" required />
                <Field label="Student's date of birth" name="dob" type="date" required />
                <Field label="Relationship" name="relationship" placeholder="Father, Mother, Guardian…" />
              </ActionForm>
              <p className="hint mt-3">A code alone is never enough. If your email or phone matches the school&apos;s guardian record the link is immediate; otherwise the school office approves it.</p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
