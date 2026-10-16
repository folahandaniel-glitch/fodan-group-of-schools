const r2 = (n: number) => Math.round(n * 100) / 100;

export type PayInput = { gross: number; allowances: number; pensionPct: number; taxPct: number; fines: number; advances?: number };
export type PaySlip = { gross: number; allowances: number; pension: number; tax: number; fines: number; advances: number; net: number; earnings: number };

/** Monthly payslip: percentages apply to base gross; fines and advances are deducted last and net never goes below zero. */
export function computePayslip(i: PayInput): PaySlip {
  const gross = Math.max(i.gross, 0), allowances = Math.max(i.allowances, 0);
  const earnings = r2(gross + allowances);
  const pension = r2((gross * Math.max(i.pensionPct, 0)) / 100);
  const tax = r2((earnings * Math.max(i.taxPct, 0)) / 100);
  const fines = r2(Math.max(i.fines, 0)), advances = r2(Math.max(i.advances ?? 0, 0));
  const net = Math.max(r2(earnings - pension - tax - fines - advances), 0);
  return { gross, allowances, pension, tax, fines, advances, net, earnings };
}

export function validPeriod(p: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
}

/** Staff KPI: weights are 40% punctuality, 40% deliverables, 20% tasks. Missing components are excluded and the rest re-weighted. */
export function kpiScore(c: { punctuality: number | null; deliverables: number | null; tasks: number | null }): number | null {
  const parts: [number | null, number][] = [[c.punctuality, 40], [c.deliverables, 40], [c.tasks, 20]];
  const live = parts.filter(([v]) => v !== null) as [number, number][];
  if (live.length === 0) return null;
  const w = live.reduce((s, [, x]) => s + x, 0);
  return Math.round(live.reduce((s, [v, x]) => s + v * x, 0) / w);
}
