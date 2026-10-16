import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { allSettings } from "@/lib/settings";
import { str } from "@/lib/data";
import { Card, Field, PageHeader, TextArea, Badge } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { ACTIONS, defaultsFor, RESOURCES, ROLE_LABEL, ROLES } from "@/lib/logic/permissions";
import { CONTENT_KINDS } from "@/lib/content";
import { deleteContent, resetPermissions, saveContent, savePermissions, saveSettings } from "./actions";

export const metadata = { title: "Settings & content" };

const TABS = [
  ["brand", "Branding"], ["founder", "Founder"], ["contact", "Contact & social"], ["home", "Homepage"], ["content", "News & content"],
  ["academic", "Academic & grading"], ["eligibility", "Exams & features"], ["auth", "Sign-in & footer"], ["periods", "Timetable & documents"], ["permissions", "Roles & permissions"],
] as const;

export default async function Settings({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  if (!can(me, "settings:view") && !can(me, "cms:view") && !can(me, "*")) redirect("/forbidden");
  const sp = await searchParams;
  const tab = TABS.find((t) => t[0] === str(sp.tab))?.[0] ?? "brand";
  const s = await allSettings();
  const hidden = (g: string) => <input type="hidden" name="_group" value={g} />;

  return (
    <>
      <PageHeader title="Settings & content" sub="Everything configurable lives here. Changes apply across the website and portal immediately and are recorded in the audit log." />
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Settings sections">
        {TABS.map(([k, l]) => <Link key={k} href={`/portal/settings?tab=${k}`} className={`badge text-sm ${tab === k ? "badge-info" : ""}`}>{l}</Link>)}
      </nav>

      {tab === "brand" && (
        <Card><h2 className="text-xl">Branding</h2>
          <div className="mt-3"><ActionForm action={saveSettings} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2">
            {hidden("brand")}
            <Field label="Group name" name="group" defaultValue={s.brand.group} />
            <Field label="School name" name="school" defaultValue={s.brand.school} />
            <Field label="Tagline" name="tagline" defaultValue={s.brand.tagline} />
            <Field label="Secondary tagline" name="subTagline" defaultValue={s.brand.subTagline} />
            <div className="field sm:col-span-2"><label htmlFor="logo">Replace logo (PNG/WebP/JPG, max 4 MB)</label><input id="logo" name="logo" type="file" accept="image/png,image/webp,image/jpeg" className="input" />
              <p className="hint">The logo is shown at its original proportions everywhere, including the PWA and printed documents. App icons and the favicon use the supplied official crest.</p></div>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="resetLogo" /> Restore the official crest</label>
          </ActionForm></div>
        </Card>
      )}
      {tab === "founder" && (
        <Card><h2 className="text-xl">Founder and Proprietor</h2>
          <div className="mt-3"><ActionForm action={saveSettings} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2">
            {hidden("founder")}
            <Field label="Name" name="name" defaultValue={s.founder.name} /><Field label="Position" name="position" defaultValue={s.founder.position} />
            <Field label="Qualifications" name="qualifications" defaultValue={s.founder.qualifications} />
            <div className="field"><label htmlFor="photo">Photograph</label><input id="photo" name="photo" type="file" accept="image/png,image/webp,image/jpeg" className="input" /></div>
            <div className="sm:col-span-2"><TextArea label="Professional profile / biography" name="profile" defaultValue={s.founder.profile} rows={4} /></div>
            <div className="sm:col-span-2"><TextArea label="Founder's message" name="message" defaultValue={s.founder.message} rows={3} /></div>
            <TextArea label="Message to parents" name="toParents" defaultValue={s.founder.toParents} rows={3} />
            <TextArea label="Message to students" name="toStudents" defaultValue={s.founder.toStudents} rows={3} />
            <TextArea label="Message to staff" name="toStaff" defaultValue={s.founder.toStaff} rows={3} />
            <TextArea label="Vision statement" name="vision" defaultValue={s.founder.vision} rows={3} />
          </ActionForm></div>
        </Card>
      )}
      {tab === "contact" && (
        <Card><h2 className="text-xl">Contact information &amp; social links</h2>
          <div className="mt-3"><ActionForm action={saveSettings} className="grid gap-3 sm:grid-cols-2">
            {hidden("contact")}
            <Field label="Phone" name="phone" defaultValue={s.contact.phone} /><Field label="Email" name="email" defaultValue={s.contact.email} />
            <div className="sm:col-span-2"><Field label="Address" name="address" defaultValue={s.contact.address} /></div>
            <Field label="Customer-care WhatsApp (digits, with country code)" name="whatsapp" defaultValue={s.contact.whatsapp} />
            <Field label="Office hours" name="officeHours" defaultValue={s.contact.officeHours} />
            <Field label="Emergency contact" name="emergency" defaultValue={s.contact.emergency} />
            <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
              {["facebook", "youtube", "instagram", "tiktok", "linkedin", "x", "whatsapp", "website"].map((k) => <Field key={k} label={`${k[0].toUpperCase()}${k.slice(1)} URL`} name={`s_${k}`} type="url" defaultValue={s.social[k]} />)}
            </div>
          </ActionForm></div>
        </Card>
      )}
      {tab === "home" && (
        <Card><h2 className="text-xl">Homepage content</h2>
          <div className="mt-3"><ActionForm action={saveSettings} className="grid gap-3">
            {hidden("home")}
            <Field label="Hero headline" name="heroTitle" defaultValue={s.home.heroTitle} />
            <TextArea label="Hero text" name="heroSub" defaultValue={s.home.heroSub} rows={2} />
            <TextArea label="About Fodan Group of Schools" name="about" defaultValue={s.home.about} rows={3} />
            <TextArea label="About Fodan College International" name="aboutCollege" defaultValue={s.home.aboutCollege} rows={3} />
            <TextArea label="Vision" name="vision" defaultValue={s.home.vision} rows={2} />
            <TextArea label="Mission" name="mission" defaultValue={s.home.mission} rows={2} />
            <TextArea label="Core values (one per line)" name="values" defaultValue={(s.home.values as string[]).join("\n")} rows={4} />
            <TextArea label="Examination preparation text" name="examPrep" defaultValue={s.home.examPrep} rows={3} />
          </ActionForm></div>
        </Card>
      )}
      {tab === "content" && <ContentManager />}
      {tab === "academic" && (
        <Card><h2 className="text-xl">Academic weighting, grading &amp; comments</h2>
          <div className="mt-3"><ActionForm action={saveSettings} className="grid gap-4">
            {hidden("academic")}
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Assignments (marks)" name="w_assignment" type="number" defaultValue={s.weights.assignment} />
              <Field label="CA tests (marks)" name="w_ca" type="number" defaultValue={s.weights.ca} />
              <Field label="Terminal exam (marks)" name="w_exam" type="number" defaultValue={s.weights.exam} />
            </div>
            <p className="hint -mt-2">Raw scores are normalised proportionally: 80% of a 30-mark CA is 24. Weights must total 100.</p>
            <TextArea label="Grade bands — one per line: Grade | Min | Max | Remark" name="grades" rows={7}
              defaultValue={(s.grading as { grade: string; min: number; max: number; remark: string }[]).map((b) => `${b.grade} | ${b.min} | ${b.max} | ${b.remark}`).join("\n")} />
            <div className="grid gap-3 sm:grid-cols-2">
              {(s.grading as { grade: string }[]).map((b) => <TextArea key={b.grade} label={`Automatic comment — grade ${b.grade}`} name={`c_${b.grade}`} defaultValue={s.comments[b.grade]} rows={2} />)}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="field"><label htmlFor="release">Result release</label><select id="release" name="release" className="select" defaultValue={s.results.release}><option value="manual">Manual release</option><option value="immediate">Immediate</option><option value="delayed">Delayed (release by staff)</option></select></div>
              <label className="flex items-center gap-2 pt-7 text-sm font-semibold"><input type="checkbox" name="showPosition" defaultChecked={s.results.showPosition} /> Show class position on report cards</label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Senior staff — minimum years of service" name="minYears" type="number" defaultValue={s.seniority.minYears} />
              <label className="flex items-center gap-2 pt-7 text-sm font-semibold"><input type="checkbox" name="requireDegree" defaultChecked={s.seniority.requireDegree} /> Require a degree-level qualification</label>
            </div>
          </ActionForm></div>
        </Card>
      )}
      {tab === "eligibility" && (
        <Card><h2 className="text-xl">Examination eligibility &amp; feature flags</h2>
          <p className="mt-1 text-sm text-muted">Class levels: Basic 1–6 = 1–6, JSS 1–3 = 7–9, SSS 1–3 = 10–12. Enter comma-separated levels.</p>
          <div className="mt-3"><ActionForm action={saveSettings} className="grid gap-3 sm:grid-cols-3">
            {hidden("eligibility")}
            {["common_entrance", "bece", "neco", "waec", "jamb", "international"].map((k) => <Field key={k} label={k.replace("_", " ").toUpperCase()} name={`e_${k}`} defaultValue={(s.eligibility[k] ?? []).join(", ")} />)}
            {[["registration", "Student registration open"], ["parentLinking", "Parent linking enabled"], ["mocks", "Mock centre enabled"], ["studyCentre", "Study centre enabled"], ["ai", "AI assistance (always pending review)"]].map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name={`f_${k}`} defaultChecked={!!s.features[k]} /> {l}</label>
            ))}
          </ActionForm></div>
        </Card>
      )}
      {tab === "auth" && (
        <Card><h2 className="text-xl">Sign-in pictures, footer &amp; staff positions</h2>
          <div className="mt-3"><ActionForm action={saveSettings} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2">
            {hidden("auth")}
            {(["login", "register", "staff"] as const).map((k) => (
              <div key={k} className="field"><label htmlFor={`art_${k}`}>{k === "login" ? "Sign-in picture" : k === "register" ? "Student & parent registration picture" : "Staff registration picture"}</label>
                <input id={`art_${k}`} name={`art_${k}`} type="file" accept="image/png,image/jpeg,image/webp" className="input" />
                <label className="mt-1 flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name={`clear_${k}`} /> Remove current picture {s.authArt?.[k] ? "(one is set)" : "(placeholder shown)"}</label></div>
            ))}
            <Field label="Sign-in caption" name="caption" defaultValue={s.authArt?.caption} />
            <div className="sm:col-span-2"><Field label="Footer text (public site and sign-in screens)" name="footer" defaultValue={s.footer?.text} /></div>
            <p className="hint sm:col-span-2">Staff positions: one per line as <code>Title | role</code>. Roles: {ROLES.filter((r) => r !== "super_admin").join(", ")}.</p>
            {([["secondary", "Teaching — Secondary school"], ["primary", "Teaching — Primary school"], ["non_teaching", "Non-teaching staff"]] as const).map(([g, l]) => (
              <div key={g} className="sm:col-span-2"><TextArea label={l} name={`pos_${g}`} rows={8} defaultValue={((s.positions?.[g] ?? []) as string[]).join("\n")} /></div>
            ))}
          </ActionForm></div>
        </Card>
      )}
      {tab === "periods" && (
        <Card><h2 className="text-xl">Timetable periods &amp; printed documents</h2>
          <div className="mt-3"><ActionForm action={saveSettings} className="grid gap-3 sm:grid-cols-2">
            {hidden("periods")}
            <div className="sm:col-span-2"><TextArea label="Periods — one per line (period 1 first)" name="periods" rows={8} defaultValue={(s.periods as { label: string }[]).map((p) => p.label).join("\n")} /></div>
            <Field label="Report card stamp text" name="stamp" defaultValue={s.report.stamp} />
            <label className="flex items-center gap-2 pt-7 text-sm font-semibold"><input type="checkbox" name="showAttendance" defaultChecked={s.report.showAttendance} /> Show attendance on report cards</label>
            <Field label="Certificate heading" name="heading" defaultValue={s.certificate.heading} />
            <Field label="Proprietor signature label" name="proprietorSign" defaultValue={s.certificate.proprietorSign} />
            <Field label="Principal signature label" name="principalSign" defaultValue={s.certificate.principalSign} />
          </ActionForm></div>
        </Card>
      )}
      {tab === "permissions" && <PermissionsManager role={str(sp.role) || "teacher"} />}
    </>
  );
}

async function ContentManager() {
  const me = await requireMe();
  const items = await sql`SELECT id, kind, title, body, sort, published FROM content_items WHERE school_id = ${me.schoolId} AND audience = 'public' ORDER BY kind, sort, created_at DESC`;
  return (
    <div className="grid gap-5">
      <Card>
        <h2 className="text-xl">Add content</h2>
        <div className="mt-3"><ActionForm action={saveContent} submit="Add" className="grid gap-3 sm:grid-cols-4">
          <div className="field"><label htmlFor="kind">Type</label><select id="kind" name="kind" className="select">{CONTENT_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}</select></div>
          <div className="sm:col-span-2"><Field label="Title" name="title" required /></div>
          <Field label="Order" name="sort" type="number" defaultValue={100} />
          <div className="sm:col-span-4"><TextArea label="Text" name="body" rows={3} /></div>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="published" defaultChecked /> Published</label>
        </ActionForm></div>
      </Card>
      {CONTENT_KINDS.map((k) => {
        const list = items.filter((i) => i.kind === k.kind);
        return (
          <Card key={k.kind}>
            <h2 className="text-xl">{k.label} <span className="text-sm font-normal text-muted">— {k.note}</span></h2>
            {list.length === 0 ? <p className="mt-2 text-sm text-muted">None yet.</p> : (
              <ul className="mt-3 divide-y divide-line">
                {list.map((i) => (
                  <li key={i.id} className="py-3">
                    <ActionForm action={saveContent} submit="Save" small className="grid gap-2 sm:grid-cols-[1fr_80px]">
                      <input type="hidden" name="id" value={i.id} /><input type="hidden" name="kind" value={k.kind} />
                      <Field label="Title" name="title" defaultValue={i.title} />
                      <Field label="Order" name="sort" type="number" defaultValue={i.sort} />
                      <div className="sm:col-span-2"><TextArea label="Text" name="body" defaultValue={i.body} rows={2} /></div>
                      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="published" defaultChecked={i.published} /> Published</label>
                    </ActionForm>
                    <form action={deleteContent} className="mt-2"><input type="hidden" name="id" value={i.id} /><button className="btn btn-danger btn-sm">Delete</button></form>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

async function PermissionsManager({ role }: { role: string }) {
  const me = await requireMe();
  const r = ROLES.includes(role as never) && role !== "super_admin" ? role : "teacher";
  const [row] = await sql`SELECT permissions FROM role_permissions WHERE school_id = ${me.schoolId} AND role = ${r}`;
  const current = new Set<string>(row ? (row.permissions as string[]) : defaultsFor(r));
  return (
    <Card>
      <h2 className="text-xl">Roles &amp; permissions</h2>
      <p className="mt-1 text-sm text-muted">Every permission is enforced on the server. Super Admin always has full access and cannot be edited.
        {row ? <> <Badge tone="info">Customised</Badge></> : <> <Badge>Default</Badge></>}</p>
      <nav className="mt-3 flex flex-wrap gap-2" aria-label="Roles">
        {ROLES.filter((x) => x !== "super_admin").map((x) => <Link key={x} href={`/portal/settings?tab=permissions&role=${x}`} className={`badge ${x === r ? "badge-info" : ""}`}>{ROLE_LABEL[x]}</Link>)}
      </nav>
      <div className="mt-4">
        <ActionForm action={savePermissions} submit={`Save permissions for ${ROLE_LABEL[r]}`}>
          <input type="hidden" name="role" value={r} />
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="tbl text-xs">
              <thead><tr><th>Area</th>{ACTIONS.map((a) => <th key={a} className="text-center">{a}</th>)}</tr></thead>
              <tbody>
                {RESOURCES.map((res) => (
                  <tr key={res}><td className="font-bold capitalize">{res.replace("_", " ")}</td>
                    {ACTIONS.map((a) => <td key={a} className="text-center"><input type="checkbox" name="perm" value={`${res}:${a}`} defaultChecked={current.has(`${res}:${a}`) || current.has(`${res}:manage`) && a !== "manage"} aria-label={`${res} ${a}`} /></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </ActionForm>
        {row && <form action={resetPermissions} className="mt-3"><input type="hidden" name="role" value={r} /><button className="btn btn-ghost btn-sm">Reset to defaults</button></form>}
      </div>
    </Card>
  );
}
