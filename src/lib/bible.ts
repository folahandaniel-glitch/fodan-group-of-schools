import books from "@/data/bible/books.json";
import { sql } from "./db";
import { getSchool } from "./settings";

export type BookInfo = { n: number; name: string; ch: number };
export const BOOKS = books as BookInfo[];
export const bookName = (n: number) => BOOKS.find((b) => b.n === n)?.name ?? "";

const USFM = ["GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA","1KI","2KI","1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO","ECC","SNG","ISA","JER","LAM","EZK","DAN","HOS","JOL","AMO","OBA","JON","MIC","NAM","HAB","ZEP","HAG","ZEC","MAL",
  "MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH","PHP","COL","1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS","1PE","2PE","1JN","2JN","3JN","JUD","REV"];

export type Version = { code: string; name: string; source: string; api_bible_id: string; license: string; active: boolean };

export async function versions(): Promise<Version[]> {
  const school = await getSchool();
  return (await sql`SELECT code, name, source, api_bible_id, license, active FROM bible_versions WHERE school_id = ${school.id} ORDER BY sort, code`) as unknown as Version[];
}

export type Passage = { verses: string[] } | { text: string } | { missing: string };

/** KJV ships with the app (public domain). Other versions come from text the school has loaded, or from API.Bible with the school's own key. */
export async function chapter(v: Version, book: number, ch: number): Promise<Passage> {
  const info = BOOKS.find((b) => b.n === book);
  if (!info || ch < 1 || ch > info.ch) return { missing: "That chapter does not exist." };
  if (v.source === "file") {
    const mod = await import(`@/data/bible/kjv/${String(book).padStart(2, "0")}.json`);
    const chapters = (mod.default ?? mod) as string[][];
    return { verses: chapters[ch - 1] ?? [] };
  }
  const school = await getSchool();
  const [row] = await sql`SELECT verses FROM bible_chapters WHERE school_id = ${school.id} AND version = ${v.code} AND book_no = ${book} AND chapter = ${ch}`;
  if (row) return { verses: row.verses as string[] };
  const key = process.env.BIBLE_API_KEY;
  if (v.api_bible_id && key) {
    try {
      const r = await fetch(`https://api.scripture.api.bible/v1/bibles/${encodeURIComponent(v.api_bible_id)}/chapters/${USFM[book - 1]}.${ch}?content-type=text&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true`,
        { headers: { "api-key": key }, next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000) });
      if (r.ok) { const j = await r.json(); const t = String(j?.data?.content ?? "").trim(); if (t) return { text: t }; }
    } catch { /* fall through */ }
  }
  return { missing: `${v.name} is licensed text and has not been loaded yet. A Super Admin can load it from the Bible page (Manage versions) once the school holds the licence.` };
}

/** Plain-text search through the bundled KJV (and any loaded version). Returns at most `limit` verse hits. */
export async function search(v: Version, q: string, limit = 40): Promise<{ book: number; ch: number; verse: number; text: string }[]> {
  const needle = q.toLowerCase();
  const out: { book: number; ch: number; verse: number; text: string }[] = [];
  if (v.source === "file") {
    for (const b of BOOKS) {
      const mod = await import(`@/data/bible/kjv/${String(b.n).padStart(2, "0")}.json`);
      const chapters = (mod.default ?? mod) as string[][];
      for (let c = 0; c < chapters.length; c++) for (let i = 0; i < chapters[c].length; i++) {
        if (chapters[c][i].toLowerCase().includes(needle)) { out.push({ book: b.n, ch: c + 1, verse: i + 1, text: chapters[c][i] }); if (out.length >= limit) return out; }
      }
    }
    return out;
  }
  const school = await getSchool();
  const rows = await sql`SELECT book_no, chapter, verses FROM bible_chapters WHERE school_id = ${school.id} AND version = ${v.code} AND verses::text ILIKE ${"%" + needle.replace(/[%_\\]/g, "") + "%"} ORDER BY book_no, chapter LIMIT 20`;
  for (const r of rows) (r.verses as string[]).forEach((t, i) => { if (t.toLowerCase().includes(needle) && out.length < limit) out.push({ book: r.book_no, ch: r.chapter, verse: i + 1, text: t }); });
  return out;
}

export async function seedBible(schoolId: string): Promise<void> {
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM bible_versions WHERE school_id = ${schoolId}`;
  if (n > 0) return;
  const rows: [string, string, string, string, number][] = [
    ["KJV", "King James Version", "file", "Public domain.", 1],
    ["NIV", "New International Version", "db", "Copyrighted (Biblica). Load only with a licence, or connect API.Bible.", 2],
    ["GNB", "Good News Bible", "db", "Copyrighted (United Bible Societies). Load only with a licence, or connect API.Bible.", 3],
  ];
  for (const [code, name, source, license, sort] of rows)
    await sql`INSERT INTO bible_versions (school_id, code, name, source, license, sort) VALUES (${schoolId}, ${code}, ${name}, ${source}, ${license}, ${sort}) ON CONFLICT DO NOTHING`;
}
