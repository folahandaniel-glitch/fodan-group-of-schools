import Link from "next/link";
import { requireMe } from "@/lib/auth";
import { Logo } from "@/components/ui";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireMe();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-paper-2/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/portal" className="flex items-center gap-3"><Logo size={40} /><span className="font-display">Fodan Portal</span></Link>
          <nav className="flex gap-1 text-sm font-semibold">
            <Link className="rounded-lg px-3 py-1.5 hover:bg-paper-2" href="/account">Profile</Link>
            <Link className="rounded-lg px-3 py-1.5 hover:bg-paper-2" href="/account/password">Password</Link>
            <Link className="rounded-lg px-3 py-1.5 hover:bg-paper-2" href="/account/security">Security</Link>
            <Link className="rounded-lg px-3 py-1.5 hover:bg-paper-2" href="/portal">Portal →</Link>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl p-4 sm:p-8">{children}</main>
    </div>
  );
}
