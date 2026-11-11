import readXlsxFile from "read-excel-file/node";

export const COLUMNS = ["admission_no", "first_name", "middle_name", "last_name", "gender", "date_of_birth", "class", "guardian_name", "guardian_phone", "guardian_email"] as const;
export type StudentRow = Record<(typeof COLUMNS)[number], string>;

const norm = (h: string) => h.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");
const ALIAS: Record<string, (typeof COLUMNS)[number]> = {
  admission_number: "admission_no", admission: "admission_no", adm_no: "admission_no", surname: "last_name", lastname: "last_name", firstname: "first_name", other_names: "middle_name",
  dob: "date_of_birth", birth_date: "date_of_birth", sex: "gender", class_name: "class", guardian: "guardian_name", parent_name: "guardian_name", parent_phone: "guardian_phone", phone: "guardian_phone", parent_email: "guardian_email", email: "guardian_email",
};

function csv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === "," || c === ";" || c === "\t") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); if (row.some((x) => x.trim())) rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  row.push(cur); if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

const text = (v: unknown): string => (v == null ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim());

/** "2013-04-02", "02/04/2013" (day first) or an Excel date become YYYY-MM-DD; anything else is returned empty. */
export function ymdOf(v: string): string {
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
}

export async function parseStudents(name: string, buf: Buffer): Promise<{ rows: StudentRow[]; error?: string }> {
  const ext = name.split(".").pop()?.toLowerCase();
  let table: unknown[][];
  try {
    if (ext === "xlsx") { const wb = await readXlsxFile(buf); table = (Array.isArray(wb) && (wb[0] as { data?: unknown[][] })?.data ? (wb[0] as { data: unknown[][] }).data : (wb as unknown as unknown[][])); }
    else if (ext === "csv" || ext === "txt") table = csv(buf.toString("utf8").replace(/^﻿/, ""));
    else return { rows: [], error: "Upload an Excel (.xlsx) or CSV file." };
  } catch { return { rows: [], error: "The file could not be read. Use the template." }; }
  if (table.length < 2) return { rows: [], error: "The file has no student rows." };
  const head = table[0].map((h) => { const n = norm(text(h)); return ALIAS[n] ?? (COLUMNS as readonly string[]).includes(n) ? (ALIAS[n] ?? (n as (typeof COLUMNS)[number])) : null; });
  if (!head.includes("admission_no") || !head.includes("first_name") || !head.includes("last_name")) return { rows: [], error: "The first row must name the columns: admission_no, first_name and last_name are required. Download the template." };
  const rows = table.slice(1).map((r) => {
    const o = Object.fromEntries(COLUMNS.map((c) => [c, ""])) as StudentRow;
    head.forEach((h, i) => { if (h) o[h] = text(r[i]); });
    return o;
  }).filter((r) => r.admission_no || r.first_name || r.last_name);
  return { rows };
}
