import { parseNumberLine, parsePoints, parseSteps, parseTable, type Diagram } from "@/lib/logic/diagram";

const COLS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];
const W = 520, H = 290;
const txt = { fontFamily: "system-ui,sans-serif", fill: "#1f2937" } as const;

function wrap(s: string, n: number): string[] { const w = s.split(" "), out: string[] = []; let cur = ""; for (const x of w) { if ((cur + " " + x).trim().length > n && cur) { out.push(cur); cur = x; } else cur = (cur + " " + x).trim(); } if (cur) out.push(cur); return out.slice(0, 3); }

function Axes({ pts, kind }: { pts: { label: string; value: number }[]; kind: "bar" | "line" }) {
  const L = 48, R = 12, T = 16, B = 46, iw = W - L - R, ih = H - T - B;
  const max = Math.max(...pts.map((p) => p.value), 1), top = Math.ceil(max / 5) * 5 || 1;
  const y = (v: number) => T + ih - (v / top) * ih;
  const slot = iw / pts.length;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);
  return (
    <g>
      {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e5e7eb" /><text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="11" {...txt}>{Number.isInteger(t) ? t : t.toFixed(1)}</text></g>)}
      <line x1={L} x2={L} y1={T} y2={T + ih} stroke="#6b7280" /><line x1={L} x2={W - R} y1={T + ih} y2={T + ih} stroke="#6b7280" />
      {kind === "bar" && pts.map((p, i) => { const bw = Math.min(56, slot * 0.6), x = L + slot * i + (slot - bw) / 2; return (
        <g key={i}><rect x={x} y={y(p.value)} width={bw} height={T + ih - y(p.value)} rx="3" fill={COLS[i % COLS.length]} /><text x={x + bw / 2} y={y(p.value) - 4} textAnchor="middle" fontSize="11" fontWeight="700" {...txt}>{p.value}</text></g>); })}
      {kind === "line" && (<>
        <polyline fill="none" stroke="#2563eb" strokeWidth="2.500" points={pts.map((p, i) => `${L + slot * i + slot / 2},${y(p.value)}`).join(" ")} />
        {pts.map((p, i) => <g key={i}><circle cx={L + slot * i + slot / 2} cy={y(p.value)} r="4" fill="#2563eb" /><text x={L + slot * i + slot / 2} y={y(p.value) - 8} textAnchor="middle" fontSize="11" fontWeight="700" {...txt}>{p.value}</text></g>)}
      </>)}
      {pts.map((p, i) => <text key={i} x={L + slot * i + slot / 2} y={T + ih + 16} textAnchor="middle" fontSize="11" {...txt}>{p.label.length > 11 ? p.label.slice(0, 10) + "…" : p.label}</text>)}
    </g>
  );
}

function Pie({ pts }: { pts: { label: string; value: number }[] }) {
  const total = pts.reduce((a, p) => a + Math.max(0, p.value), 0) || 1, cx = 150, cy = 145, r = 110;
  let a0 = -Math.PI / 2;
  return (
    <g>
      {pts.map((p, i) => {
        const frac = Math.max(0, p.value) / total, a1 = a0 + frac * Math.PI * 2;
        const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
        const d = frac >= 0.999 ? `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0` : `M${cx},${cy}L${x0},${y0}A${r},${r} 0 ${frac > 0.5 ? 1 : 0},1 ${x1},${y1}Z`;
        a0 = a1;
        return <path key={i} d={d} fill={COLS[i % COLS.length]} stroke="#fff" strokeWidth="2" />;
      })}
      {pts.map((p, i) => <g key={i}><rect x="300" y={30 + i * 22} width="14" height="14" rx="3" fill={COLS[i % COLS.length]} /><text x="322" y={42 + i * 22} fontSize="12" {...txt}>{p.label}: {p.value} ({Math.round((Math.max(0, p.value) / total) * 100)}%)</text></g>)}
    </g>
  );
}

function NumberLine({ data }: { data: string }) {
  const n = parseNumberLine(data), L = 30, iw = W - 60, y = 140, x = (v: number) => L + ((v - n.from) / (n.to - n.from)) * iw;
  const ticks: number[] = []; for (let v = n.from; v <= n.to + 1e-9; v += n.step) ticks.push(Math.round(v * 1000) / 1000);
  return (
    <g>
      <line x1={L - 12} x2={W - L + 12} y1={y} y2={y} stroke="#111827" strokeWidth="2.500" />
      <path d={`M${W - L + 12},${y}l-8,-5v10z`} fill="#111827" /><path d={`M${L - 12},${y}l8,-5v10z`} fill="#111827" />
      {ticks.map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={y - 8} y2={y + 8} stroke="#111827" /><text x={x(t)} y={y + 26} textAnchor="middle" fontSize="12" {...txt}>{t}</text></g>)}
      {n.marks.map((m) => <g key={m}><circle cx={x(m)} cy={y} r="8" fill="#dc2626" /><text x={x(m)} y={y - 18} textAnchor="middle" fontSize="13" fontWeight="800" fill="#dc2626" fontFamily="system-ui,sans-serif">{m}</text></g>)}
    </g>
  );
}

function Flow({ data }: { data: string }) {
  const s = parseSteps(data), per = 4, rows = Math.ceil(s.length / per), bw = 108, bh = 52, gx = (W - per * bw) / (per + 1);
  return (
    <g>
      {s.map((label, i) => {
        const r = Math.floor(i / per), c = i % per, x = gx + c * (bw + gx), y = 24 + r * 90;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx="10" fill="#eff6ff" stroke={COLS[i % COLS.length]} strokeWidth="2" />
            {wrap(label, 14).map((ln, k, a) => <text key={k} x={x + bw / 2} y={y + bh / 2 + 4 + (k - (a.length - 1) / 2) * 14} textAnchor="middle" fontSize="12" fontWeight="600" {...txt}>{ln}</text>)}
            {i < s.length - 1 && c < per - 1 && <path d={`M${x + bw + 4},${y + bh / 2}h${gx - 12}l-6,-5m6,5l-6,5`} stroke="#6b7280" strokeWidth="2" fill="none" />}
            {i < s.length - 1 && c === per - 1 && <path d={`M${x + bw / 2},${y + bh + 4}v${90 - bh - 8}`} stroke="#6b7280" strokeWidth="2" fill="none" strokeDasharray="4 3" />}
          </g>
        );
      })}
      <title>{rows} row flow chart</title>
    </g>
  );
}

function Cycle({ data }: { data: string }) {
  const s = parseSteps(data), cx = W / 2, cy = H / 2 + 6, rx = 190, ry = 98, bw = 118, bh = 38;
  const pos = s.map((_, i) => { const a = -Math.PI / 2 + (i / s.length) * Math.PI * 2; return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }; });
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 5" />
      {s.map((_, i) => { const t = -Math.PI / 2 + ((i + 0.5) / s.length) * Math.PI * 2, x = cx + rx * Math.cos(t), y = cy + ry * Math.sin(t), ang = (Math.atan2(ry * Math.cos(t), -rx * Math.sin(t)) * 180) / Math.PI; return <path key={i} d="M-8,-7L6,0L-8,7z" fill="#64748b" transform={`translate(${x} ${y}) rotate(${ang})`} />; })}
      {s.map((label, i) => <g key={i}><rect x={pos[i].x - bw / 2} y={pos[i].y - bh / 2} width={bw} height={bh} rx="19" fill="#fff" stroke={COLS[i % COLS.length]} strokeWidth="2.500" />
        {wrap(label, 15).map((ln, k, a) => <text key={k} x={pos[i].x} y={pos[i].y + 4 + (k - (a.length - 1) / 2) * 13} textAnchor="middle" fontSize="12" fontWeight="700" {...txt}>{ln}</text>)}</g>)}
    </g>
  );
}

function Table({ data }: { data: string }) {
  const rows = parseTable(data), cols = Math.max(...rows.map((r) => r.length), 1), cw = (W - 24) / cols, rh = 30;
  return (
    <g>
      {rows.map((r, i) => Array.from({ length: cols }, (_, c) => (
        <g key={`${i}-${c}`}><rect x={12 + c * cw} y={10 + i * rh} width={cw} height={rh} fill={i === 0 ? "#dbeafe" : i % 2 ? "#fff" : "#f8fafc"} stroke="#94a3b8" />
          <text x={12 + c * cw + 8} y={10 + i * rh + 19} fontSize="12" fontWeight={i === 0 ? 800 : 500} {...txt}>{r[c] ?? ""}</text></g>)))}
    </g>
  );
}

/** Draws a lesson-note diagram as an inline SVG. Works on screen and in print. */
export function DiagramView({ d }: { d: Diagram }) {
  const pts = d.kind === "bar" || d.kind === "line" || d.kind === "pie" ? parsePoints(d.data) : [];
  const h = d.kind === "table" ? Math.max(80, parseTable(d.data).length * 30 + 24) : d.kind === "flow" ? Math.max(100, Math.ceil(parseSteps(d.data).length / 4) * 90 + 20) : d.kind === "numberline" ? 200 : H;
  return (
    <figure className="my-3 break-inside-avoid rounded-xl border border-line bg-white p-3">
      {d.title && <figcaption className="mb-1 text-center text-sm font-bold text-ink">{d.title}</figcaption>}
      <svg viewBox={`0 0 ${W} ${h}`} role="img" aria-label={d.title || d.kind} className="mx-auto h-auto w-full max-w-xl">
        {(d.kind === "bar" || d.kind === "line") && pts.length > 0 && <Axes pts={pts} kind={d.kind} />}
        {d.kind === "pie" && pts.length > 0 && <Pie pts={pts} />}
        {d.kind === "numberline" && <NumberLine data={d.data} />}
        {d.kind === "flow" && <Flow data={d.data} />}
        {d.kind === "cycle" && <Cycle data={d.data} />}
        {d.kind === "table" && <Table data={d.data} />}
      </svg>
      {d.caption && <p className="mt-1 text-center text-xs italic text-muted">{d.caption}</p>}
    </figure>
  );
}
