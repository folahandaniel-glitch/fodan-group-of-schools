"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MathText } from "./math-text";

type View = {
  attemptId: string; title: string; kind: string; instructions: string; status: string; deadline: number; serverNow: number;
  answers: Record<string, string>; flags: string[]; score: number | null; maxScore: number | null;
  questions: { n: number; id: string; text: string; options: { key: string; label: string; text: string }[] }[];
};

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${h > 0 ? h + ":" : ""}${String(m).padStart(h > 0 ? 2 : 1, "0")}:${String(x).padStart(2, "0")}`;
};

export function CbtRunner({ attemptId, backHref, showScore }: { attemptId: string; backHref: string; showScore: boolean }) {
  const [v, setV] = useState<View | null>(null);
  const [err, setErr] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const [review, setReview] = useState(false);
  const [left, setLeft] = useState(0);
  const [net, setNet] = useState<"saved" | "saving" | "offline">("saved");
  const [done, setDone] = useState<{ score: number | null; max: number | null } | null>(null);
  const offset = useRef(0);
  const dirty = useRef(false);
  const submitting = useRef(false);
  const key = `fgs-attempt-${attemptId}`;

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/cbt/${attemptId}`, { cache: "no-store" });
      if (!r.ok) return setErr("This examination is not available.");
      const d: View = await r.json();
      offset.current = d.serverNow - Date.now();
      let local: { a: Record<string, string>; f: string[] } | null = null;
      try { local = JSON.parse(localStorage.getItem(key) || "null"); } catch { /* ignore */ }
      setV(d);
      setAnswers({ ...d.answers, ...(local?.a ?? {}) });
      setFlags(local?.f ?? d.flags);
      if (d.status === "submitted") setDone({ score: d.score, max: d.maxScore });
    })().catch(() => setErr("Network error. Check your connection and refresh."));
  }, [attemptId, key]);

  const push = useCallback(async (a: Record<string, string>, f: string[]) => {
    try {
      setNet("saving");
      const r = await fetch(`/api/cbt/${attemptId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: a, flags: f }) });
      const j = await r.json();
      if (j.expired) { location.reload(); return; }
      setNet("saved");
      dirty.current = false;
    } catch {
      setNet("offline");
    }
  }, [attemptId]);

  const submit = useCallback(async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const r = await fetch(`/api/cbt/${attemptId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit", answers, flags }) });
      const j = await r.json();
      try { localStorage.removeItem(key); } catch { /* ignore */ }
      setDone({ score: j.score, max: j.maxScore });
    } catch {
      submitting.current = false;
      setNet("offline");
      setErr("Could not submit — your answers are saved on this device. Reconnect and press Submit again.");
    }
  }, [attemptId, answers, flags, key]);

  // Persist locally on every change; debounce to server.
  useEffect(() => {
    if (!v || done) return;
    try { localStorage.setItem(key, JSON.stringify({ a: answers, f: flags })); } catch { /* ignore */ }
    dirty.current = true;
    const t = setTimeout(() => push(answers, flags), 1200);
    return () => clearTimeout(t);
  }, [answers, flags, v, done, key, push]);

  // Periodic retry (network recovery) and server-synced countdown with auto-submit.
  useEffect(() => {
    if (!v || done) return;
    const tick = setInterval(() => {
      const remaining = v.deadline - (Date.now() + offset.current);
      setLeft(remaining);
      if (remaining <= 0) submit();
    }, 500);
    const retry = setInterval(() => { if (dirty.current) push(answers, flags); }, 15000);
    return () => { clearInterval(tick); clearInterval(retry); };
  }, [v, done, answers, flags, push, submit]);

  if (err && !v) return <p role="alert" className="p-6 font-semibold text-bad">{err}</p>;
  if (!v) return <p className="p-6 text-muted">Loading examination…</p>;

  if (done) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="eyebrow">Submitted</p>
        <h1 className="mt-1 text-3xl">{v.title}</h1>
        <div className="rule-gold mx-auto mt-3" />
        {showScore && done.score !== null && done.max ? (
          <p className="mt-6 font-display text-6xl text-ink">{done.score}<span className="text-2xl text-muted"> / {done.max}</span></p>
        ) : (
          <p className="mt-6 text-ink-2">Your answers have been recorded. Your result will be released according to school policy.</p>
        )}
        <Link href={backHref} className="btn btn-primary mt-8">Back to my work</Link>
      </div>
    );
  }

  const q = v.questions[i];
  const answered = Object.keys(answers).length;
  const low = left < 5 * 60_000;

  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3">
        <div><p className="eyebrow">{v.kind.toUpperCase()}</p><h1 className="text-xl">{v.title}</h1></div>
        <div className="flex items-center gap-3">
          <span className={`badge ${net === "offline" ? "badge-bad" : net === "saving" ? "badge-warn" : "badge-ok"}`} aria-live="polite">
            {net === "offline" ? "Offline — saved on device" : net === "saving" ? "Saving…" : "Saved"}
          </span>
          <span role="timer" aria-label="Time remaining" className={`rounded-xl px-3 py-1.5 font-mono text-lg font-bold ${low ? "bg-[#fdecea] text-bad" : "bg-paper-2 text-ink"}`}>{fmt(left)}</span>
        </div>
      </div>

      {review ? (
        <section className="card card-pad">
          <h2 className="text-xl">Review your answers</h2>
          <p className="mt-1 text-sm text-muted">{answered} of {v.questions.length} answered{flags.length ? ` · ${flags.length} flagged` : ""}.</p>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {v.questions.map((x, idx) => (
              <li key={x.id}>
                <button onClick={() => { setI(idx); setReview(false); }} className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold ${answers[x.id] ? "border-ok bg-[#e6f4ec]" : "border-line bg-white"}`}>
                  Question {x.n}{flags.includes(x.id) ? " 🚩" : ""}<span className="block text-xs font-normal text-muted">{answers[x.id] ? "Answered" : "Not answered"}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn btn-ghost" onClick={() => setReview(false)}>Back to questions</button>
            <button className="btn btn-gold" onClick={() => { if (confirm(`Submit now? ${v.questions.length - answered} question(s) are unanswered.`)) submit(); }}>Submit examination</button>
          </div>
          {err && <p role="alert" className="mt-3 text-sm font-semibold text-bad">{err}</p>}
        </section>
      ) : (
        <section className="card card-pad">
          <p className="text-sm font-bold text-muted">Question {q.n} of {v.questions.length}</p>
          <div className="mt-2 text-lg leading-relaxed"><MathText text={q.text} /></div>
          <fieldset className="mt-5 space-y-2">
            <legend className="sr-only">Choose one answer</legend>
            {q.options.map((o) => {
              const sel = answers[q.id] === o.key;
              return (
                <label key={o.key} className={`flex min-h-[48px] cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 ${sel ? "border-royal bg-[#e8eeff]" : "border-line bg-white hover:border-ink-2"}`}>
                  <input type="radio" name={`q-${q.id}`} className="mt-1" checked={sel} onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.key }))} />
                  <span><b className="mr-2">{o.label}.</b><MathText text={o.text} /></span>
                </label>
              );
            })}
          </fieldset>
          <div className="mt-6 flex flex-wrap gap-2">
            <button className="btn btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</button>
            <button className="btn btn-ghost" disabled={i === v.questions.length - 1} onClick={() => setI(i + 1)}>Next</button>
            <button className="btn btn-ghost" onClick={() => setAnswers((a) => { const n = { ...a }; delete n[q.id]; return n; })}>Clear answer</button>
            <button className="btn btn-ghost" aria-pressed={flags.includes(q.id)} onClick={() => setFlags((f) => f.includes(q.id) ? f.filter((x) => x !== q.id) : [...f, q.id])}>
              {flags.includes(q.id) ? "Unflag" : "Flag for review"}
            </button>
            <button className="btn btn-primary ml-auto" onClick={() => setReview(true)}>Review &amp; submit</button>
          </div>
        </section>
      )}

      <aside className="card card-pad h-fit" aria-label="Question palette">
        <p className="text-sm font-bold">Question palette</p>
        <ul className="mt-3 grid grid-cols-5 gap-2">
          {v.questions.map((x, idx) => (
            <li key={x.id}>
              <button onClick={() => { setI(idx); setReview(false); }} aria-label={`Question ${x.n}${answers[x.id] ? ", answered" : ""}${flags.includes(x.id) ? ", flagged" : ""}`}
                className={`h-10 w-full rounded-lg border text-sm font-bold ${idx === i && !review ? "ring-2 ring-royal-2" : ""} ${flags.includes(x.id) ? "border-gold-2 bg-gold-soft" : answers[x.id] ? "border-ok bg-[#e6f4ec] text-ok" : "border-line bg-white"}`}>
                {x.n}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Green answered · Gold flagged · White unanswered</p>
        {v.instructions && <p className="mt-4 border-t border-line pt-3 text-xs text-ink-2">{v.instructions}</p>}
      </aside>
    </div>
  );
}
