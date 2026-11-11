"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clock, submitClockNotice, type ClockResult } from "@/app/(portal)/portal/clock/actions";

type State = "none" | "in" | "out";
export type ClockNotice = { kind: string; reason: string; status?: string } | null;

/** Header button: "Clock in" before you clock in, "Clock out" after, then a done state. Opens a popup with the clock button and a form to explain lateness or absence. */
export function ClockPopup({ initial, notice, branch, radius, clockedAt }: { initial: State; notice: ClockNotice; branch: string | null; radius: number | null; clockedAt: string | null }) {
  const [state, setState] = useState<State>(initial);
  const [saved, setSaved] = useState<ClockNotice>(notice);
  const [msg, setMsg] = useState<ClockResult>({});
  const [nmsg, setNmsg] = useState<ClockResult>({});
  const [kind, setKind] = useState("late");
  const [reason, setReason] = useState(notice?.reason ?? "");
  const [pending, start] = useTransition();
  const [npending, nstart] = useTransition();
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => setState(initial), [initial]);

  const open = () => { setMsg({}); setNmsg({}); ref.current?.showModal(); };
  const close = () => ref.current?.close();

  const go = () => {
    const kindNow = state === "in" ? "out" : "in";
    setMsg({});
    if (!navigator.geolocation) return setMsg({ error: "This device cannot provide a location." });
    navigator.geolocation.getCurrentPosition(
      (pos) => start(async () => {
        const r = await clock(kindNow, pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        setMsg(r);
        if (r.state) { setState(r.state); router.refresh(); }
      }),
      () => setMsg({ error: "Location permission was denied. Allow location for this site and try again." }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const send = () => nstart(async () => {
    const r = await submitClockNotice(kind, reason);
    setNmsg(r);
    if (r.ok) { setSaved({ kind, reason, status: "pending" }); router.refresh(); }
  });

  const label = state === "none" ? "Clock in" : state === "in" ? "Clock out" : "Clocked out ✓";
  return (
    <>
      <button type="button" onClick={open} className={`btn btn-sm ${state === "none" ? "btn-gold" : state === "in" ? "btn-primary" : "btn-ghost"}`} aria-haspopup="dialog">
        <span aria-hidden>⏱</span> {label}
      </button>
      <dialog ref={ref} aria-labelledby="clock-title" className="m-auto w-[min(30rem,94vw)] rounded-2xl border border-line bg-card p-0 text-ink shadow-2xl backdrop:bg-black/50"
        onClick={(e) => { if (e.target === ref.current) close(); }}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div><h2 id="clock-title" className="text-xl">Clock in / out</h2>
              <p className="text-sm text-muted">{branch ? `Branch: ${branch}${radius ? ` · within ${radius} m` : ""}` : "You have not been assigned to a branch yet."}</p></div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={close} aria-label="Close">✕</button>
          </div>

          <div className="mt-4">
            {state === "out" ? (
              <p className="rounded-xl bg-paper-2 p-3 text-sm font-semibold">You have clocked in and out for today{clockedAt ? ` (in at ${clockedAt})` : ""}. Thank you.</p>
            ) : (
              <button type="button" onClick={go} disabled={pending} className={`btn w-full !min-h-14 text-lg ${state === "none" ? "btn-gold" : "btn-primary"}`}>
                {pending ? "Checking your location…" : state === "none" ? "Clock in" : "Clock out"}
              </button>
            )}
            <p className="mt-2 min-h-5 text-sm font-semibold" role="status">{msg.error ? <span className="text-bad">{msg.error}</span> : msg.ok ? <span className="text-ok">{msg.ok}</span> : null}</p>
          </div>

          {state === "none" && (
            <div className="mt-3 border-t border-line pt-4">
              <h3 className="text-lg">Will you be late or absent?</h3>
              <p className="text-sm text-muted">Tell the office why, without clocking in. You can still clock in later, once you are within your branch&apos;s range.</p>
              {saved && <p className="mt-2 rounded-lg bg-paper-2 p-2 text-sm"><strong>Sent today ({saved.kind === "late" ? "late" : "absent"}, {saved.status === "accepted" ? "accepted by management" : saved.status === "declined" ? "not accepted" : "awaiting a decision"}):</strong> {saved.reason}</p>}
              <div className="mt-3 grid gap-3">
                <div className="field"><label htmlFor="nk">I will be</label>
                  <select id="nk" className="select" value={kind} onChange={(e) => setKind(e.target.value)}><option value="late">Late to school</option><option value="absent">Absent from school</option></select></div>
                <div className="field"><label htmlFor="nr">Reason</label>
                  <textarea id="nr" rows={3} className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="For example: road accident on the Ring Road; clinic appointment." /></div>
                <button type="button" className="btn btn-ghost" onClick={send} disabled={npending}>{npending ? "Sending…" : saved ? "Update and submit" : "Submit without clocking in"}</button>
                <p className="min-h-5 text-sm font-semibold" role="status">{nmsg.error ? <span className="text-bad">{nmsg.error}</span> : nmsg.ok ? <span className="text-ok">{nmsg.ok}</span> : null}</p>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
