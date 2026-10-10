"use client";
import { startTransition, useActionState } from "react";
import { submitContact } from "@/app/(public)/actions";

const CATS = ["General", "Admissions", "Academics", "Parents", "Results", "Technical", "Complaint", "Other"];

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, {} as { ok?: boolean; error?: string });
  if (state.ok) {
    return (
      <div role="status" className="rounded-2xl border border-[#bfe0cc] bg-[#e6f4ec] p-6">
        <p className="font-display text-xl text-ok">Thank you — your message has been received.</p>
        <p className="mt-1 text-sm text-ink-2">The school office will respond using the email address you provided.</p>
      </div>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); }} className="grid gap-4 sm:grid-cols-2">
      <div className="field"><label htmlFor="c-name">Full name *</label><input id="c-name" name="name" className="input" required autoComplete="name" /></div>
      <div className="field"><label htmlFor="c-email">Email *</label><input id="c-email" name="email" type="email" className="input" required autoComplete="email" /></div>
      <div className="field"><label htmlFor="c-phone">Phone</label><input id="c-phone" name="phone" type="tel" className="input" autoComplete="tel" /></div>
      <div className="field"><label htmlFor="c-cat">Category</label>
        <select id="c-cat" name="category" className="select" defaultValue="General">{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div className="field sm:col-span-2"><label htmlFor="c-sub">Subject *</label><input id="c-sub" name="subject" className="input" required /></div>
      <div className="field sm:col-span-2"><label htmlFor="c-msg">Message *</label><textarea id="c-msg" name="message" rows={5} className="textarea" required /></div>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {state.error && <p role="alert" className="sm:col-span-2 text-sm font-semibold text-bad">{state.error}</p>}
      <div className="sm:col-span-2"><button className="btn btn-primary" disabled={pending}>{pending ? "Sending…" : "Send message"}</button></div>
    </form>
  );
}
