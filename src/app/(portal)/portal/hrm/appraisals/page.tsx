import { redirect } from "next/navigation";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Badge, Card, Empty, Field, PageHeader, TextArea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { CRITERIA, RATING_LABEL, ratingWord } from "@/lib/logic/hr";
import { HrNav } from "../hr-nav";
import { acknowledgeAppraisal, saveAppraisal } from "../actions2";

export const metadata = { title: "Appraisals" };
export const dynamic = "force-dynamic";
type Row = Record<string, any>;

export default async function Appraisals() {
  const me = await requireMe();
  if (["student", "parent"].includes(me.role)) redirect("/portal");
  const hr = can(me, "hrm:manage") || can(me, "hrm:review"), S = me.schoolId;
  const rows: Row[] = await sql`SELECT a.id, a.user_id, a.period, a.scores, a.overall, a.strengths, a.improvements, a.goals, a.staff_comment, a.acknowledged_at, a.created_at,
      u.first_name || ' ' || u.last_name AS who, r.first_name || ' ' || r.last_name AS appraiser
    FROM hr_appraisals a JOIN users u ON u.id = a.user_id LEFT JOIN users r ON r.id = a.appraiser_id
    WHERE a.school_id = ${S} ${hr ? sql`` : sql`AND a.user_id = ${me.id}`} ORDER BY a.created_at DESC LIMIT 100`;
  const staff: Row[] = hr ? await sql`SELECT id, first_name, last_name FROM users WHERE school_id = ${S} AND status = 'active' AND role NOT IN ('student','parent','developer') AND id <> ${me.id} ORDER BY last_name, first_name LIMIT 400` : [];
  const yr = new Date().getFullYear();

  return (
    <>
      <PageHeader title="Performance appraisals" sub={hr ? "Rate staff against clear criteria, set goals, and let each person read and respond." : "Your appraisals and goals."} />
      <HrNav current="/portal/hrm/appraisals" />
      {hr && (
        <Card className="mb-5"><h2 className="text-xl">New appraisal</h2>
          <ActionForm action={saveAppraisal} submit="Save appraisal" className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="field"><label htmlFor="au">Staff member</label><select id="au" name="user" className="select" required><option value="">Choose…</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}</select></div>
            <Field label="Review period" name="period" required defaultValue={`${yr} Term 1`} />
            {CRITERIA.map((c) => <div key={c.key} className="field"><label htmlFor={c.key}>{c.label}</label><select id={c.key} name={c.key} className="select" defaultValue="3">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} · {RATING_LABEL[n]}</option>)}</select></div>)}
            <div className="sm:col-span-2"><TextArea label="Strengths" name="strengths" rows={2} /></div>
            <div className="sm:col-span-2"><TextArea label="Areas to improve" name="improvements" rows={2} /></div>
            <div className="sm:col-span-2"><TextArea label="Goals for the next period" name="goals" rows={2} /></div>
          </ActionForm></Card>
      )}
      {rows.length === 0 ? <Empty title="No appraisals yet" /> : (
        <div className="grid gap-4">{rows.map((a) => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-lg font-bold">{a.who} · {a.period}</p><p className="text-xs text-muted">By {a.appraiser ?? "-"} on {new Date(a.created_at).toLocaleDateString("en-GB")}</p></div>
              <Badge tone={a.overall >= 4 ? "ok" : a.overall >= 3 ? "info" : "warn"}>{Number(a.overall).toFixed(1)} · {ratingWord(Number(a.overall))}</Badge></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{CRITERIA.filter((c) => a.scores[c.key]).map((c) => (
              <div key={c.key} className="text-sm"><div className="flex justify-between"><span>{c.label}</span><b>{a.scores[c.key]}/5</b></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-paper-2"><div className="h-full bg-strong" style={{ width: `${(a.scores[c.key] / 5) * 100}%` }} /></div></div>))}</div>
            {[["Strengths", a.strengths], ["Areas to improve", a.improvements], ["Goals", a.goals]].filter(([, v]) => v).map(([k, v]) => <p key={k as string} className="mt-3 text-sm"><b>{k}:</b> {v}</p>)}
            {a.user_id === me.id && !a.acknowledged_at && (
              <form action={acknowledgeAppraisal} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="id" value={a.id} /><input name="comment" className="input !w-72" placeholder="Your comment (optional)" aria-label="Your comment" /><button className="btn btn-gold btn-sm">I have read this</button></form>)}
            {a.acknowledged_at && <p className="mt-3 text-xs text-muted">Read by staff on {new Date(a.acknowledged_at).toLocaleDateString("en-GB")}{a.staff_comment ? `. Comment: ${a.staff_comment}` : ""}</p>}
          </Card>))}</div>)}
    </>
  );
}
