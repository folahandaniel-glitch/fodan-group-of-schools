"use client";
import { useState, useActionState } from "react";
import { beginMfa, confirmMfa } from "@/app/account/actions";

export function MfaSetup() {
  const [qr, setQr] = useState<{ qr?: string; secret?: string } | null>(null);
  const [state, confirm, pending] = useActionState(confirmMfa, {} as { error?: string; ok?: string; recovery?: string[] });
  if (state.recovery) {
    return (
      <div role="status">
        <p className="font-semibold text-ok">{state.ok}</p>
        <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">{state.recovery.map((c) => <li key={c} className="rounded-lg border border-line bg-paper-2 px-3 py-2">{c}</li>)}</ul>
        <a href="/portal" className="btn btn-primary mt-4">Continue to portal</a>
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      {!qr ? (
        <button className="btn btn-primary w-fit" onClick={async () => setQr(await beginMfa())}>Set up authenticator app</button>
      ) : (
        <>
          <p className="text-sm text-ink-2">Scan this QR code with Google Authenticator, Microsoft Authenticator or a similar app, then enter the 6-digit code.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.qr} alt="Two-factor QR code" width={220} height={220} className="rounded-xl border border-line" />
          <p className="text-xs text-muted">Manual key: <code className="font-mono">{qr.secret}</code></p>
          <form action={confirm} className="grid max-w-xs gap-3">
            <div className="field"><label htmlFor="code">6-digit code</label><input id="code" name="code" className="input" inputMode="numeric" autoComplete="one-time-code" required /></div>
            {state.error && <p role="alert" className="text-sm font-semibold text-bad">{state.error}</p>}
            <button className="btn btn-primary" disabled={pending}>Turn on two-factor</button>
          </form>
        </>
      )}
    </div>
  );
}
