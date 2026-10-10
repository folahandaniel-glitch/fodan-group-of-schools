import { cache } from "react";
import { sql } from "./db";
import { getSchool } from "./settings";

export type Item = { id: string; kind: string; title: string; body: string; data: Record<string, any>; sort: number; created_at: string; published: boolean; audience: string };

export const publicContent = cache(async (): Promise<Record<string, Item[]>> => {
  const school = await getSchool();
  const rows = (await sql`
    SELECT id, kind, title, body, data, sort, created_at, published, audience FROM content_items
    WHERE school_id = ${school.id} AND published = true AND audience = 'public'
    ORDER BY sort ASC, created_at DESC`) as unknown as Item[];
  const out: Record<string, Item[]> = {};
  for (const r of rows) (out[r.kind] ??= []).push(r);
  return out;
});

export const CONTENT_KINDS: { kind: string; label: string; note: string }[] = [
  { kind: "news", label: "News", note: "Short news stories shown on the homepage and News page." },
  { kind: "event", label: "Events", note: "Upcoming events. Put the date in the title or body." },
  { kind: "announcement", label: "Public announcements", note: "Important notices shown above the news." },
  { kind: "programme", label: "Programmes", note: "Academic programmes by section." },
  { kind: "facility", label: "Facilities", note: "Facilities and learning tools." },
  { kind: "activity", label: "School activities", note: "Clubs, sports and enrichment." },
  { kind: "faq", label: "FAQ", note: "Frequently asked questions." },
];
