import { redirect } from "next/navigation";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Badge, Card, Empty, Field, PageHeader, Stat, TextArea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { RECRUIT_STAGES, STAGE_NAME } from "@/lib/logic/hr";
import { HrNav } from "../hr-nav";
import { addCandidate, closeVacancy, moveCandidate, saveVacancy } from "../actions2";

export const metadata = { title: "Recruitment" };
export const dynamic = "force-dynamic";
type Row = Record<string, any>;
const KIND: Record<string, string> = { full_time: "Full time", part_time: "Part time", contract: "Contract", internship: "Internship" };

export default async function Recruitment() {
  const me = await requireMe();
  if (!(can(me, "hrm:manage") || can(me, "hrm:review"))) redirect("/portal/hrm");
  const S = me.schoolId;
  const vacs: Row[] = await sql`SELECT v.*, (SELECT count(*)::int FROM hr_candidates c WHERE c.vacancy_id = v.id) AS applicants FROM hr_vacancies v WHERE v.school_id = ${S} ORDER BY (v.status = 'open') DESC, v.created_at DESC LIMIT 50`;
  const cands: Row[] = await sql`SELECT c.*, v.title AS vacancy FROM hr_candidates c JOIN hr_vacancies v ON v.id = c.vacancy_id WHERE c.school_id = ${S} AND v.status = 'open' ORDER BY c.created_at DESC LIMIT 300`;
  const open = vacs.filter((v) => v.status === "open");
  return (
    <>
      <PageHeader title="Recruitment" sub="Open a vacancy, add candidates and move them from application to hire." />
      <HrNav current="/portal/hrm/recruitment" />
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Open vacancies" value={open.length} /><Stat label="Active candidates" value={cands.filter((c) => !["hired", "rejected"].includes(c.stage)).length} tone="royal" />
        <Stat label="In interview" value={cands.filter((c) => c.stage === "interview").length} /><Stat label="Hired" value={cands.filter((c) => c.stage === "hired").length} tone="royal" /></section>

      <section aria-label="Candidate pipeline" className="-mx-4 mb-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="grid min-w-[60rem] grid-cols-6 gap-3">{RECRUIT_STAGES.map((s) => { const list = cands.filter((c) => c.stage === s); return (
          <div key={s} className="rounded-2xl bg-paper-2 p-2"><div className="mb-2 flex justify-between px-1"><h3 className="text-sm font-bold">{STAGE_NAME[s]}</h3><span className="text-xs text-muted">{list.length}</span></div>
            <ul className="space-y-2">{list.map((c) => (
              <li key={c.id} className="card !p-3 text-sm"><p className="font-bold">{c.name}</p><p className="text-xs text-muted">{c.vacancy}</p>{c.phone && <p className="text-xs">{c.phone}</p>}
                {!["hired", "rejected"].includes(s) && <form action={moveCandidate} className="mt-2 flex gap-1"><input type="hidden" name="id" value={c.id} /><button name="op" value="next" className="btn btn-ghost btn-sm">Move on →</button><button name="op" value="reject" className="btn btn-danger btn-sm">Reject</button></form>}</li>))}</ul>
            {list.length === 0 && <p className="px-1 py-3 text-xs text-muted">Empty</p>}</div>); })}</div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card><h2 className="text-xl">Vacancies</h2>
          {vacs.length === 0 ? <div className="mt-3"><Empty title="No vacancies yet" /></div> : (
            <ul className="mt-3 divide-y divide-line text-sm">{vacs.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><b>{v.title}</b> · {KIND[v.kind]} · {v.openings} opening{v.openings === 1 ? "" : "s"} · {v.applicants} applicant{v.applicants === 1 ? "" : "s"}
                {v.closes_on && <span className="text-xs text-muted"> · closes {new Date(v.closes_on).toLocaleDateString("en-GB")}</span>}</span>
                <form action={closeVacancy} className="flex items-center gap-2"><Badge tone={v.status === "open" ? "ok" : undefined}>{v.status}</Badge><input type="hidden" name="id" value={v.id} /><button className="btn btn-ghost btn-sm">{v.status === "open" ? "Close" : "Reopen"}</button></form></li>))}</ul>)}
          <h3 className="mt-5 text-lg">Open a vacancy</h3>
          <ActionForm action={saveVacancy} submit="Open vacancy" small className="mt-2 grid gap-3 sm:grid-cols-2"><Field label="Job title" name="title" required /><Field label="Department" name="department" />
            <div className="field"><label htmlFor="vk">Type</label><select id="vk" name="kind" className="select">{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <Field label="Openings" name="openings" type="number" defaultValue="1" /><Field label="Closing date" name="closes" type="date" /><div className="sm:col-span-2"><TextArea label="Description" name="description" rows={2} /></div></ActionForm></Card>
        <Card><h2 className="text-xl">Add a candidate</h2>
          <ActionForm action={addCandidate} submit="Add candidate" className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="field sm:col-span-2"><label htmlFor="cv">Vacancy</label><select id="cv" name="vacancy" className="select" required><option value="">Choose…</option>{open.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}</select></div>
            <Field label="Name" name="name" required /><Field label="Phone" name="phone" type="tel" /><div className="sm:col-span-2"><Field label="Email" name="email" type="email" /></div><div className="sm:col-span-2"><TextArea label="Notes" name="notes" rows={2} /></div>
          </ActionForm></Card>
      </div>
    </>
  );
}
