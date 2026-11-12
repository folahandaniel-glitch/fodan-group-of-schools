import Link from "next/link";
import { allSettings } from "@/lib/settings";
import { siteText } from "@/lib/site-text";
export const metadata = { title: "Not permitted" };
export default async function Forbidden() {
  const pg = siteText(await allSettings().catch(() => ({}))).pages.forbidden;
  return (
    <main id="main" className="mx-auto grid min-h-dvh max-w-md place-items-center p-6 text-center">
      <div>
        <h1 className="text-3xl">{pg.title}</h1>
        <p className="mt-2 text-muted">{pg.body}</p>
        <Link href="/portal" className="btn btn-primary mt-5">{pg.button}</Link>
      </div>
    </main>
  );
}
