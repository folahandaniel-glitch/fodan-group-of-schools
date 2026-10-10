import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireMe, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { canSeeStudent } from "@/lib/scope";
import { allSettings, classLabel, currentTerm } from "@/lib/settings";
import { gradeFor, rankPositions, ordinal } from "@/lib/logic/scoring";
import { Logo } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { ActionForm } from "@/components/action-form";
import { TextArea } from "@/components/ui";
import { saveRemarks } from "./actions";

export const dynamic = "force-dynamic";

export default async function ReportCard({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ term?: string }> }) {
  const me = await requireMe();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(await canSeeStudent(me, id))) notFound();
  const s = await allSettings();
  const cur = await currentTerm();
  const termId = sp.term && /^[0-9a-f-]{36}$/i.test(sp.term) ? sp.term : cur?.id;
  if (!termId) notFound();
  const [t] = await sql`SELECT t.name, a.name AS session FROM terms t JOIN academic_sessions a ON a.id = t.session_id WHERE t.id = ${termId}`;
  const [st] = await sql`SELECT s.*, c.name AS class_name, c.arm, c.id AS cid, d.name AS dept, u.photo_file,
      (SELECT first_name || ' ' || last_name FROM users WHERE id = c.class_teacher_id) AS class_teacher
      FROM students s LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN departments d ON d.id = c.department_id LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ${id}`;
  if (!st || !t) notFound();
  const learner = me.role === "student" || me.role === "parent";
  const rows = await sql`SELECT r.*, sub.name AS subject FROM results r JOIN subjects sub ON sub.id = r.subject_id
                         WHERE r.student_id = ${id} AND r.term_id = ${termId} ${learner ? sql`AND r.released = true` : sql``} ORDER BY sub.name`;
  const totalAll = rows.reduce((x, r) => x + Number(r.total), 0);
  const avg = rows.length ? Math.round((totalAll / rows.length) * 10) / 10 : 0;

  // Class position: rank by overall total among classmates with released/computed results.
  let position = "";
  if (s.results.showPosition && st.class_id && rows.length) {
    const mates = await sql`SELECT student_id AS id, sum(total)::float AS total FROM results WHERE class_id = ${st.class_id} AND term_id = ${termId} GROUP BY student_id`;
    const pos = rankPositions(mates as unknown as { id: string; total: number }[]).get(id);
    if (pos) position = `${ordinal(pos)} of ${mates.length}`;
  }
  const [rem] = await sql`SELECT * FROM report_remarks WHERE student_id = ${id} AND term_id = ${termId}`;
  const [att] = await sql`SELECT count(*) FILTER (WHERE status = 'present')::int AS present, count(*) FILTER (WHERE status = 'late')::int AS late, count(*)::int AS total
                          FROM attendance WHERE subject_ref = ${id} AND kind = 'student'`;
  const base = process.env.APP_BASE_URL || "";
  const qr = await QRCode.toDataURL(`${base}/portal/report/${id}?term=${termId}`, { margin: 1, width: 110 });
  const canRemark = can(me, "reports:edit") || can(me, "reports:approve");
  const principalRemark = rem?.principal || (avg >= 70 ? "A commendable result. Keep it up." : avg >= 50 ? "A satisfactory result. Aim higher next term." : "Needs closer attention and support.");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-4 flex justify-end gap-2"><PrintButton /></div>
      <article className="print-sheet card relative overflow-hidden p-6 sm:p-10">
        <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-[0.04]" aria-hidden><Logo size={420} /></div>
        <header className="relative flex items-center gap-5 border-b-4 border-double border-ink pb-4">
          <Logo size={84} />
          <div className="flex-1 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{s.brand.group}</p>
            <h1 className="text-2xl sm:text-3xl">{s.brand.school}</h1>
            <p className="text-sm text-muted">{s.contact.address} · {s.contact.phone}</p>
            <p className="mt-1 font-display text-lg italic">Terminal Report Card</p>
          </div>
          {st.photo_file ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={`/api/files/${st.photo_file}`} alt="" className="h-24 w-20 rounded-lg border border-line object-cover" /> : <div className="h-24 w-20 rounded-lg border border-dashed border-line" aria-hidden />}
        </header>

        <dl className="relative mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-muted">Student</dt><dd className="font-bold">{st.first_name} {st.middle_name} {st.last_name}</dd></div>
          <div><dt className="text-xs text-muted">Admission no.</dt><dd className="font-bold">{st.admission_no}</dd></div>
          <div><dt className="text-xs text-muted">Class</dt><dd className="font-bold">{st.class_name ? classLabel({ name: st.class_name, arm: st.arm, department: st.dept }) : "—"}</dd></div>
          <div><dt className="text-xs text-muted">Session / term</dt><dd className="font-bold">{t.session} · {t.name}</dd></div>
          <div><dt className="text-xs text-muted">Average</dt><dd className="font-bold">{avg}</dd></div>
          <div><dt className="text-xs text-muted">Position</dt><dd className="font-bold">{position || "—"}</dd></div>
          {s.report.showAttendance && <div><dt className="text-xs text-muted">Attendance</dt><dd className="font-bold">{att?.total ? `${att.present + att.late}/${att.total} days` : "—"}</dd></div>}
          <div><dt className="text-xs text-muted">Class teacher</dt><dd className="font-bold">{st.class_teacher ?? "—"}</dd></div>
        </dl>

        <table className="tbl relative mt-4 text-sm">
          <thead><tr><th>Subject</th><th>Assignment (10)</th><th>CA (30)</th><th>Exam (60)</th><th>Total (100)</th><th>Grade</th><th>Remark</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted">No released results for this term yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}><td className="font-bold">{r.subject}</td><td>{r.assignment ?? "—"}</td><td>{r.ca ?? "—"}</td><td>{r.exam ?? "—"}</td>
                <td className="font-bold">{r.total}</td><td className="font-bold">{r.grade ?? gradeFor(Number(r.total)).grade}</td><td className="text-xs">{r.teacher_remark || r.remark}</td></tr>
            ))}
          </tbody>
        </table>

        <div className="relative mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-line p-3"><p className="text-xs font-bold uppercase text-muted">Class teacher&apos;s remark</p><p className="mt-1 min-h-10">{rem?.class_teacher || "—"}</p></div>
          <div className="rounded-xl border border-line p-3"><p className="text-xs font-bold uppercase text-muted">HOD&apos;s remark</p><p className="mt-1 min-h-10">{rem?.hod || "—"}</p></div>
          <div className="rounded-xl border border-line p-3"><p className="text-xs font-bold uppercase text-muted">Conduct / character</p><p className="mt-1 min-h-10">{rem?.conduct || "—"}</p></div>
          <div className="rounded-xl border border-line p-3"><p className="text-xs font-bold uppercase text-muted">Principal&apos;s remark</p><p className="mt-1 min-h-10">{principalRemark}</p></div>
        </div>

        <footer className="relative mt-8 grid grid-cols-3 items-end gap-6 text-center text-xs">
          <div><div className="border-b border-ink pb-8" />Class Teacher</div>
          <div className="grid place-items-center"><div className="grid h-20 w-20 place-items-center rounded-full border-2 border-dashed border-ink-2 text-[10px] font-bold uppercase text-muted">{s.report.stamp}</div></div>
          <div><div className="border-b border-ink pb-8" />Principal</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="col-span-3 flex items-center justify-between text-left"><span className="text-muted">Issued {new Date().toLocaleDateString("en-GB", { dateStyle: "long" })} · {s.brand.tagline}</span><img src={qr} alt="Report verification code" width={64} height={64} /></div>
        </footer>
      </article>

      {canRemark && (
        <div className="no-print card card-pad mt-5">
          <h2 className="text-lg">Remarks</h2>
          <ActionForm action={saveRemarks} submit="Save remarks" className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="student" value={id} /><input type="hidden" name="term" value={termId} />
            <TextArea label="Class teacher" name="classTeacher" defaultValue={rem?.class_teacher} rows={2} />
            <TextArea label="HOD" name="hod" defaultValue={rem?.hod} rows={2} />
            <TextArea label="Conduct / character" name="conduct" defaultValue={rem?.conduct} rows={2} />
            <TextArea label="Principal" name="principal" defaultValue={rem?.principal} rows={2} />
          </ActionForm>
        </div>
      )}
    </div>
  );
}
