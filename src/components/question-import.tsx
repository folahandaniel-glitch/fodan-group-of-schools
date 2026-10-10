"use client";
import { useActionState } from "react";
import { commitImport, previewImport, type Preview } from "@/app/(portal)/portal/questions/actions";

type Opt = { value: string; label: string };

export function QuestionImport({ subjects, classes, terms, departments }: { subjects: Opt[]; classes: Opt[]; terms: Opt[]; departments: Opt[] }) {
  const [prev, runPreview, pending] = useActionState(previewImport, { rows: [] } as Preview);
  const [done, runCommit, committing] = useActionState(commitImport, {} as { error?: string; ok?: string });
  const good = prev.rows.filter((r) => r.errors.length === 0);
  const sel = (name: string, label: string, o: Opt[]) => (
    <div className="field"><label htmlFor={`imp-${name}`}>{label}</label>
      <select id={`imp-${name}`} name={name} className="select"><option value="">—</option>{o.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
  );
  return (
    <div className="grid gap-4">
      <form action={runPreview} className="grid gap-3 sm:grid-cols-3">
        {sel("subjectId", "Subject", subjects)}{sel("classId", "Class", classes)}{sel("departmentId", "Department", departments)}
        {sel("termId", "Term", terms)}
        <div className="field"><label htmlFor="imp-copy">Copyright status</label>
          <select id="imp-copy" name="copyright" className="select" defaultValue="teacher_authored">
            <option value="original">Original</option><option value="teacher_authored">Teacher-authored</option><option value="licensed">Licensed</option><option value="authorised">Authorised</option>
          </select></div>
        <div className="field"><label htmlFor="imp-src">Source</label><input id="imp-src" name="source" className="input" placeholder="e.g. Class teacher, 2026" /></div>
        <div className="field sm:col-span-2"><label htmlFor="imp-file">File (.xlsx, .docx, .pptx, .pdf, .txt — max 4 MB)</label>
          <input id="imp-file" name="file" type="file" required className="input" accept=".xlsx,.docx,.pptx,.pdf,.txt" /></div>
        <div className="flex items-end"><button className="btn btn-primary" disabled={pending}>{pending ? "Reading…" : "Preview import"}</button></div>
      </form>
      <p className="hint">Mark the correct option with ★ directly after it (for example “B. Abuja★”). Questions with no ★, or more than one, are rejected — answers are never guessed.</p>

      {prev.error && <p role="alert" className="text-sm font-semibold text-bad">{prev.error}</p>}
      {prev.note && <p role="status" className="text-sm font-semibold text-warn">{prev.note}</p>}
      {prev.rows.length > 0 && (
        <div>
          <p className="text-sm font-semibold">{good.length} valid · {prev.rows.length - good.length} with problems</p>
          <div className="mt-2 max-h-96 overflow-auto rounded-xl border border-line">
            <table className="tbl">
              <thead><tr><th>#</th><th>Question</th><th>Options</th><th>Answer</th><th>Check</th></tr></thead>
              <tbody>
                {prev.rows.map((r, i) => (
                  <tr key={i} className={r.errors.length ? "bg-[#fdf1ef]" : ""}>
                    <td>{i + 1}</td><td className="max-w-xs">{r.text}</td>
                    <td className="text-xs">{r.options.map((o) => <div key={o.key}><b>{o.key}.</b> {o.text}</div>)}</td>
                    <td className="font-bold">{r.correct ?? "—"}</td>
                    <td className="text-xs">{r.errors.length ? <span className="text-bad">{r.errors.join(" ")}</span> : <span className="text-ok">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action={runCommit} className="mt-3">
            <input type="hidden" name="rows" value={JSON.stringify(good)} />
            <input type="hidden" name="filename" value={prev.filename ?? ""} />
            {Object.entries(prev.meta ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <button className="btn btn-gold" disabled={committing || good.length === 0}>Import {good.length} valid question{good.length === 1 ? "" : "s"} as Pending Review</button>
          </form>
          {done.ok && <p role="status" className="mt-2 text-sm font-semibold text-ok">{done.ok}</p>}
          {done.error && <p role="alert" className="mt-2 text-sm font-semibold text-bad">{done.error}</p>}
        </div>
      )}
    </div>
  );
}
