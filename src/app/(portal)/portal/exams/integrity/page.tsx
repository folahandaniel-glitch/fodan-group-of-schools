import Link from "next/link";
import { redirect } from "next/navigation";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Badge, Card, Empty, PageHeader, Stat } from "@/components/ui";
import { grantExamForm, revokeGrant } from "../actions";

export const metadata = { title: "Exam integrity" };
export const dynamic = "force-dynamic";
type Row = Record<string, any>;
const when = (d: unknown) => (d ? new Date(d as string).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Lagos" }) : "-");

export default async function Integrity() {
  const me = await requireMe();
  if (!can(me, "exams:manage")) redirect("/forbidden");
  const S = me.schoolId;
  const flagged: Row[] = await sql`SELECT t.id, t.violations, t.end_reason, t.submitted_at, t.score, t.max_score, a.id AS aid, a.title, a.kind, s.id AS sid, s.first_name, s.last_name, s.admission_no, c.name AS cname, c.arm
    FROM attempts t JOIN assessments a ON a.id = t.assessment_id JOIN students s ON s.id = t.student_id LEFT JOIN classes c ON c.id = s.class_id
    WHERE a.school_id = ${S} AND (t.flagged OR t.violations > 0) AND t.started_at > now() - interval '90 days' ORDER BY t.started_at DESC LIMIT 100`;
  const missed: Row[] = await sql`SELECT a.id AS aid, a.title, a.kind, s.id AS sid, s.first_name, s.last_name, s.admission_no, c.name AS cname, c.arm, a.due_at
    FROM assessments a JOIN students s ON s.class_id = a.class_id AND s.status IN ('active','enrolled') JOIN classes c ON c.id = s.class_id
    WHERE a.school_id = ${S} AND a.kind IN ('ca','exam') AND a.status IN ('published','closed') AND a.due_at < now() AND a.due_at > now() - interval '60 days'
      AND NOT EXISTS (SELECT 1 FROM attempts t WHERE t.assessment_id = a.id AND t.student_id = s.id)
      AND NOT EXISTS (SELECT 1 FROM exam_grants g WHERE g.assessment_id = a.id AND g.student_id = s.id)
    ORDER BY a.due_at DESC, c.name, s.last_name LIMIT 200`;
  const grants: Row[] = await sql`SELECT g.id, g.kind, g.reason, g.window_until, g.used, a.title, s.first_name, s.last_name FROM exam_grants g JOIN assessments a ON a.id = g.assessment_id JOIN students s ON s.id = g.student_id
    WHERE g.school_id = ${S} ORDER BY g.created_at DESC LIMIT 50`;
  const mocks: Row[] = await sql`SELECT id, title FROM assessments WHERE school_id = ${S} AND kind = 'mock' AND status IN ('published','draft') ORDER BY created_at DESC LIMIT 40`;

  const Grant = ({ aid, sid }: { aid: string; sid: string }) => (
    <div className="flex flex-wrap items-center gap-2">
      <form action={grantExamForm} className="flex items-center gap-1"><input type="hidden" name="student" value={sid} /><input type="hidden" name="assessment" value={aid} /><input type="hidden" name="kind" value="retake" />
        <input name="days" type="number" defaultValue={3} min={1} className="input !w-14 !min-h-8 !py-0" aria-label="Days allowed" /><button className="btn btn-gold btn-sm">Allow retake</button></form>
      {mocks.length > 0 && <form action={grantExamForm} className="flex items-center gap-1"><input type="hidden" name="student" value={sid} /><input type="hidden" name="kind" value="makeup" /><input type="hidden" name="days" value="7" />
        <select name="assessment" className="select !w-40 !min-h-8 !py-0" aria-label="Mock exam" required><option value="">Mock…</option>{mocks.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select><button className="btn btn-ghost btn-sm">Assign mock</button></form>}
    </div>
  );

  return (
    <>
      <PageHeader title="Exam integrity and make-ups" sub="Students who left full screen, students who missed an exam, and the retakes and make-up mock exams you have allowed." actions={<Link href="/portal/exams" className="btn btn-ghost">← Exam timetable</Link>} />
      <section className="mb-5 grid grid-cols-3 gap-3"><Stat label="Flagged attempts" value={flagged.length} /><Stat label="Missed exams" value={missed.length} tone="royal" /><Stat label="Open permissions" value={grants.filter((g) => !g.used).length} /></section>

      <Card className="mb-5"><h2 className="text-xl">Flagged for leaving full screen</h2>
        {flagged.length === 0 ? <div className="mt-3"><Empty title="Nobody flagged" /></div> : (
          <div className="mt-3 overflow-x-auto"><table className="tbl min-w-[48rem] text-sm"><thead><tr><th>Student</th><th>Exam</th><th>Exits</th><th>Result</th><th>Allow</th></tr></thead>
            <tbody>{flagged.map((r) => (
              <tr key={r.id}><td className="font-bold">{r.last_name}, {r.first_name}<br /><span className="text-xs font-normal text-muted">{r.admission_no} · {r.cname}{r.arm}</span></td>
                <td>{r.title}<br /><span className="text-xs text-muted">{when(r.submitted_at)}</span></td><td><Badge tone={r.end_reason === "violation" ? "bad" : "warn"}>{r.violations}{r.end_reason === "violation" ? " · auto-submitted" : ""}</Badge></td>
                <td>{r.score !== null ? `${r.score}/${r.max_score}` : "-"}</td><td><Grant aid={r.aid} sid={r.sid} /></td></tr>))}</tbody></table></div>)}
      </Card>

      <Card className="mb-5"><h2 className="text-xl">Missed a CA test or exam</h2>
        {missed.length === 0 ? <div className="mt-3"><Empty title="Nobody has missed an exam" /></div> : (
          <div className="mt-3 overflow-x-auto"><table className="tbl min-w-[48rem] text-sm"><thead><tr><th>Student</th><th>Exam</th><th>Allow</th></tr></thead>
            <tbody>{missed.map((r) => (
              <tr key={r.aid + r.sid}><td className="font-bold">{r.last_name}, {r.first_name}<br /><span className="text-xs font-normal text-muted">{r.admission_no} · {r.cname}{r.arm}</span></td><td>{r.title}<br /><span className="text-xs text-muted">closed {when(r.due_at)}</span></td><td><Grant aid={r.aid} sid={r.sid} /></td></tr>))}</tbody></table></div>)}
      </Card>

      <Card><h2 className="text-xl">Permissions given</h2>
        {grants.length === 0 ? <p className="mt-2 text-sm text-muted">None yet.</p> : (
          <ul className="mt-2 divide-y divide-line text-sm">{grants.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><b>{g.last_name}, {g.first_name}</b> · {g.title} · {g.kind === "makeup" ? "make-up mock" : "retake"} · until {when(g.window_until)}</span>
              <span className="flex items-center gap-2"><Badge tone={g.used ? "ok" : "warn"}>{g.used ? "used" : "open"}</Badge>{!g.used && <form action={revokeGrant}><input type="hidden" name="id" value={g.id} /><button className="btn btn-ghost btn-sm">Withdraw</button></form>}</span></li>))}</ul>)}
      </Card>
    </>
  );
}
