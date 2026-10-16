import type { Me } from "./auth";
import { getSetting } from "./settings";

export type FieldDef = { name: string; label: string; type: "text" | "textarea" | "date" | "select"; options?: string[]; required?: boolean };
export type ModuleDef = {
  key: string; label: string; blurb: string; origin: "Fodan College" | "WorkSuite";
  fields: FieldDef[]; statuses: string[]; defaultStatus: string;
  create: string[]; view: string[]; manage: string[];
  ownOnly?: boolean; replies?: boolean; acknowledge?: boolean; assignable?: boolean; board?: boolean; ownerMay?: string[]; dated?: boolean;
  enabled?: boolean;
};

const MGMT = ["super_admin", "premium_admin", "proprietor", "director", "principal", "headteacher", "vp_admin", "hr_manager", "vp_academics", "asst_headteacher"];

/** Built-in modules carried over from Fodan College (forum, tasks) and WorkSuite (leave, memos, knowledge base, tickets, discipline). */
export const MODULES: ModuleDef[] = [
  { key: "forum", label: "Discussion forum", origin: "Fodan College", blurb: "Topics and replies for students, parents and staff, moderated by school leaders.",
    fields: [{ name: "category", label: "Category", type: "select", options: ["General", "Academics", "Examinations", "Study tips", "School life"], required: true }],
    statuses: ["open", "locked", "hidden"], defaultStatus: "open", create: ["all"], view: ["all"], manage: [...MGMT, "hod"], replies: true },
  { key: "tasks", label: "Task board", origin: "Fodan College", blurb: "Assign and track work across staff: To do, In progress, Blocked, Done.",
    fields: [{ name: "priority", label: "Priority", type: "select", options: ["Low", "Normal", "High", "Urgent"] }],
    statuses: ["todo", "in_progress", "blocked", "done"], defaultStatus: "todo", create: ["staff"], view: ["staff"], manage: [...MGMT, "hod"],
    ownOnly: true, assignable: true, board: true, dated: true, ownerMay: ["in_progress", "blocked", "done"], replies: true },
  { key: "leave", label: "Leave requests", origin: "WorkSuite", blurb: "Staff request leave; school leaders approve or decline.",
    fields: [{ name: "type", label: "Leave type", type: "select", options: ["Annual", "Sick", "Maternity / paternity", "Compassionate", "Study", "Other"], required: true },
      { name: "from", label: "From", type: "date", required: true }, { name: "to", label: "To", type: "date", required: true }],
    statuses: ["pending", "approved", "rejected", "cancelled"], defaultStatus: "pending", create: ["staff"], view: ["staff"], manage: ["super_admin", "principal", "vp_admin"],
    ownOnly: true, ownerMay: ["cancelled"] },
  { key: "memos", label: "Memos & notices", origin: "WorkSuite", blurb: "Numbered staff memos; the sender sees who has acknowledged.",
    fields: [], statuses: ["published", "draft", "archived"], defaultStatus: "published", create: [...MGMT, "hod"], view: ["staff"], manage: [...MGMT], acknowledge: true },
  { key: "kb", label: "Knowledge base", origin: "WorkSuite", blurb: "Procedures, policies and how-to articles.",
    fields: [{ name: "category", label: "Category", type: "text" }], statuses: ["published", "draft", "archived"], defaultStatus: "draft",
    create: ["staff"], view: ["all"], manage: [...MGMT, "hod"], ownerMay: ["draft"] },
  { key: "tickets", label: "Support tickets", origin: "WorkSuite", blurb: "Ask the school office or ICT for help and follow the reply.",
    fields: [{ name: "category", label: "Category", type: "select", options: ["Account / login", "Results", "Fees", "Academics", "Facilities", "Other"], required: true },
      { name: "priority", label: "Priority", type: "select", options: ["Normal", "High", "Urgent"] }],
    statuses: ["open", "in_progress", "resolved", "closed"], defaultStatus: "open", create: ["all"], view: ["all"], manage: [...MGMT, "ict_officer", "reception"],
    ownOnly: true, replies: true, ownerMay: ["closed"] },
  { key: "finance", label: "Finance approvals", origin: "WorkSuite", blurb: "Expense and payment requests with an approval trail (requester, approver, payer).",
    fields: [{ name: "amount", label: "Amount (₦)", type: "text", required: true },
      { name: "category", label: "Category", type: "select", options: ["Salaries", "Maintenance", "Utilities", "Learning materials", "Events", "Transport", "Other"], required: true }],
    statuses: ["pending", "approved", "rejected", "paid"], defaultStatus: "pending", create: ["staff"], view: ["staff"],
    manage: ["super_admin", "premium_admin", "proprietor", "director", "accountant", "bursar", "principal", "headteacher"], ownOnly: true, replies: true, ownerMay: [] },
  { key: "rosters", label: "Rosters & shifts", origin: "WorkSuite", blurb: "Weekly duty rosters by branch; staff see their own shifts.",
    fields: [{ name: "date", label: "Date", type: "date", required: true }, { name: "shift", label: "Shift", type: "select", options: ["Morning", "Afternoon", "Night", "Weekend duty", "Off"], required: true },
      { name: "location", label: "Branch / post", type: "text" }],
    statuses: ["scheduled", "swap_requested", "completed"], defaultStatus: "scheduled", create: [...MGMT, "hod", "hr_manager"], view: ["staff"], manage: [...MGMT, "hod"], ownOnly: true, assignable: true, ownerMay: ["swap_requested"] },
  { key: "deliverables", label: "Deliverables", origin: "WorkSuite", blurb: "Submit what you produced this month; supervisors approve or return it. Approved work feeds your KPI.",
    fields: [{ name: "period", label: "Month (YYYY-MM)", type: "text", required: true }, { name: "link", label: "Link to the work", type: "text" }],
    statuses: ["submitted", "approved", "returned"], defaultStatus: "submitted", create: ["staff"], view: ["staff"], manage: [...MGMT, "hod"], ownOnly: true, replies: true },
  { key: "crm", label: "CRM (partners & enquiries)", origin: "WorkSuite", blurb: "Track admissions leads, sponsors, vendors and partners through stages.",
    fields: [{ name: "organisation", label: "Organisation / person", type: "text", required: true }, { name: "phone", label: "Phone", type: "text" },
      { name: "stage", label: "Stage", type: "select", options: ["New", "Contacted", "Meeting", "Proposal", "Won", "Lost"], required: true }],
    statuses: ["open", "won", "lost"], defaultStatus: "open", create: [...MGMT, "reception", "accountant", "bursar"], view: [...MGMT, "reception", "accountant", "bursar"], manage: [...MGMT], replies: true },
  { key: "procurement", label: "Procurement", origin: "WorkSuite", blurb: "Purchase orders: raise, approve, confirm receipt. Three different people.",
    fields: [{ name: "vendor", label: "Vendor", type: "text", required: true }, { name: "amount", label: "Amount (₦)", type: "text", required: true },
      { name: "category", label: "Category", type: "select", options: ["Learning materials", "Maintenance", "Utilities", "Events", "Transport", "Other"] }],
    statuses: ["requested", "approved", "received", "rejected"], defaultStatus: "requested", create: ["staff"], view: ["staff"],
    manage: ["super_admin", "premium_admin", "proprietor", "director", "principal", "headteacher", "accountant", "bursar"], ownOnly: true, replies: true },
  { key: "contracts", label: "Contracts", origin: "WorkSuite", blurb: "Staff, vendor and partner contracts with start/end dates for renewal tracking.",
    fields: [{ name: "party", label: "Other party", type: "text", required: true }, { name: "start", label: "Start", type: "date" }, { name: "end", label: "End", type: "date" }, { name: "value", label: "Value (₦)", type: "text" }],
    statuses: ["draft", "sent", "signed", "expired", "terminated"], defaultStatus: "draft", create: [...MGMT, "hr_manager"], view: [...MGMT, "hr_manager", "accountant", "auditor"], manage: [...MGMT, "hr_manager"] },
  { key: "discipline", label: "Discipline records", origin: "WorkSuite", blurb: "Queries and warnings with a fair-hearing trail. Restricted to school leaders.",
    fields: [{ name: "subject", label: "Student admission no. or staff email", type: "text", required: true },
      { name: "type", label: "Type", type: "select", options: ["Query", "Verbal warning", "Written warning", "Final warning", "Suspension"], required: true }],
    statuses: ["open", "response_received", "warning_issued", "resolved"], defaultStatus: "open", create: [...MGMT, "hod"], view: [...MGMT], manage: [...MGMT], replies: true },
];

export type ModuleOverride = { enabled?: boolean; label?: string; create?: string[]; view?: string[]; manage?: string[] };

/** Built-in module defaults merged with whatever the Super Admin set in the BackEnd. */
export async function loadModules(): Promise<ModuleDef[]> {
  const ov = ((await getSetting<Record<string, ModuleOverride>>("modules")) ?? {}) as Record<string, ModuleOverride>;
  return MODULES.map((m) => {
    const o = ov[m.key] ?? {};
    return { ...m, enabled: o.enabled ?? true, label: o.label || m.label, create: o.create?.length ? o.create : m.create, view: o.view?.length ? o.view : m.view, manage: o.manage?.length ? o.manage : m.manage };
  });
}

export function matches(me: Me, aud: string[]): boolean {
  if (me.role === "super_admin") return true;
  const staff = me.role !== "student" && me.role !== "parent";
  return aud.some((a) => a === "all" || (a === "staff" && staff) || (a === "student" && me.role === "student") || (a === "parent" && me.role === "parent") || me.roles.includes(a));
}

export const canCreate = (me: Me, m: ModuleDef) => !!m.enabled && matches(me, m.create);
export const canView = (me: Me, m: ModuleDef) => !!m.enabled && (matches(me, m.view) || matches(me, m.create));
export const canManage = (me: Me, m: ModuleDef) => !!m.enabled && matches(me, m.manage);
