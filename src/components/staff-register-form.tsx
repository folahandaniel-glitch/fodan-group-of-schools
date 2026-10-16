"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import { PasswordInput } from "./password-input";
import { registerStaff } from "@/app/(auth)/actions";

type Pos = { title: string; group: "secondary" | "primary" | "non_teaching" };

export function StaffRegisterForm({ positions, branches }: { positions: Pos[]; branches: { id: string; name: string }[] }) {
  const [cat, setCat] = useState<"teaching" | "non_teaching">("teaching");
  const [section, setSection] = useState<"secondary" | "primary">("secondary");
  const group = cat === "non_teaching" ? "non_teaching" : section;
  const list = positions.filter((p) => p.group === group);
  return (
    <ActionForm action={registerStaff} submit="Submit registration" className="grid gap-4 sm:grid-cols-2">
      <fieldset className="sm:col-span-2">
        <legend className="label mb-1">Staff type</legend>
        <div className="grid grid-cols-2 gap-2">
          {([["teaching", "Teaching staff"], ["non_teaching", "Non-teaching staff"]] as const).map(([v, l]) => (
            <label key={v} className={`cursor-pointer rounded-xl border-2 px-4 py-3 text-center font-bold ${cat === v ? "border-royal bg-[#e8eeff]" : "border-line bg-white"}`}>
              <input type="radio" name="category" value={v} checked={cat === v} onChange={() => setCat(v)} className="sr-only" />{l}
            </label>
          ))}
        </div>
      </fieldset>
      {cat === "teaching" && (
        <div className="field"><label htmlFor="section">School section</label>
          <select id="section" name="section" className="select" value={section} onChange={(e) => setSection(e.target.value as "secondary" | "primary")}>
            <option value="secondary">Secondary school</option><option value="primary">Primary school</option></select></div>
      )}
      <div className={`field ${cat === "teaching" ? "" : "sm:col-span-2"}`}><label htmlFor="position">Position *</label>
        <select id="position" name="position" className="select" required defaultValue=""><option value="" disabled>Select position…</option>
          {list.map((p) => <option key={p.title}>{p.title}</option>)}</select></div>
      <div className="field sm:col-span-2"><label htmlFor="branch">Branch</label>
        <select id="branch" name="branch" className="select" defaultValue=""><option value="">Select branch…</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <div className="field"><label htmlFor="firstName">First name *</label><input id="firstName" name="firstName" className="input" required autoComplete="given-name" /></div>
      <div className="field"><label htmlFor="lastName">Last name *</label><input id="lastName" name="lastName" className="input" required autoComplete="family-name" /></div>
      <div className="field"><label htmlFor="email">Email (your username) *</label><input id="email" name="email" type="email" className="input" required autoComplete="email" /></div>
      <div className="field"><label htmlFor="phone">Phone *</label><input id="phone" name="phone" type="tel" className="input" required autoComplete="tel" /></div>
      <PasswordInput name="password" label="Password" autoComplete="new-password" meter />
      <PasswordInput name="confirm" label="Confirm password" autoComplete="new-password" />
      <p className="hint sm:col-span-2">Your registration is reviewed by school management. You can sign in once it is approved.</p>
    </ActionForm>
  );
}
