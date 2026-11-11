import Link from "next/link";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { TERM_NAMES, levelName, visibleLevels, weekNo } from "@/lib/curriculum";
import { classLabel } from "@/lib/settings";
import { childIds, studentOf } from "@/lib/scope";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Study centre" };
export const dynamic = "force-dynamic";

const ICON: Record<string, string> = { pdf: "PDF", word: "DOC", powerpoint: "PPT", excel: "XLS", audio: "MP3", video: "MP4", image: "IMG", youtube: "▶", link: "↗", file: "FILE" };
type Row = Record<string, any>;

export default async function Study({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  const sp = await searchParams;
  const view = str(sp.view) === "library" ? "library" : "scheme";
  const manage = can(me, "curriculum:manage");
  const levels = await visibleLevels(me);
  const level = levels.find((l) => String(l.level) === str(sp.level) || l.studentId === str(sp.kid))?.level ?? levels[0]?.level ?? 7;
  const term = [1, 2, 3].includes(Number(str(sp.term))) ? Number(str(sp.term)) : 1;
  const subject = str(sp.subject);

  const switcher = (
    <nav className="mb-5 flex flex-wrap items-center gap-2" aria-label="Study centre">
      <Link href="/portal/study" className={`badge text-sm ${view === "scheme" ? "badge-info" : ""}`}>Scheme of work</Link>
      <Link href="/portal/study?view=library" className={`badge text-sm ${view === "library" ? "badge-info" : ""}`}>Resource library</Link>
      {manage && <Link href="/portal/study/manage" className="badge text-sm">Manage curriculum</Link>}
    </nav>
  );

  if (view === "library") return <>{header()}{switcher}{await library(me, sp)}</>;

  const subjects: Row[] = await sql`SELECT t.subject, count(*)::int AS n,
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM topic_progress p WHERE p.topic_id = t.id AND p.user_id = ${me.id}))::int AS done
    FROM curriculum_topics t WHERE t.school_id = ${me.schoolId} AND t.level = ${level} AND t.term = ${term} AND t.teaching GROUP BY t.subject ORDER BY t.subject`;
  const topics: Row[] = subject ? await sql`SELECT t.id, t.week, t.topic, t.content, t.teaching,
      EXISTS (SELECT 1 FROM topic_lessons l WHERE l.topic_id = t.id AND l.status = 'approved') AS lesson,
      (SELECT count(*)::int FROM resources r WHERE r.topic_id = t.id AND r.published) AS res,
      EXISTS (SELECT 1 FROM topic_progress p WHERE p.topic_id = t.id AND p.user_id = ${me.id}) AS done
    FROM curriculum_topics t WHERE t.school_id = ${me.schoolId} AND t.level = ${level} AND t.term = ${term} AND t.subject = ${subject}` : [];
  topics.sort((a, b) => weekNo(a.week) - weekNo(b.week));
  const [{ total }] = await sql`SELECT count(*)::int AS total FROM curriculum_topics WHERE school_id = ${me.schoolId}`;
  const q = (o: Record<string, string | number>) => `/portal/study?${new URLSearchParams({ level: String(level), term: String(term), ...(subject ? { subject } : {}), ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) })}`;

  return (
    <>
      {header()}
      {switcher}
      {levels.length === 0 ? <Empty title="No class found">Your account is not linked to a class yet. Contact the school office.</Empty> : (
        <>
          <Card className="mb-5">
            <div className="flex flex-wrap items-center gap-2">
              {me.role === "parent" || me.role !== "student" ? (
                <form className="flex flex-wrap items-center gap-2"><input type="hidden" name="term" value={term} />
                  <select name="level" defaultValue={level} className="select !w-auto" aria-label="Class">{levels.map((l) => <option key={l.level + (l.studentId ?? "")} value={l.level}>{l.label}</option>)}</select>
                  <button className="btn btn-primary btn-sm">Show</button></form>
              ) : <Badge tone="info">{levelName(level)}</Badge>}
              <span className="mx-1 text-muted">|</span>
              {TERM_NAMES.map((n, i) => <Link key={n} href={q({ term: i + 1, subject: "" })} className={`badge text-sm ${term === i + 1 ? "badge-info" : ""}`}>{n}</Link>)}
            </div>
          </Card>

          {total === 0 ? (
            <Empty title="The scheme of work has not been loaded yet">{manage ? <Link className="font-bold text-royal" href="/portal/study/manage">Load the NERDC scheme of work →</Link> : "The school will load it soon."}</Empty>
          ) : subjects.length === 0 ? <Empty title={`No topics for ${levelName(level)}, ${TERM_NAMES[term - 1]}`} /> : (
            <section>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {subjects.map((s) => (
                  <Link key={s.subject} href={q({ subject: s.subject })} className={`card card-lift gold-top block p-4 ${subject === s.subject ? "ring-2 ring-royal-2" : ""}`}>
                    <p className="font-display text-lg leading-tight">{s.subject}</p>
                    <p className="mt-1 text-xs text-muted">{s.n} topics{me.role === "student" ? ` · ${s.done} studied` : ""}</p>
                    {me.role === "student" && s.n > 0 && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2"><div className="h-full bg-gold-2" style={{ width: `${Math.round((s.done / s.n) * 100)}%` }} /></div>}
                  </Link>))}
              </div>
              {subject && (
                <Card className="mt-6"><h2 className="text-2xl">{subject}</h2><p className="text-sm text-muted">{levelName(level)} · {TERM_NAMES[term - 1]}</p>
                  <ul className="mt-4 divide-y divide-line">
                    {topics.map((t) => (
                      <li key={t.id} className="flex items-start gap-3 py-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-strong text-center text-white"><span className="text-[0.55rem] leading-none">WEEK<br /><span className="text-base font-bold">{t.week || "–"}</span></span></span>
                        <div className="min-w-0 flex-1">
                          <Link className="font-bold text-royal" href={`/portal/study/topic/${t.id}`}>{t.topic}</Link>
                          {t.content && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{t.content}</p>}
                          <div className="mt-1 flex flex-wrap gap-1.5">{t.lesson && <Badge tone="ok">Lesson ready</Badge>}{t.res > 0 && <Badge tone="info">{t.res} resource{t.res === 1 ? "" : "s"}</Badge>}{t.done && <Badge tone="ok">Studied ✓</Badge>}</div>
                        </div>
                      </li>))}
                  </ul>
                </Card>
              )}
            </section>
          )}
        </>
      )}
      <p className="mt-6 text-xs text-muted">Topics follow the NERDC 2025 scheme of work.</p>
    </>
  );
}

function header() {
  return <PageHeader eyebrow="Fodan Study Centre" title="Learn independently" sub="Every subject, term and week of the scheme of work, with lessons and resources. Practise afterwards with class assessments and mock exams." />;
}

async function library(me: Awaited<ReturnType<typeof requireMe>>, sp: Record<string, string | string[] | undefined>) {
  let classIds: string[] = [];
  const staff = me.role !== "student" && me.role !== "parent";
  if (me.role === "student") { const s = await studentOf(me.id); if (s?.class_id) classIds = [s.class_id]; }
  else if (me.role === "parent") {
    const kids = await childIds(me.id);
    if (kids.length) classIds = (await sql`SELECT DISTINCT class_id FROM students WHERE id = ANY(${kids}) AND class_id IS NOT NULL`).map((r) => r.class_id as string);
  }
  const subject = str(sp.subject);
  const rows: Row[] = await sql`
    SELECT r.id, r.title, r.description, r.kind, r.url, r.file_id, r.platform, r.duration, r.recommended, r.topic, s.name AS subject, s.id AS subject_id,
           c.name AS class_name, c.arm, t.name AS term
    FROM resources r LEFT JOIN subjects s ON s.id = r.subject_id LEFT JOIN classes c ON c.id = r.class_id LEFT JOIN terms t ON t.id = r.term_id
    WHERE r.school_id = ${me.schoolId} AND r.published = true
      ${staff ? sql`` : sql`AND (r.class_id IS NULL OR r.class_id = ANY(${classIds}))`}
      ${subject ? sql`AND r.subject_id = ${subject}` : sql``}
    ORDER BY s.name NULLS LAST, r.topic NULLS LAST, r.recommended DESC, r.created_at DESC LIMIT 300`;
  const subjects = [...new Map(rows.filter((r) => r.subject_id).map((r) => [r.subject_id, r.subject])).entries()];
  const grouped = new Map<string, Row[]>();
  for (const r of rows) { const k = `${r.subject ?? "General"}${r.topic ? " › " + r.topic : ""}`; grouped.set(k, [...(grouped.get(k) ?? []), r]); }
  return (
    <>
      {subjects.length > 0 && (
        <nav className="mb-5 flex flex-wrap gap-2" aria-label="Subjects">
          <Link href="/portal/study?view=library" className={`badge ${!subject ? "badge-info" : ""}`}>All</Link>
          {subjects.map(([id, name]) => <Link key={String(id)} href={`/portal/study?view=library&subject=${id}`} className={`badge ${subject === id ? "badge-info" : ""}`}>{String(name)}</Link>)}
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
