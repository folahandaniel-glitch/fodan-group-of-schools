import Link from "next/link";
import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { pageParams, str } from "@/lib/data";
import { wideScope } from "@/lib/scope";
import { classLabel } from "@/lib/settings";
import { Badge, Empty, PageHeader, Pager, statusTone } from "@/components/ui";

export const metadata = { title: "Lesson notes" };

export default async function Lessons({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("lessons:view");
  const sp = await searchParams;
  const status = str(sp.status);
  const mineOnly = !(wideScope(me) || can(me, "lessons:review"));
  const { page, size, offset } = pageParams(sp);
  const where = sql`l.school_id = ${me.schoolId} ${mineOnly ? sql`AND l.teacher_id = ${me.id}` : sql``} ${status ? sql`AND l.status = ${status}` : sql``}`;
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM lesson_notes l WHERE ${where}`;
  const rows = await sql`SELECT l.id, l.topic, l.week, l.status, l.updated_at, s.name AS subject, c.name AS class_name, c.arm, d.name AS dept, u.first_name || ' ' || u.last_name AS teacher
                         FROM lesson_notes l LEFT JOIN subjects s ON s.id = l.subject_id LEFT JOIN classes c ON c.id = l.class_id LEFT JOIN departments d ON d.id = c.department_id
                         JOIN users u ON u.id = l.teacher_id WHERE ${where} ORDER BY l.updated_at DESC LIMIT ${size} OFFSET ${offset}`;
  return (
    <>
      <PageHeader title="Lesson notes" sub={mineOnly ? "Your lesson notes and their review status." : "All lesson notes. Filter to find those awaiting review."}
        actions={can(me, "lessons:create") && <Link href="/portal/lessons/new" className="btn btn-primary">New lesson note</Link>} />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Status filter">
        {["", "draft", "submitted", "reviewed", "approved", "rejected", "published", "archived"].map((s) => (
          <Link key={s} href={s ? `/portal/lessons?status=${s}` : "/portal/lessons"} className={`badge ${status === s ? "badge-info" : ""} capitalize`}>{s || "all"}</Link>
        ))}
      </nav>
      {rows.length === 0 ? <Empty title="No lesson notes">Create your first lesson note.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Topic</th><th>Subject</th><th>Class</th><th>Week</th>{!mineOnly && <th>Teacher</th>}<th>Status</th><th>Updated</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link className="font-bold text-royal hover:underline" href={`/portal/lessons/${r.id}`}>{r.topic}</Link></td>
                  <td>{r.subject ?? "—"}</td><td>{r.class_name ? classLabel({ name: r.class_name, arm: r.arm, department: r.dept }) : "—"}</td><td>{r.week ?? "—"}</td>
                  {!mineOnly && <td>{r.teacher}</td>}
                  <td><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                  <td className="text-xs text-muted">{new Date(r.updated_at).toLocaleDateString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pages={Math.ceil(n / size)} base={`/portal/lessons?status=${status}`} />
    </>
  );
}
