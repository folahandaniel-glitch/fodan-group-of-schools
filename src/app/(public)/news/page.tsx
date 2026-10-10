import { publicContent } from "@/lib/content";

export const metadata = { title: "News & events" };
export const dynamic = "force-dynamic";

export default async function News() {
  const c = await publicContent();
  const items = [...(c.announcement ?? []), ...(c.news ?? []), ...(c.event ?? [])];
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <p className="eyebrow">News, announcements &amp; events</p>
      <h1 className="mt-1 text-4xl">What is happening at Fodan</h1>
      <div className="rule-gold mt-3" />
      {items.length === 0 && <p className="mt-8 text-muted">No public news has been published yet.</p>}
      <div className="mt-8 space-y-4">
        {items.map((n) => (
          <article key={n.id} className="card card-pad">
            <div className="flex items-center gap-2"><span className="badge badge-info capitalize">{n.kind}</span>
              <time className="text-xs text-muted" dateTime={String(n.created_at)}>{new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</time></div>
            <h2 className="mt-2 text-xl">{n.title}</h2>
            <p className="mt-1 whitespace-pre-line text-ink-2">{n.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
