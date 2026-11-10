"use client";
import { useEffect, useRef, useState } from "react";

export type ThemeChoice = { id: string; name: string; swatch: [string, string, string] };

export function ThemePicker({ themes, fallback }: { themes: ThemeChoice[]; fallback: string }) {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(fallback);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCur(document.documentElement.dataset.theme || fallback);
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [fallback]);

  function pick(id: string) {
    document.documentElement.dataset.theme = id;
    document.cookie = `fodan_theme=${id}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setCur(id);
    setOpen(false);
  }

  return (
    <div ref={box} className="relative no-print">
      <button type="button" className="btn btn-ghost btn-sm" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden>◐</span><span className="hidden sm:inline">Theme</span>
      </button>
      {open && (
        <div className="theme-pop" role="radiogroup" aria-label="Choose a colour theme">
          {themes.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={cur === t.id} className="theme-opt" onClick={() => pick(t.id)}>
              <span className="theme-dots" aria-hidden>{t.swatch.map((c, i) => <i key={i} style={{ background: c }} />)}</span>
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
