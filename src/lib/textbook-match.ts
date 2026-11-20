import { TEXTBOOKS } from "@/content/cbt";

const STOP = new Set(["and", "the", "of", "in", "to", "for", "with", "on", "an", "a", "i", "ii", "iii", "cont", "continued", "part", "introduction", "basic", "chapter"]);
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
const stem = (w: string) => w.replace(/(ing|ies|es|s|ed)$/, "");
const unitLevel = (label: string): number | null => { const m = /^(JSS|SSS)\s?(\d)/i.exec(label); return m ? (m[1].toUpperCase() === "JSS" ? 6 : 9) + Number(m[2]) : null; };

/** The illustrated chapter that best matches a topic for that class level, if any chapter shares real words with the topic. */
export function bestUnit(subject: string, level: number, topic: string): { key: string; index: number; book: string } | null {
  const tw = new Set(words(topic).map(stem));
  if (tw.size === 0) return null;
  let best: { key: string; index: number; book: string; score: number } | null = null;
  for (const b of TEXTBOOKS) {
    if (!b.subjects.some((s) => s.toLowerCase() === subject.toLowerCase()) || !b.levels.includes(level)) continue;
    b.work.units.forEach((u, index) => {
      if (unitLevel(u.label) !== level) return;
      const uw = new Set(words(u.title.split(" · ").slice(2).join(" ")).map(stem));
      let score = 0; for (const w of tw) if (uw.has(w)) score++;
      if (score > 0 && (!best || score > best.score)) best = { key: b.key, index, book: b.work.title, score };
    });
  }
  return best;
}
