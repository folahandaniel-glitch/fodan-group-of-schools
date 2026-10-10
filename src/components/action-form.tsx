"use client";
import { startTransition, useActionState } from "react";
import type { FormEvent, ReactNode } from "react";

type State = { error?: string; ok?: string };

export function ActionForm({ action, children, submit = "Save", className = "grid gap-4", danger = false, small = false, encType }: {
  action: (prev: State, fd: FormData) => Promise<State | void>;
  children: ReactNode;
  submit?: string;
  className?: string;
  danger?: boolean;
  small?: boolean;
  encType?: "multipart/form-data";
}) {
  const [state, run, pending] = useActionState(async (p: State, fd: FormData) => (await action(p, fd)) ?? { ok: "Saved." }, {} as State);
  // Submitting through a transition keeps what the user typed when the server reports a problem
  // (React otherwise resets uncontrolled fields after every action).
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => run(fd));
  };
  return (
    <form onSubmit={onSubmit} className={className} encType={encType}>
      {children}
      {state.error && <p role="alert" className="text-sm font-semibold text-bad">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm font-semibold text-ok">{state.ok}</p>}
      <div>
        <button type="submit" disabled={pending} className={`btn ${danger ? "btn-danger" : "btn-primary"} ${small ? "btn-sm" : ""}`}>
          {pending ? "Please wait…" : submit}
        </button>
      </div>
    </form>
  );
}
