import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, sub, actions, eyebrow }: { title: string; sub?: string; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-2xl sm:text-3xl text-ink">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "", pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <section className={`card ${pad ? "card-pad" : ""} ${className}`}>{children}</section>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "gold" | "royal" }) {
  return (
    <div className="card card-pad relative overflow-hidden">
      <span className={`absolute inset-y-0 left-0 w-1 ${tone === "royal" ? "bg-royal" : "bg-gold-2"}`} />
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Badge({ children, tone }: { children: ReactNode; tone?: "ok" | "warn" | "bad" | "info" }) {
  return <span className={`badge ${tone ? `badge-${tone}` : ""}`}>{children}</span>;
}

export function statusTone(s: string): "ok" | "warn" | "bad" | "info" | undefined {
  const v = s.toLowerCase();
  if (["approved", "published", "active", "resolved", "present", "released", "enrolled", "done", "submitted"].includes(v)) return "ok";
  if (["pending", "pending_review", "draft", "new", "late", "in_progress", "pending_review"].includes(v)) return "warn";
  if (["rejected", "suspended", "revoked", "absent", "archived", "failed", "withdrawn"].includes(v)) return "bad";
  return "info";
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-paper-2/60 p-8 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Field({ label, name, type = "text", defaultValue, required, hint, placeholder, autoComplete, min, max, step }: {
  label: string; name: string; type?: string; defaultValue?: string | number | null; required?: boolean; hint?: string; placeholder?: string; autoComplete?: string; min?: number | string; max?: number | string; step?: number | string;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}{required && <span className="text-bad"> *</span>}</label>
      <input id={name} name={name} type={type} className="input" defaultValue={defaultValue ?? undefined} required={required}
        placeholder={placeholder} autoComplete={autoComplete} min={min} max={max} step={step} aria-describedby={hint ? `${name}-h` : undefined} />
      {hint && <p id={`${name}-h`} className="hint">{hint}</p>}
    </div>
  );
}

export function TextArea({ label, name, defaultValue, rows = 4, hint, required }: { label: string; name: string; defaultValue?: string | null; rows?: number; hint?: string; required?: boolean }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}{required && <span className="text-bad"> *</span>}</label>
      <textarea id={name} name={name} rows={rows} className="textarea" defaultValue={defaultValue ?? ""} required={required} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function Select({ label, name, options, defaultValue, required, hint, allowEmpty = true }: {
  label: string; name: string; options: { value: string; label: string }[]; defaultValue?: string | null; required?: boolean; hint?: string; allowEmpty?: boolean;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}{required && <span className="text-bad"> *</span>}</label>
      <select id={name} name={name} className="select" defaultValue={defaultValue ?? ""} required={required}>
        {allowEmpty && <option value="">— Select —</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "ok" | "bad"; children: ReactNode }) {
  const cls = kind === "ok" ? "border-[#bfe0cc] bg-[#e6f4ec] text-ok" : kind === "bad" ? "border-[#f2c4bf] bg-[#fdecea] text-bad" : "border-[#c5d2fb] bg-[#e8eeff] text-royal";
  return <p role={kind === "bad" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${cls}`}>{children}</p>;
}

export function Pager({ page, pages, base }: { page: number; pages: number; base: string }) {
  if (pages <= 1) return null;
  const sep = base.includes("?") ? "&" : "?";
  return (
    <nav className="no-print mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
      {page > 1 ? <Link className="btn btn-ghost btn-sm" href={`${base}${sep}page=${page - 1}`}>← Previous</Link> : <span />}
      <span className="text-muted">Page {page} of {pages}</span>
      {page < pages ? <Link className="btn btn-ghost btn-sm" href={`${base}${sep}page=${page + 1}`}>Next →</Link> : <span />}
    </nav>
  );
}

export function Logo({ size = 48 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/api/brand/logo" alt="Fodan College International crest" width={size} height={size} style={{ height: size, width: "auto", objectFit: "contain" }} />;
}
