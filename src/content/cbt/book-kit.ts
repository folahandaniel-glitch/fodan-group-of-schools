/** Shared helpers for the FODAN built-in textbooks: questions, scenes, worked examples, SVG diagrams. */
import type { PoeticUnit, PoeticWork } from "./poetic-types";

export const mc = (q: string, a: string, ...wrong: string[]) => ({ q, a, options: [a, ...wrong] });
export const sc = (emojis: string[], sky: string, ground: string, caption: string) => ({ emojis, sky, ground, caption });
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** A worked example: a title and the steps, one per line. */
export const ex = (title: string, steps: string[]) => `R|<aside class="fsc-note fsc-note-def"><strong>Worked example</strong><p><b>${esc(title)}</b></p><ol>${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></aside>`;
/** A framed definition / rule box. */
export const rule = (title: string, body: string) => `R|<aside class="fsc-note"><strong>${esc(title)}</strong><p>${esc(body)}</p></aside>`;
/** A simple table: header row then body rows (plain text, escaped). */
export const table = (head: string[], rows: string[][]) => `R|<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
export const fig = (label: string, body: string, h = 150) => `<figure class="fsc-scene"><svg viewBox="0 0 320 ${h}" role="img" aria-label="${esc(label)}"><rect width="320" height="${h}" rx="16" fill="#f8fafc"/>${body}</svg><figcaption>${esc(label)}</figcaption></figure>`;
export const t = (x: number, y: number, s: string, size = 11, anchor = "middle", fill = "#0b1f4b", weight = 700) => `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${esc(s)}</text>`;

/** Group chapters by class and number them: "JSS2 · Chapter 3 · Name". */
export function byClass(groups: [string, PoeticUnit[]][]): PoeticUnit[] {
  const out: PoeticUnit[] = [];
  let n = 0;
  for (const [cls, units] of groups) {
    for (const u of units) {
      n++;
      const name = u.title.replace(/^Chapter \d+ · /, "");
      out.push({ ...u, title: `${cls} · Chapter ${n} · ${name}`, label: `${cls} · Ch ${n}` });
    }
  }
  return out;
}

/** Build a complete textbook from chapters grouped by class. */
export function makeBook(o: {
  source: string;
  title: string;
  subtitle: string;
  intro: string;
  groups: [string, PoeticUnit[]][];
  review: { q: string; options: string[]; a: string }[];
}): PoeticWork {
  return {
    kind: "EBOOK",
    notesTitle: "Key points and formulae",
    source: o.source,
    title: o.title,
    subtitle: o.subtitle,
    introHtml: `<h2>How to use this textbook</h2><p>${o.intro}</p><ul><li>Read each chapter, study the <b>Worked examples</b> and the diagrams.</li><li>Do the <b>Classwork</b> and the <b>Assignment</b>, then compare your answers with the model answers.</li><li>Finish each chapter with its CBT quiz, and take the Term Review at the end of the book.</li></ul><p><b>Tip:</b> try every question yourself before you read the answer.</p>`,
    units: byClass(o.groups),
    review: o.review,
  };
}
