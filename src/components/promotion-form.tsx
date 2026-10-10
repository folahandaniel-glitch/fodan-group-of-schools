"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import { runPromotion } from "@/app/(portal)/portal/promotion/actions";

export function PromotionForm({ students, classes }: {
  students: { id: string; first_name: string; last_name: string; admission_no: string }[];
  classes: { value: string; label: string }[];
}) {
  const [all, setAll] = useState(true);
  const [action, setAction] = useState("promote");
  return (
    <ActionForm action={runPromotion} submit="Apply to selected students" className="card card-pad grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl">Select students</h2>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={all} onChange={(e) => {
            setAll(e.target.checked);
            document.querySelectorAll<HTMLInputElement>('input[name="student"]').forEach((i) => (i.checked = e.target.checked));
          }} /> Select all ({students.length})
        </label>
      </div>
      <ul className="grid gap-1 sm:grid-cols-2">
        {students.map((s) => (
          <li key={s.id}><label className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-paper-2">
            <input type="checkbox" name="student" value={s.id} defaultChecked /> <span className="text-sm">{s.last_name}, {s.first_name} <span className="text-muted">({s.admission_no})</span></span></label></li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="field"><label htmlFor="action">Action</label>
          <select id="action" name="action" className="select" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="promote">Promote to next class</option><option value="retain">Retain in class</option><option value="repeat">Repeat class</option>
            <option value="transfer">Transfer to another class</option><option value="graduate">Graduate</option><option value="withdraw">Withdraw</option>
          </select></div>
        {action === "transfer" && (
          <div className="field"><label htmlFor="targetClass">Destination class</label>
            <select id="targetClass" name="targetClass" className="select" required><option value="">Select…</option>{classes.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
        )}
        <div className="field"><label htmlFor="remarks">Remarks</label><input id="remarks" name="remarks" className="input" placeholder="Optional" /></div>
      </div>
    </ActionForm>
  );
}
