"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; group: string };

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
              const active = i.href === "/portal" ? path === "/portal" : path === i.href || path.startsWith(i.href + "/");
              return (
                <li key={i.href}>
                  <Link href={i.href} className="rail-link" aria-current={active ? "page" : undefined}>{i.label}</Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
