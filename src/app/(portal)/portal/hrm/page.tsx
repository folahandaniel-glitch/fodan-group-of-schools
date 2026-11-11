import Link from "next/link";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { getSetting } from "@/lib/settings";
import { ACTIONS, ACTION_LABEL, CASE_STATUS } from "@/lib/hrm";
import { Badge, Card, Empty, Field, PageHeader, TextArea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { archiveCourse, assignTraining, completeTraining, decideCase, deleteHoliday, deleteRule, raiseCase, respondCase, saveCourse, saveHoliday, saveRule } from "./actions";

export const metadata = { title: "HRM" };
export const dynamic = "force-dynamic";

const naira = (n: number | string) => `₦${Number(n).toLocaleString("en-NG")}`;
const day = (d: unknown) => new Date(d as string).toLocaleDateString("en-GB");
type Row = Record<string, any>;

export default async function Hrm({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  const sp = await searchParams;
  const manage = can(me, "hrm:manage");
  const review = manage || can(me, "hrm:review");
  const tabs: [string, string][] = [["rules", "Rules & fines"], ["mine", "My record"], ...(review ? [["cases", "Cases"] as [string, string]] : []), ["training", "Training"], ["holidays", "Holidays"]];
  const tab = tabs.find((t) => t[0] === str(sp.tab))?.[0] ?? "rules";
  const S = me.schoolId;

  const staff: Row[] = manage ? await sql`SELECT id, first_name, last_name FROM users WHERE school_id = ${S} AND status = 'active' AND role NOT IN ('student','parent','developer') ORDER BY last_name, first_name LIMIT 400` : [];
  const rules: Row[] = await sql`SELECT * FROM hr_rules WHERE school_id = ${S} ${manage ? sql`` : sql`AND active`} ORDER BY sort, title`;
  const staffOpts = staff.map((s) => <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>);

  let body: React.ReactNode = null;

  if (tab === "rules") {
    const f = await getSetting<{ workStart: string; graceMinutes: number; perMinute: number; lateFlat: number; absentFine: number; enabled: boolean }>("fines");
    const mine: Row[] = await sql`SELECT day, reason, amount, status FROM fines WHERE user_id = ${me.id} ORDER BY day DESC LIMIT 20`;
    const owed = mine.filter((x) => !["waived", "paid"].includes(x.status)).reduce((a, x) => a + Number(x.amount), 0);
    body = (
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <h2 className="text-xl">Standard rules</h2>
          <p className="mt-1 text-sm text-muted">These apply to every staff member. {manage ? "You can edit, add or switch off any rule." : "Only HR can change them."}</p>
          {rules.length === 0 ? <div className="mt-3"><Empty title="No rules yet" /></div> : (
            <ul className="mt-3 divide-y divide-line">
              {rules.map((r) => (
                <li key={r.id} className="py-3">
                  <p className="font-bold">{r.title} <span className="text-xs font-semibold text-muted">{r.code} · {r.category}</span> {Number(r.fine_amount) > 0 && <Badge tone="warn">Fine {naira(r.fine_amount)}</Badge>} {!r.active && <Badge tone="bad">off</Badge>}</p>
                  <p className="text-sm text-muted">{r.description}</p>
                  {r.escalate_after > 0 && r.escalate_to && <p className="text-xs text-muted">From offence {r.escalate_after} within {r.escalate_days} days: {ACTION_LABEL[r.escalate_to]}.</p>}
                  {manage && (
                    <details className="mt-2"><summary className="cursor-pointer text-sm font-bold text-royal">Edit</summary>
                      <RuleForm r={r} />
                      <form action={deleteRule} className="mt-2"><input type="hidden" name="id" value={r.id} /><button className="btn btn-danger btn-sm">Delete rule</button></form>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
          {manage && <details open className="mt-4 border-t border-line pt-4"><summary className="cursor-pointer font-display text-lg">＋ Add a new rule</summary><RuleForm /></details>}
        </Card>
        <div className="space-y-5">
          <Card>
            <h2 className="text-xl">Clock-in rules</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Resumption</dt><dd className="font-bold">{f.workStart}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Grace</dt><dd className="font-bold">{f.graceMinutes} min</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Late fine</dt><dd className="font-bold">{naira(f.lateFlat)}{f.perMinute > 0 ? ` + ${naira(f.perMinute)}/min` : ""}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Absence fine</dt><dd className="font-bold">{naira(f.absentFine)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Applied automatically</dt><dd className="font-bold">{f.enabled ? "Yes" : "No"}</dd></div>
            </dl>
            {can(me, "fines:manage") && <Link href="/portal/branches" className="mt-3 inline-block text-sm font-bold text-royal">Change these in Branches &amp; fines →</Link>}
          </Card>
          <Card>
            <h2 className="text-xl">My fines</h2>
            <p className="mt-1 text-sm text-muted">Outstanding: <strong>{naira(owed)}</strong></p>
            {mine.length === 0 ? <p className="mt-2 text-sm text-muted">No fines recorded.</p> : (
              <ul className="mt-2 divide-y divide-line text-sm">{mine.map((x, i) => <li key={i} className="flex justify-between gap-2 py-2"><span>{day(x.day)} · {x.reason}</span><span className="font-bold">{naira(x.amount)} <span className="text-xs text-muted">{x.status}</span></span></li>)}</ul>
            )}
          </Card>
        </div>
      </div>
    );
  } else if (tab === "mine") {
    const cases: Row[] = await sql`SELECT * FROM hr_cases WHERE school_id = ${S} AND user_id = ${me.id} ORDER BY created_at DESC LIMIT 30`;
    const tr: Row[] = await sql`SELECT t.*, c.name FROM hr_training t JOIN hr_courses c ON c.id = t.course_id WHERE t.user_id = ${me.id} ORDER BY t.status, t.due_on NULLS LAST LIMIT 30`;
    body = (
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><h2 className="text-xl">HR matters about me</h2>
          {cases.length === 0 ? <p className="mt-2 text-sm text-muted">Nothing on your file.</p> : (
            <ul className="mt-3 space-y-4">{cases.map((c) => (
              <li key={c.id} className="rounded-xl border border-line p-3 text-sm">
                <p className="font-bold">{c.number} · {c.title} <Badge tone={c.status === "decided" ? "ok" : "warn"}>{CASE_STATUS[c.status]}</Badge></p>
                <p className="text-xs text-muted">{ACTION_LABEL[c.kind]} · incident {day(c.incident_on)}{Number(c.fine_amount) > 0 ? ` · fine ${naira(c.fine_amount)}` : ""}</p>
                <p className="mt-2 whitespace-pre-wrap">{c.facts}</p>
                {c.response && <p className="mt-2 rounded-lg bg-paper-2 p-2"><strong>Your response:</strong> {c.response}</p>}
                {c.decision && <p className="mt-2 rounded-lg bg-paper-2 p-2"><strong>Decision:</strong> {c.decision}</p>}
                {c.status === "open" && (
                  <ActionForm action={respondCase} submit="Send my response" small className="mt-3 grid gap-2"><input type="hidden" name="id" value={c.id} /><TextArea label="Your response" name="response" rows={3} required /></ActionForm>
                )}
              </li>))}</ul>)}
        </Card>
        <Card><h2 className="text-xl">My training</h2>
          {tr.length === 0 ? <p className="mt-2 text-sm text-muted">No training assigned.</p> : (
            <ul className="mt-3 divide-y divide-line text-sm">{tr.map((t) => (
              <li key={t.id} className="flex justify-between gap-2 py-2"><span className="font-semibold">{t.name}</span>
                <span>{t.status === "completed" ? <Badge tone="ok">Done {day(t.completed_on)}{t.expires_on ? ` · valid to ${day(t.expires_on)}` : ""}</Badge> : <Badge tone="warn">Due {t.due_on ? day(t.due_on) : "any time"}</Badge>}</span></li>))}</ul>)}
        </Card>
      </div>
    );
  } else if (tab === "cases" && review) {
    const cases: Row[] = await sql`SELECT c.*, u.first_name, u.last_name FROM hr_cases c JOIN users u ON u.id = c.user_id WHERE c.school_id = ${S} ORDER BY c.created_at DESC LIMIT 60`;
    body = (
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card><h2 className="text-xl">Cases</h2>
          {cases.length === 0 ? <div className="mt-3"><Empty title="No cases raised" /></div> : (
            <ul className="mt-3 space-y-3">{cases.map((c) => (
              <li key={c.id} className="rounded-xl border border-line p-3 text-sm">
                <p className="font-bold">{c.number} · {c.first_name} {c.last_name} <Badge tone={c.status === "decided" ? "ok" : "warn"}>{CASE_STATUS[c.status]}</Badge></p>
                <p className="text-xs text-muted">{c.title} · {ACTION_LABEL[c.kind]} · {day(c.incident_on)}{Number(c.fine_amount) > 0 ? ` · fine ${naira(c.fine_amount)}` : ""}</p>
                <p className="mt-1 whitespace-pre-wrap">{c.facts}</p>
                {c.response && <p className="mt-2 rounded-lg bg-paper-2 p-2"><strong>Response:</strong> {c.response}</p>}
                {c.decision && <p className="mt-2 rounded-lg bg-paper-2 p-2"><strong>Decision:</strong> {c.decision}</p>}
                {manage && c.status !== "decided" && (
                  <details className="mt-2"><summary className="cursor-pointer font-bold text-royal">Decide</summary>
                    <ActionForm action={decideCase} submit="Record decision" small className="mt-2 grid gap-2 sm:grid-cols-2">
                      <input type="hidden" name="id" value={c.id} />
                      <div className="field"><label>Outcome</label><select name="outcome" className="select"><option value="confirm">Confirm</option><option value="dismiss">Dismiss</option></select></div>
                      <Field label="Fine (₦, 0 for none)" name="fine" type="number" defaultValue={Number(c.fine_amount)} />
                      <div className="sm:col-span-2"><TextArea label="Decision note" name="note" rows={2} /></div>
                      {c.status === "open" && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="waive" /> Decide without waiting for a response</label>}
                    </ActionForm></details>)}
              </li>))}</ul>)}
        </Card>
        {manage && (
          <Card><h2 className="text-xl">Raise a case</h2>
            <p className="mt-1 text-sm text-muted">Pick a rule and its fine and escalation apply automatically. The staff member is notified and can respond before you decide.</p>
            <ActionForm action={raiseCase} submit="Raise case" className="mt-3 grid gap-3">
              <div className="field"><label htmlFor="user">Staff member</label><select id="user" name="user" className="select" required><option value="">— Select —</option>{staffOpts}</select></div>
              <div className="field"><label htmlFor="rule">Rule</label><select id="rule" name="rule" className="select"><option value="">— None (describe below) —</option>{rules.filter((r) => r.active).map((r) => <option key={r.id} value={r.id}>{r.title}{Number(r.fine_amount) > 0 ? ` · ${naira(r.fine_amount)}` : ""}</option>)}</select></div>
              <div className="field"><label htmlFor="kind">Action (the rule's default is used if you leave it)</label><select id="kind" name="kind" className="select"><option value="">— Rule default —</option>{ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}</select></div>
              <Field label="Title" name="title" />
              <Field label="Date of incident" name="incident" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              <Field label="Fine (₦, leave blank for the rule's amount)" name="fine" type="number" />
              <TextArea label="What happened" name="facts" rows={4} required />
            </ActionForm></Card>
        )}
      </div>
    );
  } else if (tab === "training") {
    const courses: Row[] = await sql`SELECT * FROM hr_courses WHERE school_id = ${S} AND NOT archived ORDER BY mandatory DESC, name`;
    const rec: Row[] = manage ? await sql`SELECT t.*, c.name, u.first_name, u.last_name FROM hr_training t JOIN hr_courses c ON c.id = t.course_id JOIN users u ON u.id = t.user_id
                                          WHERE t.school_id = ${S} ORDER BY (t.status = 'assigned') DESC, t.due_on NULLS LAST LIMIT 80` : [];
    body = (
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><h2 className="text-xl">Courses</h2>
          <ul className="mt-3 divide-y divide-line text-sm">{courses.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-2 py-2"><span><span className="font-bold">{c.name}</span> {c.mandatory && <Badge tone="warn">mandatory</Badge>}<br /><span className="text-muted">{c.description}{c.valid_months ? ` Valid ${c.valid_months} months.` : ""}</span></span>
              {manage && <form action={archiveCourse}><input type="hidden" name="id" value={c.id} /><button className="btn btn-ghost btn-sm">Archive</button></form>}</li>))}</ul>
          {manage && <details className="mt-4 border-t border-line pt-4"><summary className="cursor-pointer font-display text-lg">Add a course</summary>
            <ActionForm action={saveCourse} submit="Add course" className="mt-3 grid gap-3"><Field label="Name" name="name" required /><Field label="Description" name="description" /><Field label="Valid for (months, blank = never expires)" name="months" type="number" />
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="mandatory" /> Mandatory for all staff</label></ActionForm></details>}
        </Card>
        {manage && (
          <Card><h2 className="text-xl">Assign training</h2>
            <ActionForm action={assignTraining} submit="Assign" className="mt-3 grid gap-3">
              <div className="field"><label htmlFor="course">Course</label><select id="course" name="course" className="select" required><option value="">— Select —</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <Field label="Due date" name="due" type="date" />
              <div className="field"><label htmlFor="users">People (hold Ctrl or ⌘ to choose several)</label><select id="users" name="users" multiple size={8} className="select !h-auto" required>{staffOpts}</select></div>
            </ActionForm>
            <h3 className="mt-5 text-lg">Records</h3>
            <ul className="mt-2 divide-y divide-line text-sm">{rec.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2"><span>{t.first_name} {t.last_name} · {t.name}<br /><span className="text-xs text-muted">{t.status === "completed" ? `Done ${day(t.completed_on)}${t.expires_on ? `, valid to ${day(t.expires_on)}` : ""}` : `Due ${t.due_on ? day(t.due_on) : "any time"}`}</span></span>
                {t.status === "assigned" && <form action={completeTraining}><input type="hidden" name="id" value={t.id} /><button className="btn btn-ghost btn-sm">Mark done</button></form>}</li>))}</ul>
          </Card>
        )}
      </div>
    );
  } else {
    const hol: Row[] = await sql`SELECT to_char(day, 'YYYY-MM-DD') AS d, name FROM hr_holidays WHERE school_id = ${S} AND day >= current_date - 30 ORDER BY day LIMIT 60`;
    body = (
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><h2 className="text-xl">Public holidays</h2>
          {hol.length === 0 ? <p className="mt-2 text-sm text-muted">None listed.</p> : (
            <ul className="mt-3 divide-y divide-line text-sm">{hol.map((h) => (
              <li key={h.d} className="flex items-center justify-between py-2"><span><strong>{day(h.d)}</strong> · {h.name}</span>
                {manage && <form action={deleteHoliday}><input type="hidden" name="day" value={h.d} /><button className="btn btn-ghost btn-sm">Remove</button></form>}</li>))}</ul>)}
        </Card>
        {manage && <Card><h2 className="text-xl">Add a holiday</h2><ActionForm action={saveHoliday} submit="Save holiday" className="mt-3 grid gap-3"><Field label="Date" name="day" type="date" required /><Field label="Name" name="name" required /></ActionForm></Card>}
      </div>
    );
  }

  return (
    <>
      <PageHeader title="HRM" sub="Staff rules, fines, HR cases, training and public holidays in one place." />
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="HRM sections">{tabs.map(([k, l]) => <Link key={k} href={`/portal/hrm?tab=${k}`} className={`badge text-sm ${tab === k ? "badge-info" : ""}`}>{l}</Link>)}</nav>
      {body}
    </>
  );
}

function RuleForm({ r }: { r?: Row }) {
  return (
    <ActionForm action={saveRule} submit={r ? "Save rule" : "Add rule"} small className="mt-3 grid gap-3 sm:grid-cols-2">
      {r && <input type="hidden" name="id" value={r.id} />}
      <Field label="Code" name="code" defaultValue={r?.code} required hint="Letters and numbers, e.g. LATE" /><Field label="Title" name="title" defaultValue={r?.title} required />
      <Field label="Category" name="category" defaultValue={r?.category ?? "Conduct"} /><Field label="Fine (₦, 0 for none)" name="fine" type="number" defaultValue={r ? Number(r.fine_amount) : 0} />
      <div className="field"><label>Default action</label><select name="action" className="select" defaultValue={r?.default_action ?? "query"}>{ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}</select></div>
      <div className="field"><label>Escalate to</label><select name="escalateTo" className="select" defaultValue={r?.escalate_to ?? ""}><option value="">— No escalation —</option>{ACTIONS.filter((a) => a !== "commendation").map((a) => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}</select></div>
      <Field label="Escalate from offence number (0 = never)" name="after" type="number" defaultValue={r?.escalate_after ?? 0} /><Field label="…within this many days" name="days" type="number" defaultValue={r?.escalate_days ?? 90} />
      <div className="sm:col-span-2"><TextArea label="Rule" name="description" rows={2} defaultValue={r?.description} /></div>
      <div className="sm:col-span-2"><TextArea label="Guidance for HR" name="guidance" rows={2} defaultValue={r?.guidance} /></div>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={r?.active ?? true} /> Rule is active</label>
    </ActionForm>
  );
}
