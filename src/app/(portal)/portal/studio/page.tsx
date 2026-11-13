import Link from "next/link";
import { redirect } from "next/navigation";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { allSettings } from "@/lib/settings";
import { Badge, Card, Field, PageHeader, TextArea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { saveBar, saveMaintenance, saveSeo, saveSections, uploadMedia } from "./actions";

export const metadata = { title: "Website Studio" };
export const dynamic = "force-dynamic";

const SECTION_LABEL: [string, string][] = [["glance", "Key facts strip"], ["about", "About"], ["values", "Founder's message"], ["academics", "Academics & structure"], ["exams", "Exam preparation"],
  ["facilities", "Facilities & activities"], ["news", "News, events & announcements"], ["team", "Our staff"], ["portals", "Portals"], ["faq", "FAQ"]];
const TABS: [string, string][] = [["overview", "Overview"], ["sections", "Homepage sections"], ["seo", "Search & sharing"], ["bar", "Announcement bar"], ["media", "Media library"], ["maintenance", "Maintenance"]];
const TOOLS: [string, string, string][] = [
  ["/portal/settings?tab=brand", "Branding & logo", "Names, taglines, logo"], ["/portal/settings?tab=home", "Homepage content", "Hero, about, vision, values"],
  ["/portal/settings?tab=site", "Website text", "Every label, heading and button"], ["/portal/settings?tab=content", "News, events, FAQ", "Everything visitors read"],
  ["/portal/settings?tab=founder", "Founder profile", "Biography and photograph"], ["/portal/settings?tab=appearance", "Themes", "24 colour themes, default and picker"],
  ["/portal/settings?tab=contact", "Contact & social links", "Phone, WhatsApp, Fodan CBT, footer links"], ["/portal/settings?tab=auth", "Sign-in & footer", "Sign-in screen pictures and footer text"],
];

export default async function Studio({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  if (!can(me, "studio:manage") && !can(me, "cms:view") && !can(me, "cms:manage") && !can(me, "settings:view") && !can(me, "*")) redirect("/forbidden");
  const dev = me.role === "developer";
  const edit = can(me, "studio:manage") || can(me, "cms:manage") || can(me, "settings:manage") || can(me, "*");
  const sp = await searchParams;
  const tabs = TABS.filter(([k]) => k !== "maintenance" || dev);
  const tab = tabs.find((t) => t[0] === str(sp.tab))?.[0] ?? "overview";
  const s = await allSettings();
  const st = (s.studio ?? {}) as { hiddenSections: string[]; seo: Record<string, string>; bar: Record<string, any>; maintenance: Record<string, any> };
  const hidden = new Set(st.hiddenSections ?? []);
  const media = tab === "media" ? await sql`SELECT id, name, size, created_at FROM files WHERE school_id = ${me.schoolId} AND public AND mime LIKE 'image/%' ORDER BY created_at DESC LIMIT 60` : [];

  return (
    <>
      <PageHeader eyebrow="Website Studio" title="Website Studio" sub="Run the public website: what shows, what it says, how it looks in search and when it is live." actions={<a href="/" target="_blank" rel="noopener noreferrer" className="btn btn-gold">View website ↗</a>} />
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Studio sections">{tabs.map(([k, l]) => <Link key={k} href={`/portal/studio?tab=${k}`} className={`badge text-sm ${tab === k ? "badge-info" : ""}`}>{l}</Link>)}</nav>

      {tab === "overview" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card><p className="eyebrow">Sections shown</p><p className="font-display text-3xl">{SECTION_LABEL.length - hidden.size}/{SECTION_LABEL.length}</p></Card>
            <Card><p className="eyebrow">Announcement bar</p><p className="mt-1">{st.bar?.on ? <Badge tone="ok">On</Badge> : <Badge>Off</Badge>}</p></Card>
            <Card><p className="eyebrow">Search title</p><p className="mt-1 truncate text-sm font-semibold">{st.seo?.title || "Default"}</p></Card>
            <Card><p className="eyebrow">Website status</p><p className="mt-1">{st.maintenance?.on ? <Badge tone="warn">Maintenance</Badge> : <Badge tone="ok">Live</Badge>}</p></Card>
          </div>
          <h2 className="mb-3 mt-6 text-xl">Edit the website</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{TOOLS.map(([href, t, d]) => <Link key={href} href={href} className="tile"><p className="font-display text-lg pr-6">{t}</p><p className="text-sm text-muted">{d}</p></Link>)}</div>
        </>
      )}

      {tab === "sections" && (
        <Card><h2 className="text-xl">Homepage sections</h2>
          <p className="mt-1 text-sm text-muted">Tick the sections visitors should see. Unticked sections are hidden from the homepage but their content is kept.</p>
          {edit ? (
            <ActionForm action={saveSections} submit="Save sections" className="mt-3 grid gap-2 sm:grid-cols-2">
              {SECTION_LABEL.map(([k, l]) => <label key={k} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold"><input type="checkbox" name="show" value={k} defaultChecked={!hidden.has(k)} /> {l}</label>)}
            </ActionForm>) : <p className="mt-2 text-sm text-muted">You can view but not change this.</p>}
        </Card>
      )}

      {tab === "seo" && (
        <Card><h2 className="text-xl">Search &amp; sharing</h2>
          <p className="mt-1 text-sm text-muted">How the school appears on Google and when the link is shared on WhatsApp or Facebook. Leave blank to use the defaults.</p>
          {edit && <ActionForm action={saveSeo} submit="Save" className="mt-3 grid gap-3 sm:grid-cols-2" encType="multipart/form-data">
            <div className="sm:col-span-2"><Field label="Site title (max 70 characters)" name="title" defaultValue={st.seo?.title} /></div>
            <div className="sm:col-span-2"><TextArea label="Description (max 200)" name="description" defaultValue={st.seo?.description} rows={3} /></div>
            <div className="sm:col-span-2"><Field label="Keywords (comma separated)" name="keywords" defaultValue={st.seo?.keywords} /></div>
            <div className="field"><label htmlFor="og">Share image (PNG/JPG/WebP, wide, max 4 MB)</label><input id="og" name="og" type="file" accept="image/png,image/jpeg,image/webp" className="input" />
              {st.seo?.ogFile && <p className="hint">Current: <a className="text-royal" href={`/api/files/${st.seo.ogFile}`} target="_blank" rel="noopener noreferrer">view</a></p>}</div>
            <label className="flex items-center gap-2 self-end text-sm font-semibold"><input type="checkbox" name="clearOg" /> Remove the share image</label>
          </ActionForm>}
        </Card>
      )}

      {tab === "bar" && (
        <Card><h2 className="text-xl">Announcement bar</h2>
          <p className="mt-1 text-sm text-muted">A slim banner across the top of every public page, for admissions, closures or events.</p>
          {edit && <ActionForm action={saveBar} submit="Save" className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input type="checkbox" name="on" defaultChecked={!!st.bar?.on} /> Show the bar</label>
            <div className="sm:col-span-2"><Field label="Message" name="text" defaultValue={st.bar?.text} /></div>
            <Field label="Link (optional)" name="link" defaultValue={st.bar?.link} placeholder="https://… or /contact" />
            <div className="field"><label htmlFor="tone">Colour</label><select id="tone" name="tone" defaultValue={st.bar?.tone ?? "gold"} className="select"><option value="gold">Gold</option><option value="navy">Navy</option><option value="green">Green</option><option value="red">Red</option></select></div>
          </ActionForm>}
        </Card>
      )}

      {tab === "media" && (
        <Card><h2 className="text-xl">Media library</h2>
          <p className="mt-1 text-sm text-muted">Upload pictures once and reuse the address anywhere (news items, share image, sign-in screens).</p>
          {edit && <ActionForm action={uploadMedia} submit="Upload image" className="mt-3 flex flex-wrap items-end gap-3" encType="multipart/form-data"><div className="field"><label htmlFor="file">Image (max 4 MB)</label><input id="file" name="file" type="file" accept="image/png,image/jpeg,image/webp" className="input" required /></div></ActionForm>}
          <ul className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">{media.map((m) => (
            <li key={m.id} className="rounded-xl border border-line p-2 text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${m.id}`} alt={m.name} className="h-28 w-full rounded-lg object-cover" loading="lazy" />
              <p className="mt-1 truncate font-semibold">{m.name}</p><code className="block truncate text-muted">/api/files/{m.id}</code></li>))}</ul>
        </Card>
      )}

      {tab === "maintenance" && dev && (
        <Card><h2 className="text-xl">Maintenance mode</h2>
          <p className="mt-1 text-sm text-muted">Developer only. The public website shows a &ldquo;back soon&rdquo; page. Sign-in and the portal keep working.</p>
          <ActionForm action={saveMaintenance} submit="Save" className="mt-3 grid gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="on" defaultChecked={!!st.maintenance?.on} /> Put the public website in maintenance mode</label>
            <TextArea label="Message visitors see" name="message" defaultValue={st.maintenance?.message} rows={2} />
          </ActionForm>
        </Card>
      )}
    </>
  );
}
