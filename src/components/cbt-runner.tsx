"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MathText } from "./math-text";

type View = {
  attemptId: string; title: string; kind: string; instructions: string; status: string; deadline: number; serverNow: number;
  subject: string; candidate: string; regNo: string; violations: number; maxAttempts: number;
  features: { fullscreen: boolean; antiCopy: boolean; calculator: boolean };
  answers: Record<string, string>; flags: string[]; score: number | null; maxScore: number | null;
  questions: { n: number; id: string; text: string; options: { key: string; label: string; text: string }[] }[];
};
type Done = { score: number | null; max: number | null; reason?: string };

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`;
};

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
const fsSupported = () => typeof document !== "undefined" && !!(document.documentElement.requestFullscreen || (document.documentElement as FsEl).webkitRequestFullscreen);
const inFs = () => !!(document.fullscreenElement || (document as FsDoc).webkitFullscreenElement);
async function enterFs() { try { const el = document.documentElement as FsEl; if (el.requestFullscreen) await el.requestFullscreen(); else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen(); } catch { /* the browser refused */ } }
async function leaveFs() { try { if (document.exitFullscreen && document.fullscreenElement) await document.exitFullscreen(); else if ((document as FsDoc).webkitExitFullscreen && inFs()) await (document as FsDoc).webkitExitFullscreen!(); } catch { /* ignore */ } }

function Calculator({ onClose }: { onClose: () => void }) {
  const [disp, setDisp] = useState("0"), [acc, setAcc] = useState<number | null>(null), [op, setOp] = useState<string | null>(null), [fresh, setFresh] = useState(true);
  const num = (d: string) => { setDisp((x) => (fresh || x === "0" ? (d === "." ? "0." : d) : d === "." && x.includes(".") ? x : x + d)); setFresh(false); };
  const calc = (a: number, b: number, o: string) => (o === "+" ? a + b : o === "-" ? a - b : o === "×" ? a * b : o === "÷" ? (b === 0 ? NaN : a / b) : b);
  const press = (o: string) => { const cur = parseFloat(disp); const r = acc !== null && op && !fresh ? calc(acc, cur, op) : cur; setAcc(o === "=" ? null : r); setOp(o === "=" ? null : o); setDisp(Number.isFinite(r) ? String(Math.round(r * 1e9) / 1e9) : "Error"); setFresh(true); };
  const keys = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "0", ".", "=", "+"];
  return (
    <div className="fixed bottom-4 right-4 z-40 w-60 rounded-2xl border-2 border-ink bg-card p-3 shadow-2xl" role="dialog" aria-label="Calculator">
      <div className="mb-2 flex items-center justify-between text-xs font-bold"><span>Calculator</span><button onClick={onClose} aria-label="Close calculator" className="px-2">✕</button></div>
      <div className="mb-2 overflow-hidden rounded-lg bg-ink px-3 py-2 text-right font-mono text-xl text-white">{disp}</div>
      <div className="grid grid-cols-4 gap-1.5">
        <button className="btn btn-danger btn-sm col-span-2" onClick={() => { setDisp("0"); setAcc(null); setOp(null); setFresh(true); }}>Clear</button>
        <button className="btn btn-ghost btn-sm col-span-2" onClick={() => setDisp((x) => (x.length > 1 ? x.slice(0, -1) : "0"))}>⌫</button>
        {keys.map((k) => <button key={k} className={`btn btn-sm ${/[÷×\-+=]/.test(k) ? "btn-primary" : "btn-ghost"}`} onClick={() => (/[0-9.]/.test(k) ? num(k) : press(k))}>{k}</button>)}
      </div>
    </div>
  );
}

export function CbtRunner({ attemptId, backHref, showScore }: { attemptId: string; backHref: string; showScore: boolean }) {
  const [v, setV] = useState<View | null>(null);
  const [err, setErr] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const [review, setReview] = useState(false);
  const [left, setLeft] = useState(0);
  const [net, setNet] = useState<"saved" | "saving" | "offline">("saved");
  const [done, setDone] = useState<Done | null>(null);
  const [started, setStarted] = useState(false);
  const [warn, setWarn] = useState<number | null>(null);
  const [calc, setCalc] = useState(false);
  const [font, setFont] = useState(18);
  const [canFs, setCanFs] = useState(true);
  const [hint, setHint] = useState("");
  const offset = useRef(0), dirty = useRef(false), submitting = useRef(false), lastViolation = useRef(0), cid = useRef("");
  const ans = useRef(answers), fl = useRef(flags);
  const warnRef = useRef<number | null>(null);
  warnRef.current = warn;
  ans.current = answers; fl.current = flags;
  const key = `fgs-attempt-${attemptId}`;

  useEffect(() => { cid.current = Math.random().toString(36).slice(2) + Date.now().toString(36); setCanFs(fsSupported()); }, []);

  useEffect(() => {
    (async () => {
      await new Promise((r) => setTimeout(r, 30));
      const r = await fetch(`/api/cbt/${attemptId}?cid=${cid.current}`, { cache: "no-store" });
      if (r.status === 409) return setErr("This exam is already open in another window or device. Close it there, wait 20 seconds and refresh.");
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
      const r = await fetch(`/api/cbt/${attemptId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: a, flags: f, cid: cid.current }) });
      if (r.status === 409) { setErr("This exam was opened in another window. This one is now closed."); return; }
      const j = await r.json();
      if (j.expired) { location.reload(); return; }
      setNet("saved");
      dirty.current = false;
    } catch { setNet("offline"); }
  }, [attemptId]);

  const finish = useCallback((d: Done) => { try { localStorage.removeItem(key); } catch { /* ignore */ } leaveFs(); setDone(d); }, [key]);

  const submit = useCallback(async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const r = await fetch(`/api/cbt/${attemptId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit", answers: ans.current, flags: fl.current, cid: cid.current }) });
      const j = await r.json();
      finish({ score: j.score, max: j.maxScore, reason: "student" });
    } catch {
      submitting.current = false;
      setNet("offline");
      setErr("Could not submit. Your answers are saved on this device. Reconnect and press Submit again.");
    }
  }, [attemptId, finish]);

  /** One full-screen exit, tab switch or app switch. The server counts it and submits at the limit. */
  const violation = useCallback(async (type: string) => {
    if (submitting.current) return;
    const now = Date.now();
    if (now - lastViolation.current < 1500) return;
    lastViolation.current = now;
    try {
      const r = await fetch(`/api/cbt/${attemptId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "violation", type, answers: ans.current, flags: fl.current, cid: cid.current }) });
      const j = await r.json();
      if (j.submitted) { submitting.current = true; finish({ score: j.score, max: j.maxScore, reason: "violation" }); }
      else setWarn(j.violations ?? 1);
    } catch { setWarn((w) => (w ?? 0) + 1); }
  }, [attemptId, finish]);

  // Local autosave, debounce to server.
  useEffect(() => {
    if (!v || done) return;
    try { localStorage.setItem(key, JSON.stringify({ a: answers, f: flags })); } catch { /* ignore */ }
    dirty.current = true;
    const t = setTimeout(() => push(answers, flags), 1200);
    return () => clearTimeout(t);
  }, [answers, flags, v, done, key, push]);

  // Countdown from the server clock, heartbeat, retry.
  useEffect(() => {
    if (!v || done) return;
    const tick = setInterval(() => { const rem = v.deadline - (Date.now() + offset.current); setLeft(rem); if (rem <= 0) submit(); }, 500);
    const beat = setInterval(() => push(ans.current, fl.current), 10000);
    return () => { clearInterval(tick); clearInterval(beat); };
  }, [v, done, push, submit]);

  // Integrity watch: only while the exam is running.
  useEffect(() => {
    if (!v || done || !started) return;
    const useFs = v.features.fullscreen && canFs;
    const onFs = () => { if (useFs && !inFs() && warnRef.current === null) violation("fullscreen"); };
    const onVis = () => { if (document.hidden && v.features.fullscreen) violation("hidden"); };
    let blurTimer: ReturnType<typeof setTimeout> | null = null;
    const onBlur = () => { if (!v.features.fullscreen) return; setHint("Keep this window in front."); blurTimer = setTimeout(() => violation("blur"), 1500); };
    const onFocus = () => { if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; } setTimeout(() => setHint(""), 1500); };
    const touch = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0 && !canFs;
    const devtools = () => { if (useFs && inFs() && !touch && (Math.abs(window.outerHeight - window.innerHeight) > 200 || Math.abs(window.outerWidth - window.innerWidth) > 200)) violation("devtools"); };
    const noop = (e: Event) => { if (v.features.antiCopy) e.preventDefault(); };
    const onKey = (e: KeyboardEvent) => {
      if (!v.features.antiCopy) return;
      const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
      if (k === "f12" || k === "printscreen" || (mod && ["c", "v", "x", "a", "p", "s", "u"].includes(k)) || (mod && e.shiftKey && ["i", "j", "c"].includes(k)) || (e.altKey && k === "tab")) e.preventDefault();
      if (k === "printscreen") { try { navigator.clipboard?.writeText(""); } catch { /* ignore */ } }
    };
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const onPop = () => history.pushState(null, "", location.href);
    history.pushState(null, "", location.href);
    const watch = setInterval(() => { if (useFs && !inFs() && warnRef.current === null) violation("fullscreen"); else if (warnRef.current === null) devtools(); }, 2000);
    document.addEventListener("fullscreenchange", onFs); document.addEventListener("webkitfullscreenchange", onFs);
    document.addEventListener("visibilitychange", onVis); window.addEventListener("blur", onBlur); window.addEventListener("focus", onFocus);
    for (const t of ["contextmenu", "copy", "cut", "paste", "dragstart", "selectstart"]) document.addEventListener(t, noop);
    document.addEventListener("keydown", onKey); window.addEventListener("beforeunload", onUnload); window.addEventListener("popstate", onPop);
    return () => {
      clearInterval(watch);
      document.removeEventListener("fullscreenchange", onFs); document.removeEventListener("webkitfullscreenchange", onFs);
      document.removeEventListener("visibilitychange", onVis); window.removeEventListener("blur", onBlur); window.removeEventListener("focus", onFocus); if (blurTimer) clearTimeout(blurTimer);
      for (const t of ["contextmenu", "copy", "cut", "paste", "dragstart", "selectstart"]) document.removeEventListener(t, noop);
      document.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", onUnload); window.removeEventListener("popstate", onPop);
    };
  }, [v, done, started, canFs, violation]);

  if (err && !v) return <p role="alert" className="p-6 font-semibold text-bad">{err}</p>;
  if (!v) return <p className="p-6 text-muted">Loading examination…</p>;

  if (done) {
    const show = (showScore || done.reason === "violation") && done.score !== null && done.max;
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="eyebrow">{done.reason === "violation" ? "Submitted automatically" : "Submitted"}</p>
        <h1 className="mt-1 text-3xl">{v.title}</h1>
        <div className="rule-gold mx-auto mt-3" />
        {done.reason === "violation" && <p className="mt-4 rounded-xl border border-bad bg-[#fdecea] px-4 py-3 text-sm font-semibold text-bad">You left full screen too many times, so the exam was submitted and marked. The school has been told.</p>}
        {show ? <p className="mt-6 font-display text-6xl text-ink">{done.score}<span className="text-2xl text-muted"> / {done.max}</span></p>
          : <p className="mt-6 text-ink-2">Your answers have been recorded. Your result will be released according to school policy.</p>}
        <Link href={backHref} className="btn btn-primary mt-8">Back to my work</Link>
      </div>
    );
  }

  const q = v.questions[i];
  const answered = Object.keys(answers).length;
  const low = left < 5 * 60_000;
  const secure = v.features.fullscreen;

  if (!started) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <div className="card card-pad">
          <p className="eyebrow">{v.kind.toUpperCase()} · {v.subject}</p>
          <h1 className="mt-1 text-3xl">{v.title}</h1>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted">Candidate</dt><dd className="font-bold">{v.candidate}</dd></div><div><dt className="text-muted">Registration number</dt><dd className="font-bold">{v.regNo}</dd></div>
            <div><dt className="text-muted">Questions</dt><dd className="font-bold">{v.questions.length}</dd></div><div><dt className="text-muted">Time remaining</dt><dd className="font-mono font-bold">{fmt(Math.max(0, v.deadline - (Date.now() + offset.current)))}</dd></div></dl>
          {v.instructions && <p className="mt-4 text-sm text-ink-2">{v.instructions}</p>}
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
            <li>Choose one answer for each question. You can change it any time before you submit.</li>
            <li>Use the question numbers on the right to move around. Flag a question to come back to it.</li>
            <li>Your answers save automatically. The exam submits itself when the time ends.</li>
            {secure && canFs && <li className="font-bold text-bad">The exam runs in full screen. If you leave full screen you get a warning. The {v.maxAttempts === 2 ? "second" : `${v.maxAttempts}th`} time, the exam is submitted and marked immediately.</li>}
            {secure && !canFs && <li className="font-bold text-bad">This device cannot lock full screen, so switching to another app or tab counts as leaving. The {v.maxAttempts === 2 ? "second" : `${v.maxAttempts}th`} time, the exam is submitted and marked immediately.</li>}
          </ul>
          {v.violations > 0 && <p className="mt-3 rounded-lg bg-gold-soft px-3 py-2 text-sm font-semibold">You already have {v.violations} warning{v.violations === 1 ? "" : "s"} on this exam.</p>}
          <button className="btn btn-primary mt-6 w-full" onClick={async () => { if (secure && canFs) await enterFs(); setStarted(true); }}>{secure && canFs ? "Start exam in full screen" : "Start exam"}</button>
          {err && <p role="alert" className="mt-3 text-sm font-semibold text-bad">{err}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`exam-shell mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_290px] ${v.features.antiCopy ? "select-none" : ""}`} style={{ fontSize: font }}>
      <style>{`@media print { body * { display: none !important; } }`}</style>
      <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3">
        <div className="min-w-0"><p className="eyebrow">{v.kind.toUpperCase()} · {v.subject}</p><h1 className="truncate text-xl">{v.title}</h1><p className="text-xs text-muted">{v.candidate} · {v.regNo}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${(warn ?? v.violations) > 0 ? "badge-bad" : "badge-ok"}`} aria-live="polite" title="Exam security status">{(warn ?? v.violations) > 0 ? `⚠ Warning ${warn ?? v.violations} of ${v.maxAttempts}` : "🔒 Secure"}</span>
          <span className={`badge ${net === "offline" ? "badge-bad" : net === "saving" ? "badge-warn" : "badge-ok"}`} aria-live="polite">{net === "offline" ? "Offline: saved on device" : net === "saving" ? "Saving…" : "Saved"}</span>
          <span role="timer" aria-label="Time remaining" className={`rounded-xl px-3 py-1.5 font-mono text-lg font-bold ${low ? "bg-[#fdecea] text-bad" : "bg-paper-2 text-ink"}`}>{fmt(left)}</span>
        </div>
      </div>
      {hint && <p role="status" className="lg:col-span-2 rounded-xl bg-gold-soft px-4 py-2 text-center text-sm font-semibold">{hint}</p>}
      {left > 0 && left < 60_000 && <p role="alert" className="lg:col-span-2 rounded-xl bg-[#fdecea] px-4 py-2 text-center text-sm font-bold text-bad">Less than one minute left. Your exam will submit automatically.</p>}
      {left >= 60_000 && left < 5 * 60_000 && <p role="status" className="lg:col-span-2 rounded-xl bg-gold-soft px-4 py-2 text-center text-sm font-bold">Five minutes or less remaining.</p>}

      {review ? (
        <section className="card card-pad">
          <h2 className="text-xl">Review your answers</h2>
          <p className="mt-1 text-sm text-muted">{answered} of {v.questions.length} answered{flags.length ? ` · ${flags.length} flagged` : ""}.</p>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {v.questions.map((x, idx) => (
              <li key={x.id}><button onClick={() => { setI(idx); setReview(false); }} className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold ${answers[x.id] ? "border-ok bg-[#e6f4ec]" : "border-line bg-card"}`}>
                Question {x.n}{flags.includes(x.id) ? " 🚩" : ""}<span className="block text-xs font-normal text-muted">{answers[x.id] ? "Answered" : "Not answered"}</span></button></li>))}
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
          <div className="mt-2 leading-relaxed"><MathText text={q.text} /></div>
          <fieldset className="mt-5 space-y-2">
            <legend className="sr-only">Choose one answer</legend>
            {q.options.map((o) => {
              const sel = answers[q.id] === o.key;
              return (
                <label key={o.key} className={`flex min-h-[48px] cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 ${sel ? "border-royal bg-[#e8eeff]" : "border-line bg-card hover:border-ink-2"}`}>
                  <input type="radio" name={`q-${q.id}`} className="mt-1.5" checked={sel} onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.key }))} />
                  <span><b className="mr-2">{o.label}.</b><MathText text={o.text} /></span>
                </label>
              );
            })}
          </fieldset>
          <div className="mt-6 flex flex-wrap gap-2">
            <button className="btn btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</button>
            <button className="btn btn-ghost" disabled={i === v.questions.length - 1} onClick={() => setI(i + 1)}>Next</button>
            <button className="btn btn-ghost" onClick={() => setAnswers((a) => { const n = { ...a }; delete n[q.id]; return n; })}>Clear</button>
            <button className="btn btn-ghost" aria-pressed={flags.includes(q.id)} onClick={() => setFlags((f) => f.includes(q.id) ? f.filter((x) => x !== q.id) : [...f, q.id])}>{flags.includes(q.id) ? "Unflag" : "Flag"}</button>
            <button className="btn btn-primary ml-auto" onClick={() => setReview(true)}>Review &amp; submit</button>
          </div>
        </section>
      )}

      <aside className="card card-pad h-fit" aria-label="Question palette">
        <p className="text-sm font-bold">Questions</p>
        <ul className="mt-3 grid grid-cols-5 gap-2">
          {v.questions.map((x, idx) => (
            <li key={x.id}><button onClick={() => { setI(idx); setReview(false); }} aria-label={`Question ${x.n}${answers[x.id] ? ", answered" : ""}${flags.includes(x.id) ? ", flagged" : ""}`}
              className={`h-10 w-full rounded-lg border text-sm font-bold ${idx === i && !review ? "ring-2 ring-royal-2" : ""} ${flags.includes(x.id) ? "border-gold-2 bg-gold-soft" : answers[x.id] ? "border-ok bg-[#e6f4ec] text-ok" : "border-line bg-card"}`}>{x.n}</button></li>))}
        </ul>
        <p className="mt-3 text-xs text-muted">Green answered · Gold flagged · White unanswered</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {v.features.calculator && <button className="btn btn-ghost btn-sm" onClick={() => setCalc((c) => !c)} aria-pressed={calc}>Calculator</button>}
          {v.features.calculator && <><button className="btn btn-ghost btn-sm" onClick={() => setFont((f) => Math.max(14, f - 2))} aria-label="Smaller text">A−</button><button className="btn btn-ghost btn-sm" onClick={() => setFont((f) => Math.min(26, f + 2))} aria-label="Larger text">A+</button></>}
        </div>
        {v.instructions && <p className="mt-4 border-t border-line pt-3 text-xs text-ink-2">{v.instructions}</p>}
      </aside>

      {calc && v.features.calculator && <Calculator onClose={() => setCalc(false)} />}

      {warn !== null && !done && (
        <div role="alertdialog" aria-modal="true" aria-label="Warning" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-md rounded-2xl bg-card p-6 text-center">
            <p className="text-5xl" aria-hidden>⚠️</p>
            <h2 className="mt-2 text-2xl text-bad">Warning {warn} of {v.maxAttempts}</h2>
            <p className="mt-2 text-sm">You left the exam screen. {warn >= v.maxAttempts - 1 ? "The next time, your exam will be submitted and marked immediately." : "Stay on the exam screen."}</p>
            <button className="btn btn-primary mt-5 w-full" onClick={async () => { if (v.features.fullscreen && canFs) await enterFs(); setWarn(null); }}>{canFs ? "Return to full screen and continue" : "Continue"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
