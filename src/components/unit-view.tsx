import type { PoeticUnit } from "@/content/cbt/poetic-types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** One illustrated textbook chapter: picture, lesson text with diagrams and worked examples, notes, classwork, assignment and quiz. */
export function UnitView({ u, answers = true }: { u: PoeticUnit; answers?: boolean }) {
  const sc = u.scene;
  const html = u.lines.map((l) => {
    const i = l.indexOf("|"), code = l.slice(0, i), rest = l.slice(i + 1);
    if (code === "H") return `<h3>${esc(rest)}</h3>`;
    if (code === "R") return rest;
    if (code === "N") return `<p class="fsc-note-line"><em>${esc(rest)}</em></p>`;
    if (code === "V") return `<p class="fsc-verse">${esc(rest)}</p>`;
    if (code === "D") { const j = rest.indexOf("|"); return `<p><b>${esc(rest.slice(0, j))}:</b> ${esc(rest.slice(j + 1))}</p>`; }
    return `<p>${esc(rest)}</p>`;
  }).join("");
  const W = 320, n = Math.max(sc.emojis.length, 1);
  return (
    <article className="fsc-body">
      <p className="text-sm font-semibold text-muted">{u.focus}</p>
      <figure className="fsc-scene"><svg viewBox="0 0 320 130" role="img" aria-label={sc.caption}><rect width="320" height="130" rx="16" fill={sc.sky} /><rect y="86" width="320" height="44" rx="16" fill={sc.ground} />
        {sc.emojis.map((e, k) => <text key={k} x={(W / (n + 1)) * (k + 1)} y="86" fontSize="44" textAnchor="middle">{e}</text>)}</svg><figcaption>{sc.caption}</figcaption></figure>
      {u.diagram && <div dangerouslySetInnerHTML={{ __html: u.diagram }} />}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {u.devices.length > 0 && <aside className="fsc-note"><strong>Key points and notes</strong><ul>{u.devices.map((d, i) => <li key={i}>{d}</li>)}</ul></aside>}
      <section><h3>Classwork</h3><ol>{u.classwork.map((c, i) => <li key={i}>{c.q}{answers && <details className="fsc-ans"><summary>Answer</summary>{c.a}</details>}</li>)}</ol></section>
      <section><h3>Assignment</h3><ol>{u.assignment.map((c, i) => <li key={i}>{c.q}{answers && <details className="fsc-ans"><summary>Answer</summary>{c.a}</details>}</li>)}</ol></section>
      <section><h3>Quick quiz</h3><ol>{u.quiz.map((q, i) => <li key={i}>{q.q}<ul className="fsc-opts">{q.options.map((o, k) => <li key={k}>{o}</li>)}</ul>{answers && <details className="fsc-ans"><summary>Answer</summary>{q.a}</details>}</li>)}</ol></section>
    </article>
  );
}
