import { describe, expect, it } from "vitest";
import { computePayslip, kpiScore, validPeriod } from "@/lib/logic/payroll";

describe("payroll", () => {
  it("computes net pay with statutory rates and fines", () => {
    const s = computePayslip({ gross: 100000, allowances: 20000, pensionPct: 8, taxPct: 5, fines: 1500 });
    expect(s.earnings).toBe(120000);
    expect(s.pension).toBe(8000);
    expect(s.tax).toBe(6000);
    expect(s.net).toBe(104500);
  });
  it("never produces negative net pay", () => {
    expect(computePayslip({ gross: 1000, allowances: 0, pensionPct: 0, taxPct: 0, fines: 5000 }).net).toBe(0);
  });
  it("validates periods", () => {
    expect(validPeriod("2026-10")).toBe(true);
    expect(validPeriod("2026-13")).toBe(false);
  });
  it("re-weights KPI when parts are missing", () => {
    expect(kpiScore({ punctuality: 100, deliverables: 50, tasks: 0 })).toBe(60);
    expect(kpiScore({ punctuality: 100, deliverables: null, tasks: null })).toBe(100);
    expect(kpiScore({ punctuality: null, deliverables: null, tasks: null })).toBeNull();
  });
});
