import { sql } from "./db";
import { ENTRIES, TOPICS } from "@/data/knowledge";
import { DICTIONARY } from "@/data/dictionary";

/** Loads the starter Knowledge Hub once per school, then tops up the school's own dictionary. Nothing is fetched from outside. */
export async function ensureKnowledge(schoolId: string): Promise<void> {
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM kh_entries WHERE school_id = ${schoolId}`;
  if (n === 0) {
    const rows = TOPICS.flatMap((t) => (ENTRIES[t.key] ?? []).map(([title, body]) => ({ topic: t.key, title, body, audience: t.audience })));
    await sql`INSERT INTO kh_entries (school_id, topic, title, body, audience)
      SELECT ${schoolId}::uuid, topic, title, body, audience FROM jsonb_to_recordset(${sql.json(rows as never)}) AS x(topic text, title text, body text, audience text) ON CONFLICT DO NOTHING`;
  }
  const [{ d }] = await sql`SELECT count(*)::int AS d FROM kh_entries WHERE school_id = ${schoolId} AND topic = 'dictionary'`;
  if (d < DICTIONARY.length) {
    const rows = DICTIONARY.map((w) => ({ topic: "dictionary", title: w.word, body: `(${w.pos}) ${w.meaning}`, audience: "all" }));
    await sql`INSERT INTO kh_entries (school_id, topic, title, body, audience)
      SELECT ${schoolId}::uuid, topic, title, body, audience FROM jsonb_to_recordset(${sql.json(rows as never)}) AS x(topic text, title text, body text, audience text) ON CONFLICT DO NOTHING`;
  }
}
