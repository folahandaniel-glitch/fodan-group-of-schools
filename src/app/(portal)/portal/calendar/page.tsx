import { requireMe, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listTerms, ymd } from "@/lib/data";
import { Badge, Card, Empty, Field, PageHeader, Select } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { addEvent, deleteEvent, saveTerm } from "./actions";

export const metadata = { title: "Academic calendar" };
const KINDS = ["resumption", "mid-term", "ca-test", "mock", "exam", "holiday", "closing", "event", "staff"];

export default async function Calendar() {
  const me = await requireMe();
  if (!can(me, "calendar:view")) return <Empty title="Not permitted" />;
  const terms = await listTerms(me.schoolId);
  const full = await sql`SELECT t.id, t.name, t.starts_on, t.ends_on, t.is_current, a.name AS session FROM terms t JOIN academic_sessions a ON a.id = t.session_id WHERE t.school_id = ${me.schoolId} ORDER BY a.name DESC, t.name`;
  const events = await sql`SELECT e.id, e.kind, e.title, e.starts_on, e.ends_on, e.audience FROM calendar_events e WHERE e.school_id = ${me.schoolId}
                           AND e.audience IN ('all', ${me.role === "parent" ? "parents" : me.role === "student" ? "students" : "staff"}) ORDER BY e.starts_on`;
  const edit = can(me, "calendar:edit") || can(me, "calendar:create");
  const fmt = (d: unknown) => (d ? new Date(String(d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
  return (
    <>
      <PageHeader title="Academic calendar" sub="Sessions, terms, resumption, tests, examinations, holidays and events." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl">Terms</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {full.map((t) => (
              <li key={t.id} className="py-3">
                <p className="font-bold">{t.session} · {t.name} {t.is_current && <Badge tone="ok">Current</Badge>}</p>
                {edit ? (
                  <ActionForm action={saveTerm} submit="Update" small className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                    <input type="hidden" name="id" value={t.id} />
                    <Field label="Starts" name="starts" type="date" defaultValue={ymd(t.starts_on)} />
                    <Field label="Ends" name="ends" type="date" defaultValue={ymd(t.ends_on)} />
                    <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="current" defaultChecked={t.is_current} /> Current</label>
                  </ActionForm>
                ) : <p className="text-muted">{fmt(t.starts_on)} – {fmt(t.ends_on)}</p>}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="text-xl">Dates &amp; events</h2>
          {events.length === 0 ? <p className="mt-2 text-sm text-muted">No events yet.</p> : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 py-2">
                  <span><b>{e.title}</b><br /><span className="text-xs text-muted">{fmt(e.starts_on)}{e.ends_on ? ` – ${fmt(e.ends_on)}` : ""}</span></span>
                  <span className="flex items-center gap-2"><Badge tone="info">{e.kind}</Badge>
                    {edit && <form action={deleteEvent}><input type="hidden" name="id" value={e.id} /><button className="btn btn-danger btn-sm" aria-label="Delete event">×</button></form>}</span>
                </li>
              ))}
            </ul>
          )}
          {edit && (
            <div className="mt-4 border-t border-line pt-4">
              <ActionForm action={addEvent} submit="Add date" className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Field label="Title" name="title" required /></div>
                <Select label="Type" name="kind" allowEmpty={false} options={KINDS.map((k) => ({ value: k, label: k }))} />
                <Select label="Audience" name="audience" allowEmpty={false} defaultValue="all" options={[{ value: "all", label: "Everyone" }, { value: "students", label: "Students" }, { value: "parents", label: "Parents" }, { value: "staff", label: "Staff" }]} />
                <Field label="Starts" name="starts" type="date" required />
                <Field label="Ends" name="ends" type="date" />
                <Select label="Term" name="termId" options={terms.map((t) => ({ value: t.id, label: `${t.session} · ${t.name}` }))} />
              </ActionForm>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
