import { sql } from "./db";
import { ENTRIES, TOPICS } from "@/data/knowledge";

/** Loads the starter Knowledge Hub once per school. Staff can add more entries afterwards. */
export async function ensureKnowledge(schoolId: string): Promise<void> {
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM kh_entries WHERE school_id = ${schoolId}`;
  if (n > 0) return;
  const rows = TOPICS.flatMap((t) => (ENTRIES[t.key] ?? []).map(([title, body]) => ({ topic: t.key, title, body, audience: t.audience })));
  await sql`INSERT INTO kh_entries (school_id, topic, title, body, audience)
    SELECT ${schoolId}::uuid, topic, title, body, audience FROM jsonb_to_recordset(${sql.json(rows as never)}) AS x(topic text, title text, body text, audience text) ON CONFLICT DO NOTHING`;
}

export type DictResult = { word: string; entries: { pos: string; defs: string[]; example?: string }[]; phonetic?: string } | { error: string };
/** Looks up any English word in the free dictionaryapi.dev service. Only the typed word is sent. */
export async function lookupWord(raw: string): Promise<DictResult> {
  const word = raw.trim().toLowerCase().replace(/[^a-z'-]/g, "").slice(0, 40);
  if (word.length < 2) return { error: "Type an English word." };
  try {
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } });
    if (r.status === 404) return { error: `No entry found for "${word}". Check the spelling.` };
    if (!r.ok) return { error: "The dictionary service is busy. Try again in a moment." };
    const j = (await r.json()) as { phonetic?: string; meanings?: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[] }[];
    const meanings = j.flatMap((x) => x.meanings ?? []).slice(0, 4);
    return { word, phonetic: j[0]?.phonetic, entries: meanings.map((m) => ({ pos: m.partOfSpeech, defs: m.definitions.slice(0, 3).map((d) => d.definition), example: m.definitions.find((d) => d.example)?.example })) };
  } catch { return { error: "Could not reach the dictionary. Check the connection and try again." }; }
}
