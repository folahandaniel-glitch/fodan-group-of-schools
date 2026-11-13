"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { finishRound, startRound, type Finish } from "./actions";
import type { Q } from "@/lib/logic/games";

export function Player({ roundId, game, level, questions }: { roundId: string; game: string; level: string; questions: Q[] }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [res, setRes] = useState<Finish | null>(null);
  const [busy, start] = useTransition();
  const q = questions[i];

  function choose(k: number) {
    const next = [...answers, k];
    setAnswers(next);
    if (i + 1 < questions.length) { setI(i + 1); return; }
    start(async () => setRes(await finishRound(roundId, next)));
  }
  async function again() { const r = await startRound(game, level); if (r.id) window.location.href = `/portal/games/${game}?level=${level}&r=${r.id}`; }

  if (res) {
    if (res.error) return <p className="rounded-xl border border-gold-2 bg-gold-soft px-4 py-3 text-sm font-semibold">{res.error}</p>;
    return (
      <div className="text-center">
        <p className="text-5xl font-black">{res.correct}/{res.total}</p>
        <p className="mt-2 text-lg font-semibold">{res.points ? `+${res.points} reward points` : res.capped ? "Daily game points reached. Study to keep earning!" : "No points this time. Try again!"}</p>
        <ul className="mx-auto mt-4 max-w-md space-y-1 text-left text-sm">
          {questions.map((x, n) => { const ok = answers[n] === res.answers?.[n]; return <li key={n} className={ok ? "text-ok" : "text-bad"}>{ok ? "✔" : "✘"} {x.q} <b>{x.options[res.answers?.[n] ?? 0]}</b></li>; })}
        </ul>
        <div className="mt-5 flex flex-wrap justify-center gap-3"><button onClick={again} className="btn btn-primary">Play again</button><Link href="/portal/games" className="btn btn-ghost">All games</Link><Link href="/portal/study" className="btn btn-ghost">Go to Study</Link></div>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm font-semibold text-muted"><span>Question {i + 1} of {questions.length}</span><span>{level}</span></div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-paper-2"><div className="h-full bg-strong transition-all" style={{ width: `${(i / questions.length) * 100}%` }} /></div>
      <p className="mb-4 text-2xl font-bold">{q.q}</p>
      <div className="grid gap-3 sm:grid-cols-2">{q.options.map((o, k) => <button key={k} disabled={busy} onClick={() => choose(k)} className="rounded-xl border-2 border-line bg-card px-4 py-3 text-left text-lg font-semibold hover:border-strong">{o}</button>)}</div>
    </div>
  );
}
