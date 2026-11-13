// The Developer's switchboard: which modules and which individual menu items are switched on.
// Pure helpers only (no database), so they can be unit-tested and used from the layout.

export type ModuleStatus = "built" | "new" | "needs_keys";
export type PlatformModule = { key: string; label: string; blurb: string; status: ModuleStatus; defaultOn: boolean; prefixes: string[] };

/** Every module the Developer can switch. `prefixes` are the portal paths that belong to it. */
export const PLATFORM_MODULES: PlatformModule[] = [
  { key: "registration", label: "Registration", blurb: "Student, parent and staff sign-up, student import, access codes and parent linking.", status: "built", defaultOn: true,
    prefixes: ["/portal/students", "/portal/access-codes", "/portal/children"] },
  { key: "attendance", label: "Attendance", blurb: "Student and staff attendance, clock in/out at branches, duty roster.", status: "built", defaultOn: true,
    prefixes: ["/portal/attendance", "/portal/clock", "/portal/roster"] },
  { key: "crm", label: "CRM", blurb: "Admissions enquiries, sponsors and partners: accounts, pipeline and follow-ups.", status: "built", defaultOn: true, prefixes: ["/portal/crm"] },
  { key: "hrm", label: "HRM", blurb: "Staff rules and fines, HR cases, training, holidays, performance and branches.", status: "built", defaultOn: true,
    prefixes: ["/portal/hrm", "/portal/performance", "/portal/branches", "/portal/staff"] },
  { key: "academics", label: "Academics", blurb: "Classes, timetable, assessments, mark sheets, results, report cards, certificates and the calendar.", status: "built", defaultOn: true,
    prefixes: ["/portal/classes", "/portal/timetable", "/portal/promotion", "/portal/assessments", "/portal/mark-sheet", "/portal/results", "/portal/report", "/portal/certificates", "/portal/calendar", "/portal/analytics"] },
  { key: "notifications", label: "Notifications", blurb: "Announcements, alerts and website messages.", status: "built", defaultOn: true,
    prefixes: ["/portal/announcements", "/portal/notifications", "/portal/comments"] },
  { key: "lms", label: "LMS", blurb: "Study centre, lesson notes, resources, holiday hub, Bible and hymns.", status: "built", defaultOn: true,
    prefixes: ["/portal/study", "/portal/lessons", "/portal/resources", "/portal/holiday", "/portal/bible", "/portal/hymns"] },
  { key: "cbt", label: "CBT", blurb: "Computer-based tests, mock exams, assignments and the question bank.", status: "built", defaultOn: true,
    prefixes: ["/portal/work", "/portal/mocks", "/portal/questions", "/portal/take"] },
  { key: "sms", label: "SMS", blurb: "Text messages to parents, students and staff. Messages queue until an SMS provider key is added.", status: "needs_keys", defaultOn: false, prefixes: ["/portal/sms"] },
  { key: "finance", label: "Finance", blurb: "School fees and receipts, payroll and payslips, ledger, expense register, approvals.", status: "built", defaultOn: true,
    prefixes: ["/portal/fees", "/portal/payroll", "/portal/payslips", "/portal/ledger", "/portal/expenses"] },
  { key: "library", label: "Library", blurb: "Book catalogue, borrowing, returns and overdue books.", status: "new", defaultOn: false, prefixes: ["/portal/library"] },
  { key: "hostel", label: "Hostel", blurb: "Hostel blocks, rooms and beds, and which student sleeps where.", status: "new", defaultOn: false, prefixes: ["/portal/hostel"] },
];

/** Menu items that can never be switched off, so the Developer cannot lock everyone (including themself) out. */
export const CORE_PREFIXES = ["/portal/developer", "/portal/settings", "/portal/backend", "/portal/users", "/portal/studio", "/account", "/portal/audit", "/portal/exports"];

export type PlatformState = { modules: Record<string, boolean>; menus: Record<string, boolean>; maintenance: boolean };

export const DEFAULT_PLATFORM: PlatformState = { modules: Object.fromEntries(PLATFORM_MODULES.map((m) => [m.key, m.defaultOn])), menus: {}, maintenance: false };

export function normalisePlatform(raw: unknown): PlatformState {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<PlatformState>;
  const modules = { ...DEFAULT_PLATFORM.modules };
  for (const m of PLATFORM_MODULES) if (r.modules && typeof r.modules[m.key] === "boolean") modules[m.key] = r.modules[m.key];
  const menus: Record<string, boolean> = {};
  if (r.menus && typeof r.menus === "object") for (const [k, v] of Object.entries(r.menus)) if (typeof v === "boolean" && k.startsWith("/")) menus[k] = v;
  return { modules, menus, maintenance: !!r.maintenance };
}

export const moduleOf = (path: string): PlatformModule | null =>
  PLATFORM_MODULES.find((m) => m.prefixes.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p + "?"))) ?? null;

const isCore = (path: string) => CORE_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p + "?"));

/** Is this portal path switched on? Core pages and the dashboard always are. Anything not in a module follows its own menu switch. */
export function pathOn(state: PlatformState, path: string): boolean {
  const clean = path.split("?")[0].replace(/\/$/, "") || "/";
  if (clean === "/portal" || isCore(clean)) return true;
  const m = moduleOf(clean);
  if (m && !state.modules[m.key]) return false;
  const own = Object.keys(state.menus).filter((k) => clean === k || clean.startsWith(k + "/")).sort((a, b) => b.length - a.length)[0];
  return own === undefined ? true : state.menus[own];
}

/** Every menu entry the Developer can switch, grouped by module. Labels match the portal menu. */
export const MENU_CATALOGUE: { href: string; label: string }[] = [
  { href: "/portal/students", label: "Students" }, { href: "/portal/access-codes", label: "Access codes" }, { href: "/portal/children", label: "My children (parents)" },
  { href: "/portal/attendance", label: "Attendance" }, { href: "/portal/clock", label: "Clock in / out" }, { href: "/portal/roster", label: "Duty roster" },
  { href: "/portal/crm", label: "CRM" },
  { href: "/portal/hrm", label: "HRM" }, { href: "/portal/performance", label: "Staff performance" }, { href: "/portal/branches", label: "Branches & fines" }, { href: "/portal/staff", label: "Staff" },
  { href: "/portal/classes", label: "Classes & subjects" }, { href: "/portal/timetable", label: "Timetable" }, { href: "/portal/promotion", label: "Promotion" }, { href: "/portal/assessments", label: "Assessments" },
  { href: "/portal/mark-sheet", label: "Mark sheet" }, { href: "/portal/results", label: "Results" }, { href: "/portal/certificates", label: "Certificates" }, { href: "/portal/calendar", label: "Academic calendar" }, { href: "/portal/analytics", label: "Analytics" },
  { href: "/portal/announcements", label: "Announcements" }, { href: "/portal/comments", label: "Website messages" },
  { href: "/portal/study", label: "Study centre" }, { href: "/portal/lessons", label: "Lesson notes" }, { href: "/portal/resources", label: "Resources" }, { href: "/portal/holiday", label: "Holiday hub" }, { href: "/portal/bible", label: "Holy Bible" }, { href: "/portal/hymns", label: "Hymn books" },
  { href: "/portal/work", label: "Assignments & tests" }, { href: "/portal/mocks", label: "Mock centre" }, { href: "/portal/questions", label: "Question bank" },
  { href: "/portal/sms", label: "SMS" },
  { href: "/portal/fees", label: "School fees" }, { href: "/portal/payroll", label: "Payroll" }, { href: "/portal/payslips", label: "Payslips" }, { href: "/portal/ledger", label: "Ledger" }, { href: "/portal/expenses", label: "Expense register" },
  { href: "/portal/library", label: "Library" }, { href: "/portal/hostel", label: "Hostel" },
];
