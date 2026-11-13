import { describe, expect, it } from "vitest";
import { DEFAULT_PLATFORM, MENU_CATALOGUE, PLATFORM_MODULES, moduleOf, normalisePlatform, pathOn } from "@/lib/platform";
import { normalisePhone } from "@/lib/sms";
import { defaultsFor, permits } from "@/lib/logic/permissions";

describe("Developer switchboard", () => {
  it("lists the twelve modules, with unbuilt or keyless ones off by default", () => {
    expect(PLATFORM_MODULES.map((m) => m.key)).toEqual(["registration", "attendance", "crm", "hrm", "academics", "notifications", "lms", "cbt", "sms", "finance", "library", "hostel"]);
    expect(DEFAULT_PLATFORM.modules.sms).toBe(false);
    expect(DEFAULT_PLATFORM.modules.library).toBe(false);
    expect(DEFAULT_PLATFORM.modules.hostel).toBe(false);
    expect(DEFAULT_PLATFORM.modules.crm && DEFAULT_PLATFORM.modules.finance && DEFAULT_PLATFORM.modules.cbt).toBe(true);
  });
  it("a switched-off module closes all of its pages, including sub-pages", () => {
    const s = normalisePlatform({ modules: { crm: false } });
    expect(pathOn(s, "/portal/crm")).toBe(false);
    expect(pathOn(s, "/portal/crm/123")).toBe(false);
    expect(pathOn(s, "/portal/hrm")).toBe(true);
  });
  it("a single menu can be switched off while its module stays on", () => {
    const s = normalisePlatform({ menus: { "/portal/payslips": false } });
    expect(pathOn(s, "/portal/payslips")).toBe(false);
    expect(pathOn(s, "/portal/payroll")).toBe(true);
  });
  it("core pages and the dashboard can never be switched off", () => {
    const s = normalisePlatform({ modules: Object.fromEntries(PLATFORM_MODULES.map((m) => [m.key, false])), menus: { "/portal/developer": false, "/portal/settings": false, "/portal": false } });
    for (const p of ["/portal", "/portal/developer", "/portal/settings", "/portal/backend", "/portal/users", "/portal/studio", "/portal/audit", "/portal/exports", "/account"]) expect(pathOn(s, p)).toBe(true);
  });
  it("every menu in the catalogue belongs to a module", () => {
    for (const m of MENU_CATALOGUE) expect(moduleOf(m.href), m.href).not.toBeNull();
  });
  it("ignores junk in saved settings", () => {
    const s = normalisePlatform({ modules: { crm: "yes" }, menus: { nope: false, "/portal/x": "no" } });
    expect(s.modules.crm).toBe(true);
    expect(Object.keys(s.menus)).toHaveLength(0);
  });
});

describe("new modules' permissions", () => {
  const has = (role: string, perm: string) => permits(defaultsFor(role), perm);
  it("finance staff manage fees; teachers cannot", () => {
    for (const r of ["accountant", "bursar", "finance_admin"]) expect(has(r, "fees:manage")).toBe(true);
    expect(has("teacher", "fees:manage") || has("teacher", "fees:view")).toBe(false);
  });
  it("librarian manages the library and everyone can browse", () => {
    expect(has("librarian", "library:manage")).toBe(true);
    expect(has("teacher", "library:manage")).toBe(false);
    expect(has("student", "library:view") && has("parent", "library:view")).toBe(true);
  });
  it("SMS and hostel are for school leaders", () => {
    for (const r of ["principal", "vp_admin", "student_affairs_admin"]) expect(has(r, "sms:manage") && has(r, "hostel:manage")).toBe(true);
    expect(has("teacher", "sms:manage")).toBe(false);
  });
});

describe("phone numbers", () => {
  it("normalises Nigerian numbers", () => {
    expect(normalisePhone("0803 123 4567")).toBe("2348031234567");
    expect(normalisePhone("+234 803 123 4567")).toBe("2348031234567");
    expect(normalisePhone("2348031234567")).toBe("2348031234567");
    expect(normalisePhone("abc")).toBe("");
    expect(normalisePhone("123")).toBe("");
  });
});
