"use client";
import { useActionState } from "react";
import { makeResetLink } from "@/app/(portal)/portal/students/actions";

export function ResetLink({ userId }: { userId: string }) {
  const [s, run, pending] = useActionState(makeResetLink, {} as { error?: string; ok?: string; link?: string });
  return (
    <form action={run} className="grid gap-2">
      <input type="hidden" name="userId" value={userId} />
      <button className="btn btn-ghost btn-sm w-fit" disabled={pending}>Generate password-reset link</button>
      {s.error && <p role="alert" className="text-sm font-semibold text-bad">{s.error}</p>}
      {s.link && (
        <div role="status" className="rounded-xl border border-line bg-paper-2 p-3 text-sm">
          <p className="font-semibold">{s.ok}</p>
          <input readOnly value={s.link} className="input mt-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Reset link" />
        </div>
      )}
    </form>
  );
}
