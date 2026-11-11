import { sql } from "./db";

export const ACTIONS = ["query", "verbal_warning", "written_warning", "final_warning", "suspension", "fine", "commendation"] as const;
export const ACTION_LABEL: Record<string, string> = {
  query: "Query (show cause)", verbal_warning: "Verbal warning", written_warning: "Written warning", final_warning: "Final written warning",
  suspension: "Suspension", fine: "Fine", commendation: "Commendation",
};
export const CASE_STATUS: Record<string, string> = { open: "Awaiting response", response_received: "Response received", decided: "Decided", closed: "Closed" };

type Rule = { code: string; title: string; category: string; description: string; guidance: string; action: string; fine: number; after: number; days: number; to: string };

/** Starting rule library. Every field is editable by anyone holding hrm:manage (Developer, Super Admin, HR Manager and whoever they assign). */
export const DEFAULT_RULES: Rule[] = [
  { code: "LATE", title: "Punctuality", category: "Attendance", description: "Clock in before resumption time plus grace. Late arrival attracts the flat fine, plus the per-minute amount set under Branches & fines.",
    guidance: "Check the clock record and whether lateness was approved. Verbal warning first; repeated lateness escalates.", action: "fine", fine: 500, after: 3, days: 30, to: "written_warning" },
  { code: "ABS", title: "Absence without leave", category: "Attendance", description: "Absent without approved leave or permission. Apply for leave before the day, except in emergencies.",
    guidance: "Confirm no leave was approved. Issue a written query and let the staff member explain before deciding.", action: "written_warning", fine: 2000, after: 2, days: 90, to: "final_warning" },
  { code: "CLOCK", title: "Clock in at your branch", category: "Attendance", description: "Clock in and out only within your branch radius. Remote or proxy clock-ins are not accepted.",
    guidance: "Check the location recorded. Proxy clocking is dishonesty: treat it as serious.", action: "query", fine: 0, after: 0, days: 90, to: "" },
  { code: "DRESS", title: "Dress code", category: "Conduct", description: "Dress modestly and professionally. Teachers wear the approved uniform on designated days.",
    guidance: "Speak to the staff member privately first.", action: "verbal_warning", fine: 0, after: 3, days: 60, to: "written_warning" },
  { code: "NOTES", title: "Lesson notes", category: "Performance", description: "Submit lesson notes for approval before the lesson. Unapproved notes may not be taught.",
    guidance: "Check the submission dates in Lesson notes.", action: "verbal_warning", fine: 0, after: 3, days: 60, to: "written_warning" },
  { code: "RESULTS", title: "Results deadline", category: "Performance", description: "Enter CA and exam scores before the deadline set by the Examination Officer.",
    guidance: "Confirm the deadline was communicated and the staff member had access.", action: "fine", fine: 1000, after: 0, days: 90, to: "" },
  { code: "CONF", title: "Confidentiality", category: "Conduct", description: "Never share student records, results or access codes. Passwords are personal and must not be shared.",
    guidance: "Preserve evidence and record who saw what. Query in writing.", action: "written_warning", fine: 0, after: 0, days: 365, to: "" },
  { code: "WELFARE", title: "Student welfare", category: "Serious misconduct", description: "No corporal punishment. Report abuse, bullying or injury to the Principal immediately.",
    guidance: "Protect the student first. Involve the Principal and follow the safeguarding procedure before any decision.", action: "suspension", fine: 0, after: 0, days: 365, to: "" },
  { code: "PHONE", title: "Phones in class", category: "Conduct", description: "Personal phone use during lessons is not allowed except for teaching.",
    guidance: "First occurrence: verbal warning.", action: "fine", fine: 500, after: 3, days: 30, to: "written_warning" },
  { code: "PROP", title: "School property", category: "Conduct", description: "Damage or loss of school property through negligence may be recovered from the staff member concerned.",
    guidance: "Record the item and its value. Allow the staff member to respond.", action: "query", fine: 0, after: 0, days: 90, to: "" },
  { code: "INSUB", title: "Insubordination", category: "Conduct", description: "Wilful refusal to follow a lawful and reasonable instruction.",
    guidance: "Record the instruction, who gave it and the response. Query first; never sanction without hearing the staff member.", action: "written_warning", fine: 0, after: 2, days: 180, to: "final_warning" },
  { code: "DISH", title: "Dishonesty, fraud or theft", category: "Serious misconduct", description: "Dishonest conduct involving money, property or records.",
    guidance: "Preserve evidence, query in writing, and involve the Proprietor and legal advice before any suspension or dismissal.", action: "suspension", fine: 0, after: 0, days: 365, to: "" },
  { code: "SAFE", title: "Safety and equipment misuse", category: "Safety", description: "Breach of safety rules or misuse of school equipment.",
    guidance: "Treat endangering others as serious; otherwise start with a written query.", action: "written_warning", fine: 0, after: 0, days: 180, to: "" },
  { code: "COMM", title: "Commendation", category: "Recognition", description: "Recognise outstanding performance or conduct.",
    guidance: "Be specific about what was done and its impact.", action: "commendation", fine: 0, after: 0, days: 365, to: "" },
];

const COURSES: [string, string, boolean, number | null][] = [
  ["Child protection and safeguarding", "Recognising and reporting abuse; safe conduct with students.", true, 24],
  ["First aid and emergency response", "Basic first aid, evacuation and incident reporting.", true, 36],
  ["Fire safety", "Fire prevention, extinguishers and drills.", false, 24],
  ["Data protection and confidentiality", "Handling student records, results and passwords.", true, 12],
];

export async function seedHrm(schoolId: string): Promise<void> {
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM hr_rules WHERE school_id = ${schoolId}`;
  if (n === 0) {
    let i = 0;
    for (const r of DEFAULT_RULES)
      await sql`INSERT INTO hr_rules (school_id, code, title, category, description, guidance, default_action, fine_amount, escalate_after, escalate_days, escalate_to, sort)
                VALUES (${schoolId}, ${r.code}, ${r.title}, ${r.category}, ${r.description}, ${r.guidance}, ${r.action}, ${r.fine}, ${r.after}, ${r.days}, ${r.to}, ${i++}) ON CONFLICT DO NOTHING`;
  }
  const [{ c }] = await sql`SELECT count(*)::int AS c FROM hr_courses WHERE school_id = ${schoolId}`;
  if (c === 0) for (const [name, d, m, v] of COURSES)
    await sql`INSERT INTO hr_courses (school_id, name, description, mandatory, valid_months) VALUES (${schoolId}, ${name}, ${d}, ${m}, ${v}) ON CONFLICT DO NOTHING`;
  const [{ h }] = await sql`SELECT count(*)::int AS h FROM hr_holidays WHERE school_id = ${schoolId}`;
  if (h === 0) {
    const y = new Date().getFullYear();
    for (const yr of [y, y + 1]) for (const [md, name] of [["01-01", "New Year's Day"], ["05-01", "Workers' Day"], ["06-12", "Democracy Day"], ["10-01", "Independence Day"], ["12-25", "Christmas Day"], ["12-26", "Boxing Day"]])
      await sql`INSERT INTO hr_holidays (school_id, day, name) VALUES (${schoolId}, ${`${yr}-${md}`}, ${name}) ON CONFLICT DO NOTHING`;
  }
}

/** One-time carry-over of the earlier flat CRM records into the proper CRM (accounts). Originals are left untouched. */
export async function migrateCrmRecords(schoolId: string): Promise<void> {
  await sql`INSERT INTO crm_accounts (school_id, name, kind, status, phone, owner_id, created_by, created_at)
    SELECT school_id, left(coalesce(nullif(data->>'organisation', ''), title), 160), 'partner',
           CASE data->>'stage' WHEN 'Won' THEN 'client' WHEN 'Lost' THEN 'inactive' WHEN 'New' THEN 'lead' ELSE 'prospect' END,
           nullif(data->>'phone', ''), owner_id, owner_id, created_at
    FROM records WHERE school_id = ${schoolId} AND module = 'crm' ON CONFLICT DO NOTHING`;
}

export async function nextCaseNumber(schoolId: string): Promise<string> {
  const [r] = await sql`SELECT coalesce(max(substring(number from '[0-9]+$')::int), 0) + 1 AS n FROM hr_cases WHERE school_id = ${schoolId}`;
  return `HRC-${String(r.n).padStart(5, "0")}`;
}

/** Offences recorded against a staff member under a rule inside its escalation window. */
export async function offenceCount(schoolId: string, userId: string, ruleId: string, days: number): Promise<number> {
  const [r] = await sql`SELECT count(*)::int AS n FROM hr_cases WHERE school_id = ${schoolId} AND user_id = ${userId} AND rule_id = ${ruleId}
    AND created_at > now() - make_interval(days => ${days}) AND kind <> 'commendation'`;
  return r.n as number;
}
