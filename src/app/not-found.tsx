import Link from "next/link";
import { allSettings } from "@/lib/settings";
import { siteText } from "@/lib/site-text";

export const metadata = { title: "Page not found" };

export default async function NotFound() {
  const pg = siteText(await allSettings().catch(() => ({}))).pages.notFound;
  return (
    <main id="main" className="mx-auto grid min-h-dvh max-w-md place-items-center p-6 text-center">
      <div>
        <p className="eyebrow">{pg.eyebrow}</p>
        <h1 className="mt-1 font-display text-3xl">{pg.title}</h1>
        <p className="mt-2 text-muted">{pg.body}</p>
        <div className="mt-5 flex justify-center gap-2"><Link href="/" className="btn btn-primary">{pg.homeButton}</Link><Link href="/portal" className="btn btn-ghost">{pg.portalButton}</Link></div>
      </div>
    </main>
  );
}
