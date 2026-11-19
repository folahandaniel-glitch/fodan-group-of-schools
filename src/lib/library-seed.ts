import { sql } from "./db";
import { BOOKS, HOUSE } from "@/data/books";

/** The library holds books written for the school and read inside the portal. Links to other websites are removed. */
export async function ensureLibrary(schoolId: string): Promise<void> {
  await sql`DELETE FROM lib_books WHERE school_id = ${schoolId} AND url IS NOT NULL AND chapters IS NULL`;
  const have = new Set((await sql`SELECT title FROM lib_books WHERE school_id = ${schoolId} AND chapters IS NOT NULL`).map((r) => r.title as string));
  const add = BOOKS.filter((b) => !have.has(b.title));
  for (const b of add) await sql`INSERT INTO lib_books (school_id, title, author, category, copies, level, summary, shelf, chapters)
    VALUES (${schoolId}, ${b.title}, ${HOUSE}, ${b.category}, 0, ${b.level}, ${b.summary}, 'In-app library', ${sql.json(b.chapters as never)})`;
}
