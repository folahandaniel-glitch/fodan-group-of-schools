"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function PortalNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav aria-label="Portal" className="space-y-5">
      {groups.map((g) => (
        <div key={g}>
          <p className="px-3 pb-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted">{g}</p>
          <ul className="space-y-0.5">
            {items.filter((i) => i.group === g).map((i) => {
              const active = i.href === "/portal" ? path === "/portal" : path === i.href.split("?")[0] || path.startsWith(i.href.split("?")[0] + "/");
              return (
                <li key={i.href}>
                  <Link href={i.href} className="rail-link" aria-current={active ? "page" : undefined}><span className="rail-ico" aria-hidden>{iconFor(i.href)}</span>{i.label}</Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
