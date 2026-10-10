"use client";
import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "fgs-install-dismissed";

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [mode, setMode] = useState<"hidden" | "native" | "ios">("hidden");

  useEffect(() => {
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("/sw.js").catch(() => {});
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (standalone) return;
    try {
      const t = Number(localStorage.getItem(KEY) || 0);
      if (Date.now() - t < 14 * 86400_000) return;
    } catch { /* storage unavailable */ }
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const onBip = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setTimeout(() => setMode("native"), 6000);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    let t: ReturnType<typeof setTimeout> | undefined;
    if (ios) t = setTimeout(() => setMode("ios"), 8000);
    return () => { window.removeEventListener("beforeinstallprompt", onBip); if (t) clearTimeout(t); };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ }
    setMode("hidden");
  };
  if (mode === "hidden") return null;

  return (
    <div role="dialog" aria-label="Install Fodan Group of Schools Portal"
      className="no-print fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-line bg-white p-4 shadow-2xl">
      <p className="font-display text-lg text-ink">Install Fodan Group of Schools Portal</p>
      <p className="mt-1 text-sm text-muted">
        {mode === "native"
          ? "Use the portal like an app — faster to open, full screen, and always one tap away."
          : "On iPhone or iPad: tap the Share button in Safari, then choose “Add to Home Screen”."}
      </p>
      <div className="mt-3 flex gap-2">
        {mode === "native" && (
          <button className="btn btn-primary btn-sm" onClick={async () => { await evt?.prompt(); await evt?.userChoice; dismiss(); }}>Install</button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={dismiss}>Not now</button>
      </div>
    </div>
  );
}
