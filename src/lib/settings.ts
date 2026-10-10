import { cache } from "react";
import { ready, sql } from "./db";
import { DEFAULT_SETTINGS } from "./defaults";
import { SCHOOL_SLUG } from "./seed";

export const getSchool = cache(async () => {
  await ready();
  const [s] = await sql`SELECT id, slug, name, short_name FROM schools WHERE slug = ${SCHOOL_SLUG}`;
  return s as { id: string; slug: string; name: string; short_name: string };
});

export const allSettings = cache(async (): Promise<Record<string, any>> => {
  const school = await getSchool();
  const rows = await sql`SELECT key, value FROM settings WHERE school_id = ${school.id}`;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) out[k] = v;
  for (const r of rows) {
    const d = DEFAULT_SETTINGS[r.key];
    out[r.key] = Array.isArray(r.value) || typeof r.value !== "object" || r.value === null || d === undefined || Array.isArray(d)
      ? r.value
      : { ...(d as object), ...r.value };
  }
  return out;
});

export async function getSetting<T = any>(key: string): Promise<T> {
  return (await allSettings())[key] as T;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const school = await getSchool();
  await sql`INSERT INTO settings (school_id, key, value) VALUES (${school.id}, ${key}, ${sql.json(value as never)})
            ON CONFLICT (school_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
}

export const currentTerm = cache(async () => {
  const school = await getSchool();
  const [t] = await sql`
    SELECT t.id, t.name, s.id AS session_id, s.name AS session_name
    FROM terms t JOIN academic_sessions s ON s.id = t.session_id
    WHERE t.school_id = ${school.id} AND t.is_current = true LIMIT 1`;
  return (t ?? null) as { id: string; name: string; session_id: string; session_name: string } | null;
});

export function classLabel(c: { name: string; arm?: string | null; department?: string | null }): string {
  const base = c.arm ? (c.arm.length === 1 ? `${c.name}${c.arm}` : `${c.name} ${c.arm}`) : c.name;
  return c.department ? `${base} ${c.department}` : base;
}
