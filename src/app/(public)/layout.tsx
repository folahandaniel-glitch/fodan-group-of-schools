import Link from "next/link";
import { Logo } from "@/components/ui";
import { allSettings } from "@/lib/settings";
import { ThemePicker } from "@/components/theme-picker";
import { resolveTheme } from "@/lib/theme-server";
import { siteText } from "@/lib/site-text";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const s = await allSettings();
  const th = await resolveTheme();
  const t = siteText(s);
  const NAV = t.nav;
  const custom = ((s.links?.custom ?? []) as string[]).map((l) => l.split("|").map((x) => x.trim())).filter((p) => p.length === 2);
  const cbt = (s.social as Record<string, string>).cbt;
  const social = Object.entries(s.social as Record<string, string>).filter(([, v]) => v);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-3" aria-label="Fodan College International home">
            <Logo size={46} />
            <span className="hidden leading-tight sm:block">
              <span className="block font-display text-[1.05rem] font-semibold text-ink">{s.brand.school}</span>
              <span className="block text-[0.7rem] font-bold uppercase tracking-[0.14em] text-gold">{s.brand.group}</span>
            </span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-2 hover:bg-paper-2">{n.label}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            {cbt && <a href={cbt} target="_blank" rel="noopener noreferrer" className="btn btn-gold btn-sm hidden sm:inline-flex">{t.cbtLabel}</a>}
            {th.picker && <ThemePicker themes={th.choices} fallback={th.id} />}
            <Link href="/login" className="btn btn-ghost btn-sm">{t.signInLabel}</Link>
            <Link href="/register" className="btn btn-primary btn-sm">{t.registerLabel}</Link>
          </div>
        </div>
        <nav aria-label="Main mobile" className="flex gap-1 overflow-x-auto border-t border-line px-3 py-1.5 lg:hidden">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-2">{n.label}</Link>)}
        </nav>
      </header>

      <main id="main" className="flex-1">{children}</main>

      <footer className="border-t border-line bg-strong text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
          <div>
            <div className="inline-block rounded-xl bg-white p-2"><Logo size={64} /></div>
            <p className="mt-3 font-display text-lg">{s.brand.school}</p>
            <p className="text-sm text-white/70">{s.brand.group}</p>
            <p className="mt-2 text-sm text-gold-soft">{s.brand.tagline}</p>
          </div>
          <div className="text-sm text-white/80">
            <p className="eyebrow !text-gold-2">{t.footerContactTitle}</p>
            <p className="mt-2">{s.contact.address}</p>
            <p>{s.contact.phone}</p>
            <p>{s.contact.email}</p>
            <p className="mt-2 text-white/60">{s.contact.officeHours}</p>
          </div>
          <div className="text-sm">
            <p className="eyebrow !text-gold-2">{t.footerPortalsTitle}</p>
            <ul className="mt-2 space-y-1 text-white/80">
              {t.footerLinks.map((l) => <li key={l.href + l.label}><Link href={l.href} className="hover:text-white">{l.label}</Link></li>)}
            </ul>
            {(social.length > 0 || custom.length > 0) && (
              <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-white/70">
                {social.map(([k, v]) => <li key={k}><a className="hover:text-white" href={v} rel="noopener noreferrer" target="_blank">{k === "cbt" ? "Fodan CBT" : k === "x" ? "X" : k[0].toUpperCase() + k.slice(1)}</a></li>)}
                {custom.map(([label, url]) => <li key={url}><a className="hover:text-white" href={url} rel="noopener noreferrer" target="_blank">{label}</a></li>)}
              </ul>
            )}
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center">
          <p className="text-xs text-white/70">{s.footer?.text}</p>
          <Link href="/login?staff=1" className="mt-1 inline-block text-[10px] uppercase tracking-widest text-white/35 hover:text-white/70">{t.backendLabel}</Link>
        </div>
      </footer>
    </div>
  );
}
