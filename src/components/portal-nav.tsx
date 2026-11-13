"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type NavItem = { href: string; label: string; group: string };

const ICONS: [RegExp, string][] = [
  [/^\/portal$/, "🏠"], [/work|mocks/, "📝"], [/study/, "📚"], [/holiday/, "🏖️"], [/results|mark-sheet|report/, "📊"], [/children/, "👨‍👩‍👧"],
  [/rewards/, "🏆"], [/games/, "🎮"], [/fees/, "💳"], [/library/, "📕"], [/hostel/, "🛏️"], [/sms/, "💬"], [/studio/, "🎨"], [/developer/, "🛠️"], [/access-codes/, "🔑"], [/students/, "🎓"], [/staff/, "👥"], [/classes/, "🏫"], [/promotion/, "⬆️"], [/clock/, "⏱️"], [/branches/, "📍"], [/hrm/, "🧑‍💼"], [/crm/, "🤝"],
  [/performance/, "📈"], [/payslips|payroll/, "💰"], [/ledger/, "📒"], [/expenses/, "🧾"], [/exports/, "⬇️"], [/timetable/, "🗓️"], [/attendance/, "✅"],
  [/calendar/, "📅"], [/lessons/, "📖"], [/questions/, "❓"], [/assessments/, "🧪"], [/resources/, "🗂️"], [/certificates/, "🏅"], [/analytics/, "📉"],
  [/announcements/, "📣"], [/comments/, "✉️"], [/bible/, "✝️"], [/hymns/, "🎵"], [/audit/, "🛡️"], [/backend/, "⚙️"], [/users/, "🔑"], [/settings/, "🎛️"],
  [/^\/portal\/m\//, "🧩"], [/^https?:/, "↗️"],
];
const iconFor = (href: string) => ICONS.find(([re]) => re.test(href))?.[1] ?? "•";

const KEY = "fgs-nav-closed";
const isActive = (href: string, path: string) => (href === "/portal" ? path === "/portal" : path === href.split("?")[0] || path.startsWith(href.split("?")[0] + "/"));

export function PortalNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const groups = [...new Set(items.map((i) => i.group))];
  const [closed, setClosed] = useState<string[]>([]);
  useEffect(() => { try { setClosed(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* ignore */ } }, []);
  const toggle = (g: string) => setClosed((c) => { const n = c.includes(g) ? c.filter((x) => x !== g) : [...c, g]; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  return (
    <nav aria-label="Portal" className="space-y-2">
      {groups.map((g) => {
        const list = items.filter((i) => i.group === g);
        const hasActive = list.some((i) => isActive(i.href, path));
        const open = hasActive || !closed.includes(g);
        return (
          <div key={g}>
            <button type="button" onClick={() => toggle(g)} aria-expanded={open} className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted hover:text-ink">
              <span>{g}</span><span aria-hidden className={"transition-transform " + (open ? "rotate-90" : "")}>›</span>
            </button>
            {open && (
              <ul className="space-y-0.5">
                {list.map((i) => (
                  <li key={i.href}>
                    <Link href={i.href} className="rail-link" aria-current={isActive(i.href, path) ? "page" : undefined}><span className="rail-ico" aria-hidden>{iconFor(i.href)}</span>{i.label}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
