// Role + permission model. Defaults live here; Super Admin overrides are stored in the database.

export const ROLES = [
  "proprietor", "super_admin", "principal", "vp_admin", "vp_academics", "hod",
  "senior_staff", "teacher", "class_teacher", "student", "parent",
  "accountant", "librarian", "nurse", "counsellor", "transport", "ict_officer", "reception", "exam_officer", "bursar",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<string, string> = {
  proprietor: "Proprietor", super_admin: "Super Admin", principal: "Principal",
  vp_admin: "Vice Principal (Administration)", vp_academics: "Vice Principal (Academics)",
  hod: "Head of Department", senior_staff: "Senior Staff", teacher: "Teacher", class_teacher: "Class Teacher",
  student: "Student", parent: "Parent / Guardian", accountant: "Accountant", librarian: "Librarian",
  nurse: "School Nurse", counsellor: "Counsellor", transport: "Transport Manager", ict_officer: "ICT Officer",
  reception: "Reception / Admin Officer", exam_officer: "Examination Officer", bursar: "Bursar",
};

export const STAFF_ROLES: Role[] = [
  "principal", "vp_admin", "vp_academics", "hod", "senior_staff", "teacher", "class_teacher",
  "proprietor", "accountant", "librarian", "nurse", "counsellor", "transport", "ict_officer", "reception", "exam_officer", "bursar",
];

export const RESOURCES = [
  "dashboard", "students", "parents", "staff", "classes", "subjects", "timetable", "calendar", "attendance",
  "promotion", "access_codes", "lessons", "questions", "assessments", "results", "reports", "certificates",
  "resources", "announcements", "comments", "analytics", "audit", "cms", "settings", "roles", "users",
] as const;
export const ACTIONS = ["view", "create", "edit", "archive", "approve", "publish", "export", "print", "assign", "transfer", "review", "manage"] as const;

export type Perm = `${(typeof RESOURCES)[number]}:${(typeof ACTIONS)[number]}`;

const all = (r: string, a: readonly string[] = ACTIONS) => a.map((x) => `${r}:${x}`);
const view = (...r: string[]) => r.map((x) => `${x}:view`);
const full = (...r: string[]) => r.flatMap((x) => all(x));

const ACADEMIC_VIEW = view("dashboard", "students", "classes", "subjects", "timetable", "calendar", "attendance", "lessons", "questions", "assessments", "results", "reports", "resources", "announcements", "analytics");

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  proprietor: [
    ...view("dashboard", "students", "parents", "staff", "classes", "subjects", "timetable", "calendar", "attendance", "lessons", "questions", "assessments", "results", "reports", "certificates", "resources", "announcements", "comments", "analytics", "audit"),
    "reports:export", "reports:print", "audit:export", "announcements:create", "announcements:publish",
  ],
  principal: [
    ...ACADEMIC_VIEW, ...view("staff", "parents", "certificates", "comments", "audit", "promotion"),
    ...full("classes", "timetable", "calendar", "announcements", "lessons"),
    "assessments:create", "assessments:edit", "assessments:publish", "assessments:approve",
    "questions:approve", "questions:review", "results:approve", "results:publish", "results:edit",
    "reports:export", "reports:print", "reports:approve", "certificates:create", "certificates:print", "certificates:approve",
    "promotion:create", "promotion:transfer", "promotion:approve", "staff:assign", "staff:transfer", "students:edit", "comments:edit", "audit:export",
  ],
  vp_admin: [
    ...ACADEMIC_VIEW, ...view("staff", "parents"),
    ...full("staff"), "attendance:create", "attendance:edit", "attendance:export", "reports:export", "reports:print",
    "announcements:create", "announcements:publish", "students:create", "students:edit", "students:export", "parents:edit", "comments:view", "comments:edit",
  ],
  vp_academics: [
    ...ACADEMIC_VIEW, ...view("staff", "parents", "certificates"),
    ...full("timetable", "calendar", "lessons"),
    "classes:create", "classes:edit", "classes:assign", "classes:transfer", "subjects:create", "subjects:edit", "subjects:assign",
    "staff:assign", "staff:transfer", "assessments:create", "assessments:edit", "assessments:publish", "assessments:approve",
    "questions:approve", "questions:review", "questions:create", "questions:edit", "results:approve", "results:publish", "results:edit",
    "reports:export", "reports:print", "certificates:create", "certificates:print", "announcements:create", "announcements:publish",
    "promotion:create", "promotion:transfer", "resources:create", "resources:edit", "resources:publish",
  ],
  hod: [
    ...ACADEMIC_VIEW, ...view("staff"),
    "lessons:review", "lessons:approve", "lessons:create", "lessons:edit",
    "questions:create", "questions:edit", "questions:review", "questions:approve",
    "assessments:create", "assessments:edit", "resources:create", "resources:edit", "resources:publish", "reports:export", "reports:print",
  ],
  senior_staff: [
    ...ACADEMIC_VIEW, "lessons:create", "lessons:edit", "lessons:review", "questions:create", "questions:edit", "assessments:create", "assessments:edit",
    "resources:create", "resources:edit", "reports:print",
  ],
  teacher: [
    ...view("dashboard", "students", "classes", "subjects", "timetable", "calendar", "attendance", "lessons", "questions", "assessments", "results", "resources", "announcements", "analytics"),
    "lessons:create", "lessons:edit", "questions:create", "questions:edit",
    "assessments:create", "assessments:edit", "assessments:publish", "resources:create", "resources:edit", "results:edit", "reports:print",
  ],
  class_teacher: [
    ...view("dashboard", "students", "classes", "subjects", "timetable", "calendar", "attendance", "lessons", "questions", "assessments", "results", "reports", "resources", "announcements", "analytics", "parents"),
    "attendance:create", "attendance:edit", "lessons:create", "lessons:edit", "questions:create", "questions:edit",
    "assessments:create", "assessments:edit", "assessments:publish", "resources:create", "resources:edit", "results:edit", "reports:print", "reports:edit",
  ],
  student: [...view("dashboard", "timetable", "calendar", "resources", "announcements", "results", "assessments")],
  parent: [...view("dashboard", "timetable", "calendar", "announcements", "results", "reports", "attendance", "certificates")],
};

export function defaultsFor(role: string): string[] {
  if (DEFAULT_PERMISSIONS[role]) return DEFAULT_PERMISSIONS[role];
  // Future/supporting roles start with a minimal read-only footprint.
  return ["dashboard:view", "announcements:view", "calendar:view"];
}

export function permits(perms: Set<string> | string[], need: string): boolean {
  const s = perms instanceof Set ? perms : new Set(perms);
  return s.has("*") || s.has(need) || s.has(`${need.split(":")[0]}:manage`);
}

/** Roles ordered by seniority — used to stop privilege escalation by lower roles. */
export const HIERARCHY: string[] = [
  "super_admin", "proprietor", "principal", "vp_academics", "vp_admin", "hod", "senior_staff",
  "class_teacher", "teacher", "accountant", "bursar", "exam_officer", "librarian", "nurse", "counsellor",
  "transport", "ict_officer", "reception", "parent", "student",
];
export function outranks(actor: string, target: string): boolean {
  const a = HIERARCHY.indexOf(actor);
  const t = HIERARCHY.indexOf(target);
  if (a < 0 || t < 0) return false;
  return a < t;
}

export function portalHome(role: string): string {
  return "/portal";
}
