import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Logo } from "@/components/ui";
import { PortalNav, type NavItem } from "@/components/portal-nav";
import { ROLE_LABEL } from "@/lib/logic/permissions";
import { currentTerm, getSetting } from "@/lib/settings";
import { canView, loadModules } from "@/lib/modules";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { logout } from "@/app/(auth)/actions";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMe();
  if (me.mustChange) redirect("/account/password?forced=1");
  if (me.role === "super_admin" && !me.mfaEnabled) redirect("/account/security?setup=1");

  const [{ n }] = await sql`SELECT count(*)::int AS n FROM notifications WHERE user_id = ${me.id} AND read = false`;
  const term = await currentTerm();
  const learner = me.role === "student" || me.role === "parent";
  const mods = await loadModules();
  const labels = ((await getSetting<Record<string, string>>("labels")) ?? {}) as Record<string, string>;
  const audience = me.role === "parent" ? "parents" : me.role === "student" ? "students" : "staff";
  const banner = await sql`SELECT id, title FROM content_items WHERE school_id = ${me.schoolId} AND published = true AND kind = 'announcement'
                           AND audience IN ('public','all', ${audience}) ORDER BY created_at DESC LIMIT 5`;

  const items: NavItem[] = [{ href: "/portal", label: "Dashboard", group: "Overview" }];
  const add = (cond: boolean, href: string, label: string, group: string) => cond && items.push({ href, label, group });
  add(me.role === "parent", "/portal/children", "My children", "Overview");
  add(me.role === "student", "/portal/work", "Assignments & tests", "Learn");
  add(me.role === "student" && can(me, "assessments:view"), "/portal/mocks", "Mock centre", "Learn");
  add(learner || can(me, "resources:view"), "/portal/study", "Study centre", "Learn");
  add(learner || can(me, "results:view"), "/portal/results", "Results", "Learn");
  add(!learner && can(me, "students:view"), "/portal/students", "Students", "School");
  add(!learner && can(me, "staff:view"), "/portal/staff", "Staff", "School");
  add(!learner && can(me, "classes:view"), "/portal/classes", "Classes & subjects", "School");
  add(!learner && (can(me, "promotion:view") || can(me, "promotion:create")), "/portal/promotion", "Promotion", "School");
  add(!learner && can(me, "clock:view"), "/portal/clock", "Clock in / out", "School");
  add(!learner && can(me, "branches:view"), "/portal/branches", "Branches & fines", "School");
  add(can(me, "timetable:view"), "/portal/timetable", "Timetable", "School");
  add(can(me, "attendance:view"), "/portal/attendance", "Attendance", "School");
  add(can(me, "calendar:view"), "/portal/calendar", "Academic calendar", "School");
  add(!learner && can(me, "lessons:view"), "/portal/lessons", "Lesson notes", "Teaching");
  add(!learner && can(me, "questions:view"), "/portal/questions", "Question bank", "Teaching");
  add(!learner && can(me, "assessments:view"), "/portal/assessments", "Assessments", "Teaching");
  add(!learner && can(me, "resources:create"), "/portal/resources", "Resources", "Teaching");
  add(!learner && can(me, "results:view"), "/portal/mark-sheet", "Mark sheet", "Teaching");
  add(me.role === "parent" || can(me, "certificates:view"), "/portal/certificates", "Certificates", "Records");
  add(!learner && can(me, "analytics:view"), "/portal/analytics", "Analytics", "Records");
  add(can(me, "announcements:view"), "/portal/announcements", "Announcements", "Communicate");
  add(can(me, "comments:view"), "/portal/comments", "Website messages", "Communicate");
  for (const m of mods) add(canView(me, m), `/portal/m/${m.key}`, m.label, m.key === "forum" || m.key === "kb" ? "Community" : "Workspace");
  add(can(me, "audit:view"), "/portal/audit", "Audit & security", "Administration");
  add(can(me, "settings:view") || can(me, "*"), "/portal/backend", "BackEnd console", "Administration");
  add(can(me, "users:view") || can(me, "*"), "/portal/users", "Users & access", "Administration");
  add(can(me, "settings:view") || can(me, "cms:view") || can(me, "*"), "/portal/settings", "Settings & content", "Administration");

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="no-print hidden border-r border-line bg-paper-2/60 lg:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-5 overflow-y-auto p-4">
          <Link href="/portal" className="flex items-center gap-3 rounded-xl p-1">
            <Logo size={46} />
            <span className="leading-tight"><span className="block font-display text-[0.98rem]">Fodan College</span><span className="block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-gold">International</span></span>
          </Link>
          <PortalNav items={items.map((i) => ({ ...i, label: labels[i.label] ?? i.label }))} />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-paper/95 px-4 py-2.5 backdrop-blur">
          <details className="relative lg:hidden">
            <summary className="btn btn-ghost btn-sm list-none">Menu</summary>
            <div className="absolute left-0 top-12 max-h-[75dvh] w-72 overflow-y-auto rounded-2xl border border-line bg-white p-3 shadow-2xl"><PortalNav items={items.map((i) => ({ ...i, label: labels[i.label] ?? i.label }))} /></div>
          </details>
          <form action="/portal/search" role="search" className="hidden flex-1 lg:block"><input name="q" className="input !min-h-9 max-w-xs !py-1" placeholder={term ? `Search · ${term.session_name} ${term.name}` : "Search"} aria-label="Search the portal" /></form>
          <div className="flex items-center gap-2">
            <Link href="/portal/notifications" className="btn btn-ghost btn-sm" aria-label={`Notifications, ${n} unread`}>
              Alerts{n > 0 && <span className="badge badge-bad">{n}</span>}
            </Link>
            <Link href="/account" className="btn btn-ghost btn-sm">
              <span className="max-w-[10rem] truncate">{me.name}</span><span className="badge badge-info hidden sm:inline-flex">{ROLE_LABEL[me.role] ?? me.role}</span>
            </Link>
            <form action={logout}><button className="btn btn-primary btn-sm">Sign out</button></form>
          </div>
        </header>
        {banner.length > 0 && <AnnouncementBanner items={banner.map((b) => ({ id: b.id as string, title: b.title as string }))} />}
        <main id="main" className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
