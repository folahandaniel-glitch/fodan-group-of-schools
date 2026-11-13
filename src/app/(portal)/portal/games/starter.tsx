"use client";
import { useState } from "react";
import { startRound } from "./actions";

export function Starter({ game, level, active }: { game: string; level: string; active: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    setBusy(true); setErr("");
    const r = await startRound(game, level);
    if (r.id) window.location.href = `/portal/games/${game}?level=${level}&r=${r.id}`; else { setErr(r.error ?? "Could not start."); setBusy(false); }
  }
  return <div><button onClick={go} disabled={busy} className={`btn capitalize ${active ? "btn-primary" : "btn-ghost"}`}>{busy ? "Starting…" : `Play ${level}`}</button>{err && <p className="mt-1 text-xs text-bad">{err}</p>}</div>;
}
