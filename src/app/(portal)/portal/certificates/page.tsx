import Link from "next/link";
import { requireMe, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { childIds, studentOf } from "@/lib/scope";
import { Badge, Card, Empty, Field, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { issueCertificate, revokeCertificate } from "./actions";

export const metadata = { title: "Certificates" };

export default async function Certificates() {
  const me = await requireMe();
  let ids: string[] | null = null;
  if (me.role === "student") ids = [(await studentOf(me.id))?.id ?? ""];
  else if (me.role === "parent") ids = await childIds(me.id);
  else if (!can(me, "certificates:view")) return <Empty title="Not permitted" />;
  const rows = await sql`SELECT c.id, c.number, c.title, c.exam_label, c.score, c.grade, c.issued_on, c.revoked, s.first_name, s.last_name, s.admission_no
                         FROM certificates c JOIN students s ON s.id = c.student_id
                         WHERE c.school_id = ${me.schoolId} ${ids ? sql`AND c.student_id = ANY(${ids})` : sql``} ORDER BY c.issued_on DESC, c.number LIMIT 100`;
  return (
    <>
      <PageHeader title="Certificates" sub="Every certificate carries a unique number and a QR code that anyone can verify online." />
      {can(me, "certificates:create") && (
        <details className="card card-pad mb-5">
          <summary className="cursor-pointer font-display text-lg">Issue a certificate</summary>
          <div className="mt-4"><ActionForm action={issueCertificate} submit="Issue certificate" className="grid gap-3 sm:grid-cols-3">
            <Field label="Student admission number" name="admissionNo" required />
            <div className="sm:col-span-2"><Field label="Certificate title" name="title" required placeholder="e.g. Certificate of Excellence" /></div>
            <Field label="Examination / achievement" name="examLabel" placeholder="e.g. BECE Mock 2026" />
            <Field label="Score" name="score" type="number" step="0.1" />
            <Field label="Grade" name="grade" />
          </ActionForm></div>
        </details>
      )}
      {rows.length === 0 ? <Empty title="No certificates yet" /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((c) => (
            <Card key={c.id}>
              <p className="eyebrow">{c.number}</p>
              <h2 className="mt-1 text-lg">{c.title}</h2>
              <p className="text-sm text-muted">{c.first_name} {c.last_name} · {c.admission_no}{c.exam_label ? ` · ${c.exam_label}` : ""}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {c.revoked ? <Badge tone="bad">Revoked</Badge> : <Badge tone="ok">Valid</Badge>}
                <Link href={`/portal/certificates/${c.id}`} className="btn btn-ghost btn-sm">Open &amp; print</Link>
                {can(me, "certificates:approve") && <form action={revokeCertificate}><input type="hidden" name="id" value={c.id} /><button className="btn btn-danger btn-sm">{c.revoked ? "Reinstate" : "Revoke"}</button></form>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
