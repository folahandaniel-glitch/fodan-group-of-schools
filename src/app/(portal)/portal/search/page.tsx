import Link from "next/link";
import { requireMe, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { teacherClassIds, wideScope } from "@/lib/scope";
import { canManage, canView, loadModules } from "@/lib/modules";
import { Card, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Search" };

export default async function Search({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  const q = str((await searchParams).q).trim();
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const staffUser = me.role !== "student" && me.role !== "parent";
  const out: { group: string; title: string; sub?: string; href: string }[] = [];
  if (q.length >= 2) {
    if (staffUser && can(me, "students:view")) {
      const scoped = wideScope(me) ? null : await teacherClassIds(me.id);
      const rows = await sql`SELECT id, first_name, last_name, admission_no FROM students WHERE school_id = ${me.schoolId}
        AND (first_name ILIKE ${like} OR last_name ILIKE ${like} OR admission_no ILIKE ${like}) ${scoped ? sql`AND class_id = ANY(${scoped})` : sql``} LIMIT 8`;
      rows.forEach((r) => out.push({ group: "Students", title: `${r.first_name} ${r.last_name}`, sub: r.admission_no, href: `/portal/students/${r.id}` }));
    }
    if (staffUser && can(me, "staff:view")) {
      const rows = await sql`SELECT id, first_name, last_name, email FROM users WHERE school_id = ${me.schoolId} AND role NOT IN ('student','parent')
        AND (first_name ILIKE ${like} OR last_name ILIKE ${like} OR email ILIKE ${like}) LIMIT 8`;
      rows.forEach((r) => out.push({ group: "Staff", title: `${r.first_name} ${r.last_name}`, sub: r.email, href: `/portal/staff/${r.id}` }));
    }
    const res = await sql`SELECT id, title, kind FROM resources WHERE school_id = ${me.schoolId} AND published = true AND (title ILIKE ${like} OR topic ILIKE ${like}) LIMIT 8`;
    res.forEach((r) => out.push({ group: "Study resources", title: r.title, sub: r.kind, href: "/portal/study" }));
    for (const m of await loadModules()) {
      if (!canView(me, m)) continue;
      const mgr = canManage(me, m);
      const rows = await sql`SELECT id, title, status FROM records WHERE school_id = ${me.schoolId} AND module = ${m.key} AND (title ILIKE ${like} OR body ILIKE ${like})
        ${m.ownOnly && !mgr ? sql`AND (owner_id = ${me.id} OR assignee_id = ${me.id})` : sql``}
        ${!mgr ? sql`AND status NOT IN ('hidden','draft','archived')` : sql``} LIMIT 5`;
      rows.forEach((r) => out.push({ group: m.label, title: r.title, sub: r.status, href: `/portal/m/${m.key}/${r.id}` }));
    }
  }
  const groups = [...new Set(out.map((o) => o.group))];
  return (
    <>
      <PageHeader title="Search" sub="Students, staff, study resources and workspace records you are allowed to see." />
      <form className="mb-5 flex gap-2" role="search"><input name="q" defaultValue={q} className="input" placeholder="Type at least 2 characters" aria-label="Search" autoFocus /><button className="btn btn-primary">Search</button></form>
      {q.length >= 2 && out.length === 0 && <Empty title={`Nothing found for “${q}”`} />}
      {groups.map((g) => (
        <Card key={g} className="mb-4"><h2 className="text-lg">{g}</h2>
          <ul className="mt-2 divide-y divide-line">{out.filter((o) => o.group === g).map((o, i) => (
            <li key={i} className="py-2"><Link className="font-bold text-royal hover:underline" href={o.href}>{o.title}</Link>{o.sub && <span className="ml-2 text-xs text-muted">{o.sub}</span>}</li>
          ))}</ul></Card>
      ))}
    </>
  );
}
