import scheme from "@/data/nerdc-scheme.json";
import { sql } from "./db";
import type { Me } from "./auth";
import { childIds, studentOf } from "./scope";
import { CLASS_LEVELS } from "./logic/academics";

export const TERM_NAMES = ["First term", "Second term", "Third term"];
export const levelName = (n: number) => CLASS_LEVELS.find((c) => c.level === n)?.name ?? `Level ${n}`;
export const LEVEL_OPTIONS = CLASS_LEVELS.map((c) => ({ value: String(c.level), label: c.name }));

export const weekNo = (w: string) => parseInt(w, 10) || 0;

/** Loads the NERDC 2025 scheme of work (JSS and SSS) into this school's curriculum. Safe to run again: existing topics are kept. */
export async function importScheme(schoolId: string): Promise<{ added: number; total: number }> {
  const rows = scheme as unknown as [number, string, number, string, string, string, number][];
  const [{ before }] = await sql`SELECT count(*)::int AS before FROM curriculum_topics WHERE school_id = ${schoolId}`;
  for (let i = 0; i < rows.length; i += 400) {
    const part = rows.slice(i, i + 400).map(([level, subject, term, week, topic, content, teaching]) => ({ level, subject, term, week, topic, content, teaching: teaching === 1 }));
    await sql`INSERT INTO curriculum_topics (school_id, level, subject, term, week, topic, content, teaching)
      SELECT ${schoolId}::uuid, level, subject, term, week, topic, content, teaching
      FROM jsonb_to_recordset(${sql.json(part as never)}) AS x(level int, subject text, term int, week text, topic text, content text, teaching boolean)
      ON CONFLICT DO NOTHING`;
  }
  const [{ after }] = await sql`SELECT count(*)::int AS after FROM curriculum_topics WHERE school_id = ${schoolId}`;
  return { added: after - before, total: after };
}

/** Class levels this person may study: a student's own, their children's, or all levels for staff. */
export async function visibleLevels(me: Me): Promise<{ level: number; label: string; studentId?: string }[]> {
  if (me.role === "student") {
    const s = await studentOf(me.id);
    return s?.class_level ? [{ level: s.class_level as number, label: levelName(s.class_level as number), studentId: s.id as string }] : [];
  }
  if (me.role === "parent") {
    const ids = await childIds(me.id);
    if (!ids.length) return [];
    const kids = await sql`SELECT s.id, s.first_name, c.level FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ANY(${ids})`;
    return kids.map((k) => ({ level: k.level as number, label: `${k.first_name} · ${levelName(k.level as number)}`, studentId: k.id as string }));
  }
  return CLASS_LEVELS.map((c) => ({ level: c.level, label: c.name }));
}
