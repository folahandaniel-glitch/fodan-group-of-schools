"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { can, requireMe } from "@/lib/auth";
import { audit, clean } from "@/lib/security";

type State = { error?: string; ok?: string };

async function gate() {
  const me = await requireMe();
  if (!can(me, "cms:edit") && !can(me, "settings:edit") && !can(me, "*")) throw new Error("denied");
  return me;
}

async function validBook(schoolId: string, code: string) {
  const [b] = await sql`SELECT 1 FROM hymn_books WHERE school_id = ${schoolId} AND code = ${code}`;
  return !!b;
}

export async function saveHymn(_p: State, fd: FormData): Promise<State> {
  let me;
  try { me = await gate(); } catch { return { error: "You do not have permission." }; }
  const book = clean(fd.get("book"), 20);
  const title = clean(fd.get("title"), 160);
  const lyrics = String(fd.get("lyrics") ?? "").slice(0, 8000).trim();
  const number = Number(fd.get("number")) || null;
  if (!title || !lyrics || !(await validBook(me.schoolId, book))) return { error: "Choose a book and enter a title and the words." };
  const id = clean(fd.get("id"), 40);
  if (id) await sql`UPDATE hymns SET book = ${book}, number = ${number}, title = ${title}, author = ${clean(fd.get("author"), 160)}, lyrics = ${lyrics} WHERE id = ${id} AND school_id = ${me.schoolId}`;
  else await sql`INSERT INTO hymns (school_id, book, number, title, author, lyrics) VALUES (${me.schoolId}, ${book}, ${number}, ${title}, ${clean(fd.get("author"), 160)}, ${lyrics})
                 ON CONFLICT (school_id, book, lower(title)) DO UPDATE SET number = EXCLUDED.number, author = EXCLUDED.author, lyrics = EXCLUDED.lyrics`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "hymn.save", entity: "hymn" });
  revalidatePath("/portal/hymns");
  return { ok: "Hymn saved." };
}

export async function deleteHymn(fd: FormData): Promise<void> {
  const me = await gate();
  const id = clean(fd.get("id"), 40);
  if (/^[0-9a-f-]{36}$/i.test(id)) await sql`DELETE FROM hymns WHERE id = ${id} AND school_id = ${me.schoolId}`;
  revalidatePath("/portal/hymns");
}

/** Bulk import. Hymns are separated by a line containing only ===. First line: number | title | author. The rest are the words. */
export async function importHymns(_p: State, fd: FormData): Promise<State> {
  let me;
  try { me = await gate(); } catch { return { error: "You do not have permission." }; }
  const book = clean(fd.get("book"), 20);
  if (!(await validBook(me.schoolId, book))) return { error: "Choose a hymn book." };
  if (fd.get("rights") !== "on") return { error: "Confirm that the school may use these hymn texts." };
  let text = String(fd.get("text") ?? "");
  const f = fd.get("file") as File | null;
  if (f && f.size > 0) { if (f.size > 4 * 1024 * 1024) return { error: "File is larger than 4 MB." }; text = await f.text(); }
  const blocks = text.replace(/\r/g, "").split(/\n\s*={3,}\s*\n/).map((b) => b.trim()).filter(Boolean).slice(0, 1500);
  let n = 0;
  for (const b of blocks) {
    const nl = b.indexOf("\n");
    if (nl < 0) continue;
    const [num, title, author] = b.slice(0, nl).split("|").map((x) => x.trim());
    const lyrics = b.slice(nl + 1).trim();
    if (!title || !lyrics) continue;
    await sql`INSERT INTO hymns (school_id, book, number, title, author, lyrics) VALUES (${me.schoolId}, ${book}, ${Number(num) || null}, ${title.slice(0, 160)}, ${(author ?? "").slice(0, 160)}, ${lyrics.slice(0, 8000)})
              ON CONFLICT (school_id, book, lower(title)) DO UPDATE SET number = EXCLUDED.number, author = EXCLUDED.author, lyrics = EXCLUDED.lyrics`;
    n++;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "hymn.import", entity: "hymn", meta: { book, count: n } });
  revalidatePath("/portal/hymns");
  return n ? { ok: `${n} hymn${n === 1 ? "" : "s"} imported.` } : { error: "Nothing imported. Check the format shown above the box." };
}
