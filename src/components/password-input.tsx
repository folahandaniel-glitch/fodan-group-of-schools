"use client";
import { useState } from "react";
import { checkPassword } from "@/lib/logic/password";

export function PasswordInput({ name, label, autoComplete = "current-password", meter = false, required = true }: {
  name: string; label: string; autoComplete?: string; meter?: boolean; required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [val, setVal] = useState("");
  const c = checkPassword(val);
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
  return (
    <div className="field">
      <label htmlFor={name}>{label}{required && <span className="text-bad"> *</span>}</label>
      <div className="relative">
        <input id={name} name={name} type={show ? "text" : "password"} className="input pr-24" required={required}
          autoComplete={autoComplete} value={val} onChange={(e) => setVal(e.target.value)} aria-describedby={meter ? `${name}-m` : undefined} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show}
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg px-3 py-2 text-xs font-bold text-royal hover:bg-paper-2">
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {meter && (
        <div id={`${name}-m`} aria-live="polite">
          <div className="mt-1 flex gap-1" aria-hidden>
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${val && c.score >= i ? (c.score >= 4 ? "bg-ok" : c.score >= 3 ? "bg-gold-2" : "bg-bad") : "bg-line"}`} />
            ))}
          </div>
          <p className="hint mt-1">{val ? (c.ok ? `${labels[c.score]} — meets the policy.` : c.problems[0]) : "Minimum 8 characters with letters, numbers and symbols."}</p>
        </div>
      )}
    </div>
  );
}
