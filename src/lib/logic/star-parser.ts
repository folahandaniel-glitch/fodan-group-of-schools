// Parses objective questions where the correct option is marked with a star (★) written
// immediately after the option text (e.g. "B. Abuja★").

export type ParsedQuestion = {
  text: string;
  options: { key: string; text: string }[];
  correct: string | null;
  errors: string[];
  warnings: string[];
};

const STAR = /[★⭐*]/;
const OPT_SPLIT = /(?:^|\s)\(?([A-Ea-e])[.)]\s+/g;

export function parseOptionsBlock(block: string): { options: { key: string; text: string }[]; correct: string | null; errors: string[] } {
  const errors: string[] = [];
  const marks: { key: string; idx: number }[] = [];
  const text = block.replace(/\r/g, " ").replace(/\n+/g, " ");
  let m: RegExpExecArray | null;
  OPT_SPLIT.lastIndex = 0;
  while ((m = OPT_SPLIT.exec(text))) marks.push({ key: m[1].toUpperCase(), idx: m.index + m[0].length });
  const options: { key: string; text: string }[] = [];
  const starred: string[] = [];
  marks.forEach((mk, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].idx - 3 : text.length;
    let raw = text.slice(mk.idx, Math.max(end, mk.idx)).trim();
    // trim the leading "X. " of the next marker which may be included
    raw = raw.replace(/\s+\(?[A-Ea-e][.)]\s*$/, "").trim();
    if (STAR.test(raw)) {
      starred.push(mk.key);
      raw = raw.replace(new RegExp(STAR.source, "g"), "").trim();
    }
    options.push({ key: mk.key, text: raw });
  });
  if (options.length < 2) errors.push("Fewer than two options were detected.");
  if (starred.length > 1) errors.push("More than one option is marked with ★.");
  if (starred.length === 0) errors.push("No option is marked with ★ — the correct answer is missing.");
  return { options, correct: starred.length === 1 ? starred[0] : null, errors };
}

/** Parse a whole text document containing numbered questions. */
export function parseQuestionDocument(raw: string): ParsedQuestion[] {
  const text = raw.replace(/\r/g, "").trim();
  const blocks = text.split(/\n\s*(?=\d{1,3}[.)]\s+)/).map((b) => b.trim()).filter(Boolean);
  const out: ParsedQuestion[] = [];
  for (const b of blocks) {
    const body = b.replace(/^\d{1,3}[.)]\s+/, "");
    const firstOpt = body.search(/(?:^|\s)\(?[Aa][.)]\s+/);
    if (firstOpt < 0) {
      out.push({ text: body, options: [], correct: null, errors: ["No options detected."], warnings: [] });
      continue;
    }
    const qText = body.slice(0, firstOpt).replace(/\s+/g, " ").trim();
    const { options, correct, errors } = parseOptionsBlock(body.slice(firstOpt));
    const warnings: string[] = [];
    if (!qText) errors.push("Question text is empty.");
    out.push({ text: qText, options, correct, errors, warnings });
  }
  return out;
}

/** Build a ParsedQuestion from spreadsheet cells. A star in a cell also marks the answer. */
export function fromColumns(row: { question: string; A?: string; B?: string; C?: string; D?: string; correct?: string }): ParsedQuestion {
  const errors: string[] = [];
  const options = (["A", "B", "C", "D"] as const)
    .map((k) => ({ key: k as string, text: String(row[k] ?? "").trim() }))
    .filter((o) => o.text);
  const starred = options.filter((o) => STAR.test(o.text)).map((o) => o.key);
  options.forEach((o) => (o.text = o.text.replace(new RegExp(STAR.source, "g"), "").trim()));
  let correct: string | null = null;
  const declared = String(row.correct ?? "").trim().toUpperCase().replace(/[^A-D]/g, "");
  if (starred.length > 1) errors.push("More than one option is marked with ★.");
  else if (starred.length === 1) correct = starred[0];
  else if (declared.length === 1) correct = declared;
  else errors.push("No correct answer given (use the Correct Answer column or ★).");
  if (correct && !options.find((o) => o.key === correct)) {
    errors.push(`Correct answer ${correct} has no matching option.`);
    correct = null;
  }
  if (!String(row.question ?? "").trim()) errors.push("Question text is empty.");
  if (options.length < 2) errors.push("Fewer than two options.");
  return { text: String(row.question ?? "").trim(), options, correct, errors, warnings: [] };
}
