import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { levelName } from "@/lib/curriculum";
import { Badge, Card, Empty, Field, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { deleteProgramme, markPaid, saveAttendance, unenrol, updateProgramme } from "../actions";

export const dynamic = "force-dynamic";
type Row = Record<string, any>;
const ymd = (v: unknown) => new Date(v as string).toISOString().slice(0, 10);

export default async function Programme({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("holiday:manage");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [p] = await sql`SELECT * FROM holiday_programmes WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!p) notFound();
  const sessions: Row[] = await sql`SELECT session_no, title FROM holiday_sessions WHERE programme_id = ${id} ORDER BY session_no`;
  const enrolled: Row[] = await sql`SELECT e.id, e.paid, e.student_id, s.first_name, s.last_name, s.admission_no FROM holiday_enrolments e JOIN students s ON s.id = e.student_id
    WHERE e.programme_id = ${id} ORDER BY s.last_name, s.first_name`;
  const no = Number(str(sp.session)) || 1;
  const present = new Set((await sql`SELECT student_id FROM holiday_attendance WHERE programme_id = ${id} AND session_no = ${no}`).map((r) => r.student_id as string));
  const counts: Row[] = await sql`SELECT student_id, count(*)::int AS n FROM holiday_attendance WHERE programme_id = ${id} GROUP BY student_id`;
  const attended = new Map(counts.map((c) => [c.student_id as string, c.n as number]));
  const paidCount = enrolled.filter((e) => e.paid).length;

  return (
    <>
      <PageHeader title={p.title} sub={`${levelName(p.level)} · ${new Date(p.starts_on).toLocaleDateString("en-GB")} to ${new Date(p.ends_on).toLocaleDateString("en-GB")} · ${enrolled.length} enrolled, ${paidCount} paid`}
        actions={<Link href="/portal/holiday" className="btn btn-ghost btn-sm">← All programmes</Link>} />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <Card><h2 className="text-xl">Enrolled students</h2>
            {enrolled.length === 0 ? <div className="mt-3"><Empty title="Nobody has enrolled yet" /></div> : (
              <ul className="mt-3 divide-y divide-line text-sm">{enrolled.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span><strong>{e.last_name}, {e.first_name}</strong> <span className="text-muted">{e.admission_no}</span> · attended {attended.get(e.student_id) ?? 0}/{sessions.length}</span>
                  <span className="flex items-center gap-2">{e.paid ? <Badge tone="ok">Paid</Badge> : <Badge tone="warn">Unpaid</Badge>}
                    {!e.paid && <form action={markPaid}><input type="hidden" name="id" value={e.id} /><button className="btn btn-primary btn-sm">Mark paid</button></form>}
                    <form action={unenrol}><input type="hidden" name="id" value={e.id} /><button className="btn btn-ghost btn-sm">Remove</button></form></span>
                </li>))}</ul>)}
            {Number(p.fee) > 0 && <p className="mt-3 text-xs text-muted">Marking a fee as paid books ₦{Number(p.fee).toLocaleString("en-NG")} as other income in the ledger, once per student.</p>}
          </Card>

          <Card><h2 className="text-xl">Attendance</h2>
            <nav className="mt-2 flex flex-wrap gap-1.5" aria-label="Sessions">{sessions.map((s) => <Link key={s.session_no} href={`/portal/holiday/${id}?session=${s.session_no}`} className={`badge ${no === s.session_no ? "badge-info" : ""}`}>{s.session_no}</Link>)}</nav>
            <p className="mt-2 text-sm font-bold">Session {no}: {sessions.find((s) => s.session_no === no)?.title ?? ""}</p>
            {paidCount === 0 ? <p className="mt-2 text-sm text-muted">Attendance can be marked for students who are enrolled and paid.</p> : (
              <ActionForm action={saveAttendance} submit="Save attendance" className="mt-3 grid gap-2"><input type="hidden" name="programme" value={id} /><input type="hidden" name="session" value={no} />
                <ul className="grid gap-1.5 sm:grid-cols-2">{enrolled.filter((e) => e.paid).map((e) => (
                  <li key={e.id}><label className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm"><input type="checkbox" name="present" value={e.student_id} defaultChecked={present.has(e.student_id)} /> {e.last_name}, {e.first_name}</label></li>))}</ul>
              </ActionForm>)}
          </Card>
        </div>
        <div className="space-y-5">
          <Card><h2 className="text-xl">Sessions</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{sessions.map((s) => <li key={s.session_no}>{s.title}</li>)}</ol></Card>
          <Card><h2 className="text-xl">Edit programme</h2>
            <ActionForm action={updateProgramme} submit="Save changes" className="mt-3 grid gap-3"><input type="hidden" name="id" value={id} />
              <Field label="Title" name="title" defaultValue={p.title} required /><Field label="Starts" name="starts" type="date" defaultValue={ymd(p.starts_on)} required /><Field label="Ends" name="ends" type="date" defaultValue={ymd(p.ends_on)} required />
              <Field label="Fee (₦)" name="fee" type="number" defaultValue={Number(p.fee)} /><Field label="Places" name="capacity" type="number" defaultValue={p.capacity} />
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={p.active} /> Open for enrolment</label></ActionForm>
            <form action={deleteProgramme} className="mt-3"><input type="hidden" name="id" value={id} /><button className="btn btn-danger btn-sm">Delete programme</button></form></Card>
        </div>
      </div>
    </>
  );
}
