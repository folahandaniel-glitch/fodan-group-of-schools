/** Diagrams, charts and graphs for lesson notes. A diagram is stored as plain text so a teacher can edit it without a drawing tool. */
export type DiagramKind = "bar" | "line" | "pie" | "numberline" | "flow" | "cycle" | "table";
export type Diagram = { kind: DiagramKind; title: string; caption: string; data: string };

export const DIAGRAM_KINDS: { key: DiagramKind; label: string; help: string; sample: string }[] = [
  { key: "bar", label: "Bar chart", help: "One line per bar: Label: number", sample: "Mon: 5\nTue: 8\nWed: 6\nThu: 9" },
  { key: "line", label: "Line graph", help: "One line per point: Label: number", sample: "Jan: 10\nFeb: 14\nMar: 12\nApr: 18" },
  { key: "pie", label: "Pie chart", help: "One line per slice: Label: number", sample: "Rice: 40\nBeans: 25\nYam: 35" },
  { key: "numberline", label: "Number line", help: "from: 0, to: 10, step: 1, mark: 3, 7", sample: "from: 0\nto: 10\nstep: 1\nmark: 3, 7" },
  { key: "flow", label: "Flow chart (steps)", help: "One step per line, left to right", sample: "Start\nStep 1\nStep 2\nResult" },
  { key: "cycle", label: "Cycle diagram", help: "One stage per line, in order. The last leads back to the first.", sample: "Evaporation\nCondensation\nPrecipitation\nCollection" },
  { key: "table", label: "Table", help: "One row per line, cells separated by |. First row is the heading.", sample: "Noun | Example\nCommon | boy\nProper | Ada" },
];
export const isKind = (k: unknown): k is DiagramKind => DIAGRAM_KINDS.some((d) => d.key === k);

const lines = (t: string) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/** "Label: 12" lines to points. Bad lines are skipped. */
export function parsePoints(t: string): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = [];
  for (const l of lines(t)) {
    const i = l.lastIndexOf(":");
    const v = Number(l.slice(i + 1).replace(/,/g, ""));
    if (i > 0 && Number.isFinite(v)) out.push({ label: l.slice(0, i).trim().slice(0, 24), value: v });
  }
  return out.slice(0, 16);
}
export function parseNumberLine(t: string): { from: number; to: number; step: number; marks: number[] } {
  const g = (k: string) => { const m = t.match(new RegExp(`${k}\\s*:\\s*([^\\n]+)`, "i")); return m ? m[1].trim() : ""; };
  let from = Number(g("from")), to = Number(g("to")), step = Number(g("step")) || 1;
  if (!Number.isFinite(from)) from = 0;
  if (!Number.isFinite(to) || to <= from) to = from + 10;
  if (step <= 0 || (to - from) / step > 40) step = Math.max(1, Math.ceil((to - from) / 20));
  const marks = g("mark").split(/[,\s]+/).map(Number).filter((n) => Number.isFinite(n) && n >= from && n <= to).slice(0, 12);
  return { from, to, step, marks };
}
export const parseSteps = (t: string) => lines(t).map((s) => s.slice(0, 40)).slice(0, 10);
export const parseTable = (t: string) => lines(t).slice(0, 12).map((l) => l.split("|").map((c) => c.trim().slice(0, 40)).slice(0, 5));

/** Cleans a diagram that came from a form or a saved note. */
export function cleanDiagram(d: Partial<Diagram> | null | undefined): Diagram | null {
  if (!d || !isKind(d.kind)) return null;
  const data = String(d.data ?? "").slice(0, 1500);
  if (!data.trim()) return null;
  return { kind: d.kind, title: String(d.title ?? "").slice(0, 100), caption: String(d.caption ?? "").slice(0, 200), data };
}
