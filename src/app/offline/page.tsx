import { allSettings } from "@/lib/settings";
import { siteText } from "@/lib/site-text";
export const metadata = { title: "You are offline" };
export default async function Offline() {
  const pg = siteText(await allSettings().catch(() => ({}))).pages.offline;
  return (
    <main id="main" className="mx-auto grid min-h-dvh max-w-md place-items-center p-6 text-center">
      <div>
        <h1 className="text-3xl">{pg.title}</h1>
        <p className="mt-2 text-muted">{pg.body}</p>
        <a href="/" className="btn btn-primary mt-5">{pg.button}</a>
      </div>
    </main>
  );
}
