import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getPlatform } from "@/lib/platform-server";
import { MENU_CATALOGUE, PLATFORM_MODULES, moduleOf } from "@/lib/platform";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { savePlatform } from "./actions";

export const metadata = { title: "Developer console" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: "ok" | "warn" | "info" }> = {
  built: { label: "Built", tone: "ok" }, new: { label: "New: switch on when ready", tone: "info" }, needs_keys: { label: "Needs a provider key to send", tone: "warn" },
};

export default async function DeveloperConsole() {
  const me = await requireMe();
  if (me.role !== "developer") redirect("/forbidden");
  const plat = await getPlatform();
  const grants = await sql`SELECT u.id, u.first_name, u.last_name, u.role, count(g.perm)::int AS n FROM user_grants g JOIN users u ON u.id = g.user_id WHERE u.school_id = ${me.schoolId} GROUP BY u.id ORDER BY u.last_name LIMIT 100`;
  const supers = await sql`SELECT u.id, u.first_name, u.last_name FROM user_roles r JOIN users u ON u.id = r.user_id WHERE u.school_id = ${me.schoolId} AND r.role = 'super_admin' ORDER BY u.last_name`;
  const menuIndex = new Map(MENU_CATALOGUE.map((m, i) => [m.href, i]));

  return (
    <>
      <PageHeader eyebrow="Developer" title="Developer console" sub="Switch modules and menu items on or off for everyone else, and hand out access. You always see everything; switched-off items are marked (off) in your menu." />
      <ActionForm action={savePlatform} submit="Save switches" className="grid gap-5">
        <Card>
          <h2 className="text-xl">Modules</h2>
          <p className="mt-1 text-sm text-muted">A module that is switched off disappears from every menu and its pages refuse to open, even from a saved link. Switching a module on or off does not delete any data.</p>
          <ul className="mt-3 divide-y divide-line">
            {PLATFORM_MODULES.map((m) => (
              <li key={m.key} className="flex items-start gap-3 py-3">
                <label className="mt-1 flex items-center gap-2"><input type="checkbox" name={`mod_${m.key}`} defaultChecked={plat.modules[m.key]} className="h-5 w-5" aria-label={`${m.label} on`} /></label>
                <div className="min-w-0 flex-1"><p className="font-bold">{m.label} <Badge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Badge></p><p className="text-sm text-muted">{m.blurb}</p></div>
              </li>))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-xl">Menu items and commands</h2>
          <p className="mt-1 text-sm text-muted">Untick a single menu item to hide it and block its pages for everyone else, even if its module is on. The Developer console, Settings, BackEnd, Users, Website Studio, Audit and Downloads can never be switched off.</p>
          <div className="mt-3 grid gap-5 md:grid-cols-2">
            {PLATFORM_MODULES.map((m) => {
              const items = MENU_CATALOGUE.filter((x) => moduleOf(x.href)?.key === m.key);
              return items.length === 0 ? null : (
                <fieldset key={m.key} className="rounded-2xl border border-line p-3"><legend className="px-2 text-sm font-bold">{m.label}</legend>
                  <ul className="space-y-1.5">{items.map((x) => (
                    <li key={x.href}><label className="flex items-center gap-2 text-sm"><input type="checkbox" name={`menu_${menuIndex.get(x.href)}`} defaultChecked={plat.menus[x.href] !== false} /> {x.label} <span className="text-xs text-muted">{x.href.replace("/portal", "")}</span></label></li>))}</ul></fieldset>);
            })}
          </div>
        </Card>
      </ActionForm>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl">Give access to others</h2>
          <p className="mt-1 text-sm text-muted">Open a staff profile and use <b>Special access</b> to give one person any segment or menu, branches and campus settings included, or make them a Super Admin. Roles can also be changed in Settings → Roles &amp; permissions.</p>
          <p className="mt-3 text-sm font-bold">Extra Super Admins</p>
          {supers.length === 0 ? <p className="text-sm text-muted">None.</p> : <ul className="mt-1 flex flex-wrap gap-2">{supers.map((u) => <li key={u.id}><Link className="badge badge-info" href={`/portal/staff/${u.id}`}>{u.first_name} {u.last_name}</Link></li>)}</ul>}
          <p className="mt-3 text-sm font-bold">People with special access</p>
          {grants.length === 0 ? <p className="text-sm text-muted">Nobody yet.</p> : <ul className="mt-1 divide-y divide-line text-sm">{grants.map((u) => <li key={u.id} className="flex justify-between py-1.5"><Link className="font-semibold text-royal" href={`/portal/staff/${u.id}`}>{u.first_name} {u.last_name}</Link><span className="text-muted">{u.n} permission{u.n === 1 ? "" : "s"}</span></li>)}</ul>}
          <Link href="/portal/staff" className="btn btn-ghost btn-sm mt-3">Open the staff list</Link>
        </Card>
        <Card>
          <h2 className="text-xl">Website Studio</h2>
          <p className="mt-1 text-sm text-muted">Edit the public website: sections, text, branding, search-engine details, announcement bar, media and maintenance mode.</p>
          <Link href="/portal/studio" className="btn btn-gold mt-3">Open Website Studio</Link>
        </Card>
      </div>
    </>
  );
}
