"use client";
import { useEffect, useState } from "react";

export type ClockOptions = { style: "DIGITAL" | "ANALOG" | "BOTH" | "OFF"; seconds?: boolean; hour12?: boolean; label?: string };
const TZ = "Africa/Lagos";

function parts(d: Date) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23", weekday: "long", day: "numeric", month: "long", year: "numeric" }).formatToParts(d);
  const g = (t: string) => f.find((x) => x.type === t)?.value ?? "";
  return { h: Number(g("hour")), m: Number(g("minute")), s: Number(g("second")), date: `${g("weekday")}, ${g("day")} ${g("month")} ${g("year")}` };
}

function Face({ h, m, s, seconds }: { h: number; m: number; s: number; seconds: boolean }) {
  const hand = (deg: number, len: number, w: number, color: string) => <line x1="50" y1="50" x2={50 + len * Math.sin((deg * Math.PI) / 180)} y2={50 - len * Math.cos((deg * Math.PI) / 180)} stroke={color} strokeWidth={w} strokeLinecap="round" />;
  return (
    <svg viewBox="0 0 100 100" className="h-24 w-24" role="img" aria-label="Analogue clock">
      <circle cx="50" cy="50" r="47" fill="#fff" stroke="currentColor" strokeWidth="3" />
      {Array.from({ length: 12 }, (_, i) => { const a = (i * 30 * Math.PI) / 180; return <line key={i} x1={50 + 40 * Math.sin(a)} y1={50 - 40 * Math.cos(a)} x2={50 + 44 * Math.sin(a)} y2={50 - 44 * Math.cos(a)} stroke="#334155" strokeWidth={i % 3 === 0 ? 3 : 1.5} />; })}
      {hand(((h % 12) + m / 60) * 30, 24, 4, "#0b1f4b")}
      {hand((m + s / 60) * 6, 35, 3, "#0b1f4b")}
      {seconds && hand(s * 6, 38, 1.5, "#dc2626")}
      <circle cx="50" cy="50" r="3" fill="#0b1f4b" />
    </svg>
  );
}

/** A live Lagos clock for the home page: digital, analogue or both. */
export function LiveClock({ o, className = "" }: { o: ClockOptions; className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  if (o.style === "OFF") return null;
  const p = now ? parts(now) : null;
  const two = (n: number) => String(n).padStart(2, "0");
  const hh = p ? (o.hour12 ? ((p.h + 11) % 12) + 1 : p.h) : 0;
  const digital = p ? `${two(hh)}:${two(p.m)}${o.seconds !== false ? `:${two(p.s)}` : ""}${o.hour12 ? (p.h >= 12 ? " PM" : " AM") : ""}` : "--:--";
  return (
    <div className={`rounded-2xl border border-line bg-white px-4 py-3 text-ink shadow-lg ${className}`} role="timer" aria-label="Current time in Lagos">
      <div className="flex items-center gap-3">
        {(o.style === "ANALOG" || o.style === "BOTH") && <Face h={p?.h ?? 0} m={p?.m ?? 0} s={p?.s ?? 0} seconds={o.seconds !== false} />}
        {(o.style === "DIGITAL" || o.style === "BOTH") && <div><p className="font-mono text-2xl font-bold leading-none tabular-nums">{digital}</p><p className="mt-1 text-xs text-muted">{p?.date ?? ""}</p></div>}
      </div>
      <p className="mt-1 text-center text-[0.65rem] font-bold uppercase tracking-widest text-muted">{o.label || "Lagos time"}</p>
    </div>
  );
}
