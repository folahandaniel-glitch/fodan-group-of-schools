"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Rotating notice strip (WorkSuite): auto-advances, pauses on hover/focus, manual arrows. */
export function AnnouncementBanner({ items }: { items: { id: string; title: string }[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [paused, items.length]);
  const cur = items[i % items.length];
  return (
    <div role="region" aria-label="Announcements" className="no-print border-b border-line bg-gold-soft/50 px-4 py-1.5 text-sm"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <span className="badge badge-warn">Notice</span>
        <Link href="/portal/announcements" className="min-w-0 flex-1 truncate font-semibold hover:underline" aria-live="polite">{cur.title}</Link>
        {items.length > 1 && (
          <span className="flex items-center gap-1">
            <button className="rounded px-2 py-0.5 hover:bg-white" aria-label="Previous announcement" onClick={() => setI((x) => (x - 1 + items.length) % items.length)}>‹</button>
            <span className="text-xs text-muted">{(i % items.length) + 1}/{items.length}</span>
            <button className="rounded px-2 py-0.5 hover:bg-white" aria-label="Next announcement" onClick={() => setI((x) => (x + 1) % items.length)}>›</button>
          </span>
        )}
      </div>
    </div>
  );
}
