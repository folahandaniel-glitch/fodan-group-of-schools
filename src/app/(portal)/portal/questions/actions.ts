"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { can, requirePerm } from "@/lib/auth";
import { audit, clean, rateLimit } from "@/lib/security";
import { parseUpload, IMPORT_EXT, type ImportedRow } from "@/lib/importer";
import { MAX_BYTES } from "@/lib/files";
import { currentTerm } from "@/lib/settings";

type State = { error?: string; ok?: string };
const uuid = (v: unknown) => { const s = clean(v, 40); return /^[0-9a-f-]{36}$/i.test(s) ? s : null; };
const COPYRIGHT = ["original", "teacher_authored", "licensed", "authorised", "ai_generated"];

function meta(fd: FormData) {
  const cr = clean(fd.get("copyright"), 30);
  return {
    subjectId: uuid(fd.get("subjectId")), classId: uuid(fd.get("classId")), departmentId: uuid(fd.get("departmentId")), termId: uuid(fd.get("termId")),
    topic: clean(fd.get("topic"), 160) || null, subtopic: clean(fd.get("subtopic"), 160) || null,
    difficulty: ["easy", "medium", "hard"].includes(clean(fd.get("difficulty"), 10)) ? clean(fd.get("difficulty"), 10) : "medium",
    marks: Number(fd.get("marks")) > 0 ? Number(fd.get("marks")) : 1,
    source: clean(fd.get("source"), 200) || null, copyright: COPYRIGHT.includes(cr) ? cr : "original",
    examCategory: clean(fd.get("examCategory"), 30) || null,
  };
}

export async function addQuestion(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("questions:create");
  const m = meta(fd);
  const text = clean(fd.get("text"), 3000);
  const options = ["A", "B", "C", "D", "E"].map((k) => ({ key: k, text: clean(fd.get(`opt${k}`), 600) })).filter((o) => o.text);
  const correct = clean(fd.get("correct"), 1).toUpperCase();
  if (!text) return { error: "Enter the question." };
  if (options.length < 2) return { error: "Provide at least two options." };
  if (!options.find((o) => o.key === correct)) return { error: "Choose the correct answer from the options you filled in." };
  const [q] = await sql`INSERT INTO questions (school_id, subject_id, class_id, department_id, term_id, topic, subtopic, text, options, correct, explanation,
      difficulty, marks, source, copyright, exam_category, author_id, status)
    VALUES (${me.schoolId}, ${m.subjectId}, ${m.classId}, ${m.departmentId}, ${m.termId}, ${m.topic}, ${m.subtopic}, ${text}, ${sql.json(options)}, ${correct},
      ${clean(fd.get("explanation"), 2000) || null}, ${m.difficulty}, ${m.marks}, ${m.source}, ${m.copyright}, ${m.examCategory}, ${me.id}, 'PENDING_REVIEW') RETURNING id`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "question.create", entity: "question", entityId: q.id });
  revalidatePath("/portal/questions");
  return { ok: "Question saved and sent for review." };
}

export type Preview = { rows: ImportedRow[]; note?: string; error?: string; filename?: string; meta?: Record<string, string> };

export async function previewImport(_p: Preview, fd: FormData): Promise<Preview> {
  const me = await requirePerm("questions:create");
  if (!(await rateLimit(`import:${me.id}`, 20, 3600))) return { rows: [], error: "Too many imports. Try again later." };
  const f = fd.get("file") as File | null;
  if (!f || f.size === 0) return { rows: [], error: "Choose a file." };
  if (f.size > MAX_BYTES) return { rows: [], error: "File is too large (4 MB limit)." };
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (!IMPORT_EXT.includes(ext)) return { rows: [], error: "Use .xlsx, .docx, .pptx, .pdf or .txt." };
  try {
    const r = await parseUpload(f.name, Buffer.from(await f.arrayBuffer()));
    if (r.rows.length > 500) return { rows: [], error: "Import at most 500 questions at a time." };
    const metaEcho: Record<string, string> = {};
    for (const k of ["subjectId", "classId", "departmentId", "termId", "copyright", "source"]) metaEcho[k] = clean(fd.get(k), 200);
    return { ...r, filename: f.name, meta: metaEcho };
  } catch {
    return { rows: [], error: "The file could not be read. Check that it is a valid document." };
  }
}

export async function commitImport(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("questions:create");
  const m = meta(fd);
  let rows: ImportedRow[] = [];
  try { rows = JSON.parse(String(fd.get("rows") ?? "[]")); } catch { return { error: "Invalid import data." }; }
  if (!Array.isArray(rows) || rows.length > 500) return { error: "Invalid import data." };
  const [imp] = await sql`INSERT INTO question_imports (school_id, filename, accepted, rejected, by_user) VALUES (${me.schoolId}, ${clean(fd.get("filename"), 200)}, 0, 0, ${me.id}) RETURNING id`;
  let ok = 0, bad = 0;
  for (const r of rows) {
    // Re-validate on the server: never trust the preview echoed back by the browser.
    const options = Array.isArray(r.options) ? r.options.map((o) => ({ key: clean(o.key, 1).toUpperCase(), text: clean(o.text, 600) })).filter((o) => o.text && /^[A-E]$/.test(o.key)) : [];
    const correct = clean(r.correct, 1).toUpperCase();
    const text = clean(r.text, 3000);
    if (!text || options.length < 2 || !options.find((o) => o.key === correct)) { bad++; continue; }
    const cr = COPYRIGHT.includes(clean(r.copyright, 30)) ? clean(r.copyright, 30) : m.copyright;
    await sql`INSERT INTO questions (school_id, subject_id, class_id, department_id, term_id, topic, subtopic, text, options, correct, explanation, difficulty, marks, source, copyright, exam_category, author_id, status, import_id)
      VALUES (${me.schoolId}, ${m.subjectId}, ${m.classId}, ${m.departmentId}, ${m.termId}, ${clean(r.topic, 160) || m.topic}, ${clean(r.subtopic, 160) || m.subtopic}, ${text}, ${sql.json(options)}, ${correct},
        ${clean(r.explanation, 2000) || null}, ${["easy", "medium", "hard"].includes(clean(r.difficulty, 10)) ? clean(r.difficulty, 10) : m.difficulty},
        ${Number(r.marks) > 0 ? Number(r.marks) : m.marks}, ${clean(r.source, 200) || m.source}, ${cr}, ${m.examCategory}, ${me.id}, 'PENDING_REVIEW', ${imp.id})`;
    ok++;
  }
  await sql`UPDATE question_imports SET accepted = ${ok}, rejected = ${bad} WHERE id = ${imp.id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "question.import", entity: "question_import", entityId: imp.id, meta: { accepted: ok, rejected: bad } });
  revalidatePath("/portal/questions");
  return { ok: `${ok} question${ok === 1 ? "" : "s"} imported as PENDING REVIEW${bad ? `; ${bad} rejected` : ""}.` };
}

export async function reviewQuestions(fd: FormData): Promise<void> {
  const me = await requirePerm("questions:view");
  const ids = fd.getAll("q").map(uuid).filter(Boolean) as string[];
  const op = clean(fd.get("op"), 12);
  const map: Record<string, string> = { approve: "APPROVED", reject: "REJECTED", archive: "ARCHIVED", pending: "PENDING_REVIEW" };
  const status = map[op];
  if (!status || ids.length === 0) return;
  const need = op === "approve" || op === "reject" ? "questions:approve" : "questions:edit";
  if (!can(me, need)) return;
  // Authors cannot approve their own questions (separation of duties) unless they are Super Admin.
  const rows = await sql`UPDATE questions SET status = ${status}, reviewed_by = ${me.id}, version = version + 1
                         WHERE id = ANY(${ids}) AND school_id = ${me.schoolId}
                           AND (${op !== "approve"} OR author_id IS DISTINCT FROM ${me.id} OR ${me.role === "super_admin"}) RETURNING id`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: `question.${op}`, entity: "question", meta: { count: rows.length } });
  revalidatePath("/portal/questions");
}
