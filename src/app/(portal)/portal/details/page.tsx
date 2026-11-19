import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { audit } from "@/lib/security";
import { loadDetails } from "@/lib/details";
import { SECTIONS, mask, progress, roleOf, type Field } from "@/lib/logic/details";
import { Card, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { PhotoField } from "@/components/photo-field";
import { saveMyDetails } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "My details" };

function Input({ f, value, ro }: { f: Field; value: string; ro: boolean }) {
  const id = `f_${f.key}`, shown = ro && f.secret ? mask(value) : value;
  return (
    <div className="field">
      <label htmlFor={id}>{f.label} <span className="text-bad">*</span></label>
      {ro ? <p className="input !bg-paper-2">{shown || "-"}</p> : f.kind === "select" ? (
        <select id={id} name={f.key} defaultValue={value} className="select" required><option value="">Select…</option>{f.options!.map((o) => <option key={o} value={o}>{o}</option>)}</select>
      ) : f.kind === "textarea" ? <textarea id={id} name={f.key} defaultValue={value} rows={2} className="input" required />
        : <input id={id} name={f.key} defaultValue={value} type={f.kind === "date" ? "date" : f.kind === "email" ? "email" : "text"} inputMode={f.kind === "tel" ? "numeric" : undefined} autoComplete="off" className="input" required />}
      {f.hint && !ro && <p className="hint">{f.hint}</p>}
    </div>
  );
}

export default async function Details({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const me = await requireMe();
  const sp = await searchParams;
  let uid = me.id, other = false;
  if (sp.user && sp.user !== me.id) {
    if (!/^[0-9a-f-]{36}$/i.test(sp.user)) notFound();
    const [t] = await sql`SELECT id, role FROM users WHERE id = ${sp.user} AND school_id = ${me.schoolId}`;
    if (!t) notFound();
    const ok = t.role === "student" ? can(me, "students:view") : t.role === "parent" ? can(me, "parents:view") : can(me, "hrm:manage") || can(me, "hrm:review") || can(me, "*");
    if (!ok || (t.role === "developer" && me.role !== "developer")) notFound();
    uid = t.id as string; other = true;
    await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "details.view", entity: "user", entityId: uid });
  }
  const [u] = await sql`SELECT first_name, last_name, email, phone, role FROM users WHERE id = ${uid}`;
  const role = roleOf(u.role as string);
  const d = await loadDetails(uid);
  const seed: Record<string, string> = { surname: u.last_name as string, firstName: u.first_name as string, email: u.email as string, phone: (u.phone as string) ?? "", nationality: "Nigerian" };
  const values = { ...seed, ...d.values };
  const p = progress(role, values, !!d.photo);
  const label = role === "staff" ? "HRM Details" : "My Details";

  return (
    <>
      <PageHeader title={other ? `${u.first_name} ${u.last_name}: details` : label} sub={other ? "Read-only. Every view of this record is logged." : "Fill in every segment. All fields are compulsory: write N/A where something does not apply. Your NIN, BVN and bank details are stored encrypted."}
        actions={other && <Link href="/portal/hrm/directory" className="btn btn-ghost btn-sm">← Back</Link>} />
      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold">{p.complete && d.complete ? "All details submitted ✓" : `${p.pct}% complete`}</p><span className="text-sm text-muted">{p.done} of {p.total} items</span></div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-paper-2"><div className="h-full bg-strong transition-all" style={{ width: `${p.pct}%` }} /></div>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">{p.sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className={`badge ${s.done === s.total ? "badge-ok" : "badge-warn"}`}>{s.title} {s.done}/{s.total}</a></li>)}</ul>
      </Card>

      {other ? (
        <div className="grid gap-5">{SECTIONS[role].map((s) => <Card key={s.id} id={s.id}><h2 className="text-xl">{s.title}</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{s.fields.map((f) => <Input key={f.key} f={f} value={values[f.key] ?? ""} ro />)}</div></Card>)}</div>
      ) : (
        <ActionForm action={saveMyDetails} submit="Submit all details" encType="multipart/form-data" className="grid gap-5">
          <Card id="photo-card"><h2 className="text-xl">Picture</h2><div className="mt-3"><PhotoField current={d.photo} /></div></Card>
          {SECTIONS[role].map((s) => (
            <Card key={s.id} id={s.id}><h2 className="text-xl">{s.title}</h2>{s.blurb && <p className="mt-1 text-sm text-muted">{s.blurb}</p>}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">{s.fields.map((f) => <div key={f.key} className={f.kind === "textarea" ? "sm:col-span-2" : ""}><Input f={f} value={values[f.key] ?? ""} ro={false} /></div>)}</div></Card>))}
          <div className="flex flex-wrap gap-2"><button type="submit" name="mode" value="draft" className="btn btn-ghost">Save progress</button></div>
        </ActionForm>
      )}
    </>
  );
}
