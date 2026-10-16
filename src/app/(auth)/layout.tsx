import Link from "next/link";
import { Logo } from "@/components/ui";

import { AuthArt } from "@/components/auth-art";
import { allSettings } from "@/lib/settings";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const s = await allSettings();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full border-[40px] border-gold-2/15" aria-hidden />
        <div className="pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full border-[28px] border-royal-2/30" aria-hidden />
        <Link href="/" className="relative inline-flex w-fit items-center gap-3">
          <span className="rounded-xl bg-white p-1.5"><Logo size={56} /></span>
          <span className="font-display text-xl">Fodan Group of Schools</span>
        </Link>
        <div className="relative">
          <p className="eyebrow !text-gold-2">Fodan College International</p>
          <p className="mt-3 font-display text-4xl leading-tight">Learn. Practise.<br />Test. Improve.</p>
          <div className="rule-gold mt-5" />
          <p className="mt-5 max-w-sm text-white/75">{s.authArt?.caption || "Smart assessment. Secure examination. Better learning."}</p>
          <AuthArt slot="login" className="mt-6 max-w-sm !border-white/20 !bg-white/10" />
        </div>
        <p className="relative text-xs text-white/60">{s.footer?.text}</p>
      </aside>
      <main id="main" className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          <Link href="/" className="mb-6 flex items-center gap-3 lg:hidden"><Logo size={48} /><span className="font-display text-lg">Fodan Group of Schools</span></Link>
          {children}
          <p className="mt-8 text-center text-xs text-muted lg:hidden">{s.footer?.text}</p>
        </div>
      </main>
    </div>
  );
}
