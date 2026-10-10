import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { childIds, studentOf } from "@/lib/scope";
import { str } from "@/lib/data";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { classLabel } from "@/lib/settings";

export const metadata = { title: "Study centre" };

const ICON: Record<string, string> = { pdf: "PDF", word: "DOC", powerpoint: "PPT", excel: "XLS", audio: "MP3", video: "MP4", image: "IMG", youtube: "▶", link: "↗", file: "FILE" };

export default async function Study({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  const sp = await searchParams;
  let classIds: string[] = [];
  const staff = me.role !== "student" && me.role !== "parent";
  if (me.role === "student") { const s = await studentOf(me.id); if (s?.class_id) classIds = [s.class_id]; }
  else if (me.role === "parent") {
    const kids = await childIds(me.id);
    if (kids.length) classIds = (await sql`SELECT DISTINCT class_id FROM students WHERE id = ANY(${kids}) AND class_id IS NOT NULL`).map((r) => r.class_id as string);
  }
  const subject = str(sp.subject);
  const rows = await sql`
    SELECT r.id, r.title, r.description, r.kind, r.url, r.file_id, r.platform, r.duration, r.recommended, r.topic, r.subtopic, s.name AS subject, s.id AS subject_id,
           c.name AS class_name, c.arm, t.name AS term
    FROM resources r LEFT JOIN subjects s ON s.id = r.subject_id LEFT JOIN classes c ON c.id = r.class_id LEFT JOIN terms t ON t.id = r.term_id
    WHERE r.school_id = ${me.schoolId} AND r.published = true
      ${staff ? sql`` : sql`AND (r.class_id IS NULL OR r.class_id = ANY(${classIds}))`}
      ${subject ? sql`AND r.subject_id = ${subject}` : sql``}
    ORDER BY s.name NULLS LAST, r.topic NULLS LAST, r.recommended DESC, r.created_at DESC LIMIT 300`;
  const subjects = [...new Map(rows.filter((r) => r.subject_id).map((r) => [r.subject_id, r.subject])).entries()];
  const grouped = new Map<string, Record<string, any>[]>();
  for (const r of rows) {
    const k = `${r.subject ?? "General"}${r.topic ? " › " + r.topic : ""}`;
    grouped.set(k, [...(grouped.get(k) ?? []), r]);
  }
  return (
    <>
      <PageHeader eyebrow="Fodan Study Centre" title="Learn independently" sub="Resources organised by subject and topic. Practise afterwards with your class assessments and mock exams." />
      {subjects.length > 0 && (
        <nav className="mb-5 flex flex-wrap gap-2" aria-label="Subjects">
          <a href="/portal/study" className={`badge ${!subject ? "badge-info" : ""}`}>All</a>
          {subjects.map(([id, name]) => <a key={String(id)} href={`/portal/study?subject=${id}`} className={`badge ${subject === id ? "badge-info" : ""}`}>{String(name)}</a>)}
        </nav>
      )}
      {rows.length === 0 ? <Empty title="No resources published yet">Teachers add lesson notes, videos and practice material here.</Empty> : (
        [...grouped.entries()].map(([k, list]) => (
          <section key={k} className="mb-7">
            <h2 className="text-xl">{k}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((r) => (
                <Card key={r.id} className="flex flex-col">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper-2 text-xs font-extrabold text-royal" aria-hidden>{ICON[r.kind] ?? "FILE"}</span>
                    <div><p className="font-bold leading-tight">{r.title}</p>
                      <p className="text-xs text-muted">{[r.class_name ? classLabel({ name: r.class_name, arm: r.arm }) : null, r.term, r.platform, r.duration].filter(Boolean).join(" · ")}</p></div>
                  </div>
                  {r.description && <p className="mt-2 line-clamp-2 text-sm text-ink-2">{r.description}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    {r.recommended ? <Badge tone="info">Recommended</Badge> : <span />}
                    <a className="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href={r.file_id ? `/api/files/${r.file_id}` : r.url}>Open</a>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
