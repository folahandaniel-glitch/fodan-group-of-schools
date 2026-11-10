"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { can, requireMe } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { BOOKS } from "@/lib/bible";

type State = { error?: string; ok?: string };

async function gate() {
  const me = await requireMe();
  if (!can(me, "settings:edit") && !can(me, "cms:edit") && !can(me, "*")) throw new Error("denied");
  return me;
}

export async function saveVersion(_p: State, fd: FormData): Promise<State> {
  let me;
  try { me = await gate(); } catch { return { error: "You do not have permission." }; }
  const code = clean(fd.get("code"), 12).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) return { error: "Enter a version code." };
  const name = clean(fd.get("name"), 80) || code;
  const sort = Math.max(1, Math.min(99, Number(fd.get("sort")) || 50));
  const isNew = fd.get("isNew") === "1";
  if (isNew) {
    await sql`INSERT INTO bible_versions (school_id, code, name, source, api_bible_id, license, active, sort)
              VALUES (${me.schoolId}, ${code}, ${name}, 'db', ${clean(fd.get("apiId"), 60)}, ${clean(fd.get("license"), 200)}, true, ${sort})
              ON CONFLICT (school_id, code) DO NOTHING`;
  } else {
    await sql`UPDATE bible_versions SET name = ${name}, api_bible_id = ${clean(fd.get("apiId"), 60)}, license = ${clean(fd.get("license"), 200)},
              active = ${fd.get("active") === "on"}, sort = ${sort} WHERE school_id = ${me.schoolId} AND code = ${code}`;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "bible.version", entity: "bible", entityId: code });
  revalidatePath("/portal/bible");
  return { ok: `${code} saved.` };
}

/** Loads a licensed version from a JSON file: an array of 66 books, each { chapters: [[verse, ...], ...] } (same shape as the bundled KJV). */
export async function loadVersionText(_p: State, fd: FormData): Promise<State> {
  let me;
  try { me = await gate(); } catch { return { error: "You do not have permission." }; }
  const code = clean(fd.get("code"), 12).toUpperCase();
  const f = fd.get("file") as File | null;
  if (!f || f.size === 0) return { error: "Choose the JSON file." };
  if (f.size > 12 * 1024 * 1024) return { error: "File is larger than 12 MB." };
  const [v] = await sql`SELECT source FROM bible_versions WHERE school_id = ${me.schoolId} AND code = ${code}`;
  if (!v || v.source === "file") return { error: "Unknown or built-in version." };
  if (fd.get("licensed") !== "on") return { error: "Confirm that the school holds the licence to use this text." };
  let data: unknown;
  try { data = JSON.parse(await f.text()); } catch { return { error: "The file is not valid JSON." }; }
  if (!Array.isArray(data) || data.length !== BOOKS.length) return { error: `Expected ${BOOKS.length} books in canonical order.` };
  const rows: { school_id: string; version: string; book_no: number; chapter: number; verses: string[] }[] = [];
  for (let i = 0; i < BOOKS.length; i++) {
    const ch = (data[i] as { chapters?: unknown })?.chapters;
    if (!Array.isArray(ch) || ch.length !== BOOKS[i].ch) return { error: `${BOOKS[i].name} should have ${BOOKS[i].ch} chapters.` };
    ch.forEach((vs, c) => {
      if (!Array.isArray(vs) || !vs.every((x) => typeof x === "string")) throw new Error(`Bad verses in ${BOOKS[i].name} ${c + 1}`);
      rows.push({ school_id: me.schoolId, version: code, book_no: i + 1, chapter: c + 1, verses: vs as string[] });
    });
  }
  await sql`DELETE FROM bible_chapters WHERE school_id = ${me.schoolId} AND version = ${code}`;
  for (let i = 0; i < rows.length; i += 200) {
    const part = rows.slice(i, i + 200).map((r) => ({ ...r, verses: JSON.stringify(r.verses) }));
    await sql`INSERT INTO bible_chapters (school_id, version, book_no, chapter, verses)
              SELECT school_id::uuid, version, book_no::int, chapter::int, verses::jsonb
              FROM jsonb_to_recordset(${JSON.stringify(part)}::jsonb) AS x(school_id text, version text, book_no int, chapter int, verses text)`;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "bible.load", entity: "bible", entityId: code, meta: { chapters: rows.length } });
  revalidatePath("/portal/bible");
  return { ok: `${code} loaded: ${rows.length} chapters.` };
}
