import { can, requireMe } from "@/lib/auth";
import { listClasses } from "@/lib/data";
import { sql } from "@/lib/db";
import { teacherClassIds, wideScope } from "@/lib/scope";
import { isRoot } from "@/lib/logic/permissions";
import { Card, Empty, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";

export const metadata = { title: "Downloads" };
export const dynamic = "force-dynamic";

type Filter = "class" | "term" | "range" | "month" | "status";
type Item = { slug: string; title: string; blurb: string; filters: Filter[]; show: boolean; classRequired?: boolean };

export default async function Exports() {
  const me = await requireMe();
  if (me.role === "student" || me.role === "parent") redirect("/forbidden");
  const root = isRoot(me.role);
  const hr = root || can(me, "hrm:manage") || can(me, "attendance:manage") || can(me, "clock:manage");
  const wide = wideScope(me);
  const mine = wide ? null : await teacherClassIds(me.id);
  const classes = (await listClasses(me.schoolId)).filter((c) => !mine || mine.includes(c.id));
  const terms = await sql`SELECT t.id, t.name, s.name AS session FROM terms t JOIN academic_sessions s ON s.id = t.session_id WHERE t.school_id = ${me.schoolId} ORDER BY s.name DESC, t.name`;

  const items = ([
    { slug: "students", title: "Student records", blurb: "Admission numbers, class, guardian contacts.", filters: ["class", "status"], show: root || can(me, "students:export") },
    { slug: "access-codes", title: "Student access codes", blurb: "Codes students and parents use to register. Handle with care.", filters: ["class"], show: root || can(me, "access_codes:manage") },
    { slug: "student-attendance", title: "Student attendance", blurb: "Daily attendance for a class and date range.", filters: ["class", "range"], show: root || can(me, "attendance:export") || can(me, "attendance:view") },
    { slug: "results", title: "Results", blurb: "Scores, grades and remarks for a class and term.", filters: ["class", "term"], classRequired: true, show: root || can(me, "results:export") || can(me, "reports:export") },
    { slug: "timetable", title: "Timetable", blurb: "Every period, subject and teacher for a class.", filters: ["class"], show: can(me, "timetable:view") || can(me, "timetable:edit") },
    { slug: "period-registers", title: "Subject periods taught", blurb: hr ? "Which teachers registered the periods they were timetabled for." : "The periods you registered.", filters: ["range"], show: hr || can(me, "timetable:view") },
    { slug: "staff-attendance", title: "Staff attendance", blurb: "Clock-in and out times, lateness and the daily staff register.", filters: ["range"], show: hr },
    { slug: "staff", title: "Staff list", blurb: "Positions, departments, branches and contacts.", filters: [], show: root || can(me, "staff:export") || can(me, "staff:view") },
    { slug: "fines", title: "Fines", blurb: "Lateness, absence and discipline fines.", filters: ["range"], show: root || can(me, "fines:view") },
    { slug: "payroll", title: "Payslips and payroll", blurb: "Salary, allowances, tax, pension, fines and net pay per staff member.", filters: ["month"], show: root || can(me, "payroll:view") },
    { slug: "expenses", title: "Expense register", blurb: "Every payment for running the school, with payee and method.", filters: ["range"], show: root || can(me, "ledger:view") || can(me, "expenses:view") },
    { slug: "hr-cases", title: "HR cases", blurb: "Queries, warnings and decisions.", filters: [], show: root || can(me, "hrm:manage") },
    { slug: "crm", title: "CRM", blurb: "Accounts and opportunities.", filters: [], show: root || can(me, "crm:view") },
    { slug: "questions", title: "Question bank", blurb: "All questions with answers and status.", filters: [], show: root || can(me, "questions:export") },
    { slug: "comments", title: "Website messages", blurb: "Contact and feedback messages.", filters: [], show: root || can(me, "comments:edit") },
    { slug: "audit", title: "Audit trail", blurb: "Append-only activity record.", filters: [], show: root || can(me, "audit:export") },
  ] as Item[]).filter((i) => i.show);

  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Downloads" sub="Records as Excel workbooks. You only see the downloads you are allowed to take, and teachers get their own classes." />
      {items.length === 0 ? <Empty title="No downloads available for your role" /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((i) => (
            <Card key={i.slug}>
              <h2 className="text-xl">{i.title}</h2><p className="text-sm text-muted">{i.blurb}</p>
              <form action={`/portal/export/${i.slug}`} method="get" className="mt-3 grid gap-2 sm:grid-cols-2">
                {i.filters.includes("class") && <div className="field"><label>Class{i.classRequired ? "" : " (optional)"}</label><select name="class" className="select" required={i.classRequired}><option value="">{i.classRequired ? "Choose…" : "All"}</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>}
                {i.filters.includes("term") && <div className="field"><label>Term</label><select name="term" className="select" required>{terms.map((t) => <option key={t.id} value={t.id}>{t.session} · {t.name}</option>)}</select></div>}
                {i.filters.includes("status") && <div className="field"><label>Status</label><select name="status" className="select"><option value="">Any</option><option value="enrolled">Enrolled</option><option value="active">Active</option><option value="graduated">Graduated</option></select></div>}
                {i.filters.includes("range") && <><div className="field"><label>From</label><input name="from" type="date" defaultValue={monthAgo} className="input" /></div><div className="field"><label>To</label><input name="to" type="date" defaultValue={today} className="input" /></div></>}
                {i.filters.includes("month") && <div className="field"><label>Month (blank = all)</label><input name="period" type="month" className="input" /></div>}
                <div className="flex items-end gap-2 sm:col-span-2"><button className="btn btn-primary btn-sm">Download Excel</button><button name="format" value="csv" className="btn btn-ghost btn-sm">CSV</button></div>
              </form>
            </Card>))}
        </div>
      )}
    </>
  );
}
