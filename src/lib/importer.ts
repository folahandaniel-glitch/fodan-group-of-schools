import { unzipSync, strFromU8 } from "fflate";
import { fromColumns, parseQuestionDocument, type ParsedQuestion } from "./logic/star-parser";

export type ImportedRow = ParsedQuestion & {
  explanation?: string; topic?: string; subtopic?: string; marks?: number; difficulty?: string; source?: string; copyright?: string;
};

export const IMPORT_EXT = ["xlsx", "docx", "pptx", "pdf", "txt"];

export async function parseUpload(name: string, buf: Buffer): Promise<{ rows: ImportedRow[]; note?: string }> {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "xlsx") return { rows: await fromXlsx(buf) };
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return { rows: parseQuestionDocument(value) };
  }
  if (ext === "pptx") return { rows: parseQuestionDocument(pptxText(buf)) };
  if (ext === "pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    const t = Array.isArray(text) ? text.join("\n") : text;
    if (t.replace(/\s/g, "").length < 40) {
      return { rows: [], note: "This PDF appears to be scanned (no selectable text). Scanned documents need an OCR service, which is not enabled — upload a text-based PDF, Word or Excel file." };
    }
    return { rows: parseQuestionDocument(t) };
  }
  if (ext === "txt") return { rows: parseQuestionDocument(buf.toString("utf8")) };
  return { rows: [], note: "Unsupported file type." };
}

function pptxText(buf: Buffer): string {
  const files = unzipSync(new Uint8Array(buf));
  const slides = Object.keys(files).filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k)).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  return slides
    .map((k) => {
      const xml = strFromU8(files[k]);
      const paras = xml.split(/<\/a:p>/).map((p) => [...p.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(""));
      return paras.map((p) => p.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")).join("\n");
    })
    .join("\n");
}

const HEAD: Record<string, string> = {
  question: "question", a: "A", b: "B", c: "C", d: "D", "correct answer": "correct", correct: "correct", answer: "correct",
  explanation: "explanation", topic: "topic", subtopic: "subtopic", marks: "marks", difficulty: "difficulty", source: "source",
  "copyright status": "copyright", copyright: "copyright",
};

async function fromXlsx(buf: Buffer): Promise<ImportedRow[]> {
  const { readSheet } = await import("read-excel-file/node");
  const data = (await readSheet(buf)) as unknown[][];
  if (data.length < 2) return [];
  const cols = data[0].map((h) => HEAD[String(h ?? "").trim().toLowerCase()] ?? "");
  const out: ImportedRow[] = [];
  for (const r of data.slice(1)) {
    if (!r.some((c) => String(c ?? "").trim())) continue;
    const row: Record<string, string> = {};
    cols.forEach((k, i) => { if (k) row[k] = String(r[i] ?? "").trim(); });
    const p = fromColumns({ question: row.question ?? "", A: row.A, B: row.B, C: row.C, D: row.D, correct: row.correct });
    out.push({
      ...p, explanation: row.explanation, topic: row.topic, subtopic: row.subtopic,
      marks: Number(row.marks) > 0 ? Number(row.marks) : 1, difficulty: row.difficulty, source: row.source, copyright: row.copyright,
    });
  }
  return out;
}
