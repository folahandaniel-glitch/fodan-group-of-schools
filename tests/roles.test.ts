import { describe, expect, it } from "vitest";
import { ADMIN_ROLES, defaultsFor, isRoot, outranks, permits } from "@/lib/logic/permissions";
import { mix, themeVars, THEME_SEEDS } from "@/lib/themes";

const has = (role: string, perm: string) => permits(defaultsFor(role), perm);

describe("developer and admin roles", () => {
  it("developer and super admin hold everything; nobody else is root", () => {
    expect(isRoot("developer") && isRoot("super_admin")).toBe(true);
    expect(isRoot("hr_admin") || isRoot("principal")).toBe(false);
    expect(has("developer", "payroll:manage")).toBe(true);
  });
  it("developer outranks super admin, which outranks every other admin", () => {
    expect(outranks("developer", "super_admin")).toBe(true);
    for (const r of ADMIN_ROLES.filter((x) => x !== "super_admin")) expect(outranks("super_admin", r)).toBe(true);
    expect(outranks("hr_admin", "super_admin")).toBe(false);
  });
  it("HRM rules can be managed by HR roles only", () => {
    for (const r of ["hr_manager", "hr_admin", "vp_admin"]) expect(has(r, "hrm:manage")).toBe(true);
    for (const r of ["teacher", "student", "parent", "accountant", "reception"]) expect(has(r, "hrm:manage")).toBe(false);
    expect(has("teacher", "hrm:view")).toBe(true);
    expect(has("student", "hrm:view")).toBe(false);
  });
  it("study centre and holiday hub: learners view, teachers contribute, academic leaders manage", () => {
    expect(has("student", "curriculum:view") && has("parent", "holiday:view")).toBe(true);
    expect(has("student", "curriculum:manage")).toBe(false);
    expect(has("teacher", "curriculum:create")).toBe(true);
    expect(has("teacher", "curriculum:manage")).toBe(false);
    expect(has("academic_admin", "curriculum:manage") && has("vp_academics", "holiday:manage")).toBe(true);
  });
});

describe("CRM, HRM, timetable and money access", () => {
  it("CRM is for HR roles and whoever is assigned; HRM rules likewise", () => {
    for (const r of ["hr_manager", "hr_admin", "vp_admin"]) expect(has(r, "crm:manage") && has(r, "hrm:manage")).toBe(true);
    for (const r of ["teacher", "class_teacher", "accountant", "principal", "proprietor", "reception"]) expect(has(r, "crm:view") || has(r, "hrm:manage")).toBe(false);
  });
  it("class teachers can draft a timetable and download their class records", () => {
    expect(has("class_teacher", "timetable:edit") && has("class_teacher", "students:export") && has("teacher", "results:export")).toBe(true);
    expect(has("teacher", "timetable:publish")).toBe(false);
  });
  it("bursar and accountant run payroll views and the expense register; teachers cannot", () => {
    for (const r of ["bursar", "accountant", "finance_admin"]) expect(has(r, "payroll:view") && has(r, "expenses:manage")).toBe(true);
    expect(has("teacher", "payroll:view") || has("teacher", "expenses:view")).toBe(false);
  });
});

describe("themes", () => {
  it("offers more than 20 themes with unique ids, the logo theme first", () => {
    expect(THEME_SEEDS.length).toBeGreaterThan(20);
    expect(new Set(THEME_SEEDS.map((t) => t.id)).size).toBe(THEME_SEEDS.length);
    expect(THEME_SEEDS[0].id).toBe("fodan-classic");
  });
  it("every theme defines every colour and light themes keep readable text", () => {
    const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0); };
    const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    for (const t of THEME_SEEDS) {
      const v = themeVars(t);
      for (const k of ["paper", "card", "ink", "muted", "line", "strong", "gold-2"]) expect(v[k]).toMatch(/^#[0-9a-f]{6}$/);
      expect(ratio(v.ink, v.paper), `${t.id} ink on paper`).toBeGreaterThan(7);
      expect(ratio(v.muted, v.paper), `${t.id} muted on paper`).toBeGreaterThan(3.2);
      expect(ratio("#ffffff", v.strong), `${t.id} white on strong`).toBeGreaterThan(7);
    }
  });
  it("mixes colours", () => { expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080"); });
});
