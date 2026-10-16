import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe, can } from "@/lib/auth";
import { loadModules } from "@/lib/modules";
import { getSetting } from "@/lib/settings";
import { Card, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { saveLabels, saveModules } from "./actions";

export const metadata = { title: "BackEnd console" };

const AREAS: [string, string, string][] = [
  ["/portal/settings?tab=brand", "Branding & logo", "Names, taglines, logo replacement"],
  ["/portal/settings?tab=home", "Homepage content", "Hero, about, vision, values, exam preparation"],
  ["/portal/settings?tab=founder", "Founder profile", "Biography, photograph, messages"],
  ["/portal/settings?tab=content", "News, events, FAQ", "Everything public visitors read"],
  ["/portal/settings?tab=academic", "Grading & weights", "10/30/60 weights, grade bands, automatic comments"],
  ["/portal/settings?tab=eligibility", "Exams & feature switches", "Mock eligibility, registration, linking"],
  ["/portal/settings?tab=permissions", "Roles & permissions", "Granular permission matrix per role"],
  ["/portal/users", "Users & access", "Suspend, restore, reset links, sessions"],
  ["/portal/audit", "Audit & security", "Append-only activity record"],
  ["/portal/comments", "Website messages", "Contact and feedback inbox"],
];

export default async function Backend() {
  const me = await requireMe();
  if (!can(me, "settings:view") && !can(me, "*")) redirect("/forbidden");
  const mods = await loadModules();
  const labels = (await getSetting<Record<string, string>>("labels")) ?? {};
  const edit = can(me, "settings:manage") || can(me, "*");
  return (
    <>
      <PageHeader title="BackEnd console" sub="One place to run the school: every module, label and permission below is editable and takes effect immediately." />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AREAS.map(([href, t, d]) => (
          <Link key={href} href={href} className="card card-pad block hover:border-ink"><p className="font-display text-lg">{t}</p><p className="text-sm text-muted">{d}</p></Link>
        ))}
      </div>

      <Card className="mb-5">
        <h2 className="text-xl">Modules (Fodan College &amp; WorkSuite)</h2>
        <p className="mt-1 text-sm text-muted">Switch modules on or off, rename them, and choose who may create, view and manage. Audience values: <code>all</code>, <code>staff</code>, <code>student</code>, <code>parent</code>, or role keys such as <code>principal</code>, <code>hod</code>, <code>vp_admin</code>.</p>
        {edit ? (
          <div className="mt-3"><ActionForm action={saveModules} submit="Save modules" className="grid gap-4">
            {mods.map((m) => (
              <fieldset key={m.key} className="rounded-xl border border-line p-3">
                <legend className="px-1 text-sm font-bold">{m.label} <span className="font-normal text-muted">· {m.origin}</span></legend>
                <div className="grid gap-3 sm:grid-cols-4">
                  <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name={`${m.key}_enabled`} defaultChecked={m.enabled} /> Enabled</label>
                  <div className="field"><label htmlFor={`${m.key}_label`}>Name</label><input id={`${m.key}_label`} name={`${m.key}_label`} defaultValue={m.label} className="input" /></div>
                  <div className="field"><label htmlFor={`${m.key}_create`}>Can create</label><input id={`${m.key}_create`} name={`${m.key}_create`} defaultValue={m.create.join(", ")} className="input" /></div>
                  <div className="field"><label htmlFor={`${m.key}_view`}>Can view</label><input id={`${m.key}_view`} name={`${m.key}_view`} defaultValue={m.view.join(", ")} className="input" /></div>
                  <div className="field sm:col-span-4"><label htmlFor={`${m.key}_manage`}>Can manage / moderate</label><input id={`${m.key}_manage`} name={`${m.key}_manage`} defaultValue={m.manage.join(", ")} className="input" /></div>
                </div>
              </fieldset>
            ))}
          </ActionForm></div>
        ) : <p className="mt-3 text-sm text-muted">Only the Super Admin can edit modules.</p>}
      </Card>

      <Card>
        <h2 className="text-xl">Terminology</h2>
        <p className="mt-1 text-sm text-muted">Rename any menu item, one per line as <code>Current name=New name</code> (for example <code>Students=Learners</code>).</p>
        {edit && <div className="mt-3"><ActionForm action={saveLabels} submit="Save terminology">
          <div className="field"><label htmlFor="labels">Labels</label><textarea id="labels" name="labels" rows={5} className="textarea" defaultValue={Object.entries(labels).map(([k, v]) => `${k}=${v}`).join("\n")} /></div>
        </ActionForm></div>}
      </Card>
    </>
  );
}
