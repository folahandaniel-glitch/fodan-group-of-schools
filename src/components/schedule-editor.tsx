"use client";
import { useState } from "react";
import { DAY_NAMES, toHm, toMin, type Group, type Row } from "@/lib/schedule";

type G = Group & { key: number };

/** Adds minutes to an "HH:MM" time (stays inside the day). */
const plus = (hm: string, min: number) => toHm(Math.min(toMin(hm) + min, 23 * 60 + 59));

/** Period and break editor per group of weekdays. Add and delete rows here; periods are numbered in order and everything is saved with the form. */
export function ScheduleEditor({ groups: initial }: { groups: Group[] }) {
  const [groups, setGroups] = useState<G[]>(() => initial.map((g, i) => ({ ...g, key: i })));
  const [next, setNext] = useState(initial.length);

  const patchGroup = (gi: number, p: Partial<G>) => setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, ...p } : g)));
  const patchRow = (gi: number, ri: number, p: Partial<Row>) => setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, rows: g.rows.map((r, j) => (j === ri ? { ...r, ...p } : r)) } : g)));
  const addRow = (gi: number, kind: Row["kind"]) => setGroups((gs) => gs.map((g, i) => {
    if (i !== gi || g.rows.length >= 40) return g;
    const last = [...g.rows].sort((a, b) => toMin(a.end) - toMin(b.end)).pop();
    const start = last ? last.end : "08:00";
    return { ...g, rows: [...g.rows, { kind, label: kind === "break" ? "Break" : "", start, end: plus(start, kind === "break" ? 5 : 30) }] };
  }));
  const delRow = (gi: number, ri: number) => setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, rows: g.rows.filter((_, j) => j !== ri) } : g)));
  const addGroup = () => { if (groups.length >= 6) return; setGroups((gs) => [...gs, { key: next, name: "New group", days: [], close: "14:00", noLesson: [], rows: [{ kind: "period", label: "", start: "08:00", end: "08:30" }] }]); setNext((n) => n + 1); };
  const delGroup = (gi: number) => setGroups((gs) => (gs.length > 1 ? gs.filter((_, i) => i !== gi) : gs));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg">School day &amp; timetable periods</h3>
        <p className="text-sm text-muted">Each group of weekdays has its own periods and breaks with exact times. Add or delete periods and breaks below, then save. Periods are numbered in order, and the Timetable menu follows what you save.</p>
      </div>
      {groups.map((g, gi) => {
        let n = 0;
        return (
          <fieldset key={g.key} className="rounded-2xl border border-line p-4">
            <legend className="px-2 font-bold">{g.name || "Group of days"}</legend>
            <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
              <div className="field"><label>Group name</label><input name={`g${gi}_name`} className="input" value={g.name} onChange={(e) => patchGroup(gi, { name: e.target.value })} /></div>
              <div className="field"><label>School closes at</label><input name={`g${gi}_close`} type="time" className="input" value={g.close} onChange={(e) => patchGroup(gi, { close: e.target.value })} /></div>
              <div className="field"><label>No lessons in periods (e.g. 1, 2)</label><input name={`g${gi}_nl`} className="input" value={g.noLesson.join(", ")} onChange={(e) => patchGroup(gi, { noLesson: e.target.value.split(/[ ,]+/).map(Number).filter((x) => x > 0) })} /></div>
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              {DAY_NAMES.map((d, i) => (
                <label key={d} className="flex items-center gap-1.5 text-sm font-semibold"><input type="checkbox" name={`g${gi}_d${i}`} checked={g.days.includes(i)} onChange={(e) => patchGroup(gi, { days: e.target.checked ? [...g.days, i] : g.days.filter((x) => x !== i) })} /> {d}</label>
              ))}
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="tbl text-sm">
                <thead><tr><th>#</th><th>Type</th><th>Label (breaks)</th><th>Starts</th><th>Ends</th><th>Minutes</th><th><span className="sr-only">Delete</span></th></tr></thead>
                <tbody>
                  {g.rows.map((r, ri) => {
                    if (r.kind === "period") n++;
                    const mins = toMin(r.end) - toMin(r.start);
                    return (
                      <tr key={ri} className={r.kind === "break" ? "bg-paper-2" : ""}>
                        <td className="w-10 font-bold">{r.kind === "period" ? n : "☕"}</td>
                        <td><select name={`g${gi}_r${ri}_kind`} className="select !min-h-9 !py-1" value={r.kind} onChange={(e) => patchRow(gi, ri, { kind: e.target.value as Row["kind"] })} aria-label="Type"><option value="period">Period</option><option value="break">Break</option></select></td>
                        <td><input name={`g${gi}_r${ri}_label`} className="input !min-h-9 !py-1" value={r.label} placeholder={r.kind === "break" ? "e.g. Short break" : ""} onChange={(e) => patchRow(gi, ri, { label: e.target.value })} aria-label="Label" /></td>
                        <td><input name={`g${gi}_r${ri}_start`} type="time" className="input !min-h-9 !py-1" value={r.start} onChange={(e) => patchRow(gi, ri, { start: e.target.value })} aria-label="Starts" required /></td>
                        <td><input name={`g${gi}_r${ri}_end`} type="time" className="input !min-h-9 !py-1" value={r.end} onChange={(e) => patchRow(gi, ri, { end: e.target.value })} aria-label="Ends" required /></td>
                        <td className="text-muted">{Number.isFinite(mins) && mins > 0 ? mins : "—"}</td>
                        <td><button type="button" className="btn btn-danger btn-sm" onClick={() => delRow(gi, ri)} aria-label={`Delete ${r.kind} ${r.kind === "period" ? n : ""}`}>Delete</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn btn-gold btn-sm" onClick={() => addRow(gi, "period")}>＋ Add period</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => addRow(gi, "break")}>＋ Add break</button>
              {groups.length > 1 && <button type="button" className="btn btn-danger btn-sm ml-auto" onClick={() => delGroup(gi)}>Delete this group</button>}
            </div>
          </fieldset>
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-ghost btn-sm" onClick={addGroup} disabled={groups.length >= 6}>＋ Add a group of days</button>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="resetSchedule" /> Restore the standard school day instead</label>
      </div>
    </div>
  );
}
