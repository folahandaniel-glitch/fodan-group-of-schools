import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses, opts, str } from "@/lib/data";
import { Card, Empty, PageHeader } from "@/components/ui";
import { PromotionForm } from "@/components/promotion-form";

export const metadata = { title: "Promotion" };

export default async function Promotion({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("promotion:view");
  const sp = await searchParams;
  const classId = str(sp.class);
  const classes = await listClasses(me.schoolId);
  const students = classId
    ? await sql`SELECT id, first_name, last_name, admission_no FROM students WHERE class_id = ${classId} AND school_id = ${me.schoolId} AND status IN ('active','enrolled') ORDER BY last_name, first_name`
    : [];
  const recent = await sql`SELECT h.action, h.created_at, s.first_name, s.last_name, f.name AS from_name, f.arm AS from_arm, t.name AS to_name, t.arm AS to_arm
                           FROM student_history h JOIN students s ON s.id = h.student_id LEFT JOIN classes f ON f.id = h.from_class_id LEFT JOIN classes t ON t.id = h.to_class_id
                           WHERE h.school_id = ${me.schoolId} AND h.action <> 'enrol' ORDER BY h.created_at DESC LIMIT 12`;
  return (
    <>
      <PageHeader title="Promotion & movement" sub="Move students between classes while keeping full history. Access codes never change on promotion." />
      <Card className="mb-5">
        <form className="flex flex-wrap items-end gap-3" role="search">
          <div className="field min-w-[14rem]"><label htmlFor="class">Class</label>
            <select id="class" name="class" defaultValue={classId} className="select"><option value="">Select a class…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
          <button className="btn btn-primary">Load students</button>
        </form>
      </Card>
      {classId && (students.length === 0 ? <Empty title="No active students in this class" /> : (
        can(me, "promotion:create") ? (
          <PromotionForm students={students as unknown as { id: string; first_name: string; last_name: string; admission_no: string }[]} classes={opts(classes, (c) => c.label)} />
        ) : <p className="text-sm text-muted">You can view but not run promotions.</p>
      ))}
      <Card className="mt-6">
        <h2 className="text-xl">Recent movements</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {recent.length === 0 && <li className="py-2 text-muted">Nothing yet.</li>}
          {recent.map((r, i) => (
            <li key={i} className="flex justify-between gap-2 py-2"><span><b>{r.first_name} {r.last_name}</b> · <span className="capitalize">{r.action}</span> {r.from_name} {r.from_arm} → {r.to_name} {r.to_arm}</span>
              <span className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString("en-GB")}</span></li>
          ))}
        </ul>
      </Card>
    </>
  );
}
