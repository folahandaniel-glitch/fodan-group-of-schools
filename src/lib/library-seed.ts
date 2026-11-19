import { sql } from "./db";
import { EBOOKS } from "@/data/ebooks";

/** Loads the free textbooks into a school's library once (and adds any that are new later). */
export async function ensureLibrary(schoolId: string): Promise<void> {
  const have = new Set((await sql`SELECT url FROM lib_books WHERE school_id = ${schoolId} AND url IS NOT NULL`).map((r) => r.url as string));
  const add = EBOOKS.filter((b) => !have.has(b.url));
  if (add.length === 0) return;
  const rows = add.map((b) => ({ title: b.title, author: b.author, category: b.category, level: b.level, url: b.url, summary: b.summary }));
  await sql`INSERT INTO lib_books (school_id, title, author, category, copies, url, level, summary, shelf)
    SELECT ${schoolId}::uuid, title, author, category, 0, url, level, summary, 'E-library' FROM jsonb_to_recordset(${sql.json(rows as never)}) AS x(title text, author text, category text, level text, url text, summary text)`;
}
