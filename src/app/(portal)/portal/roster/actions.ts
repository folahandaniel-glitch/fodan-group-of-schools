"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";

type State = { error?: string; ok?: string };
const SHIFTS_LIST = ["Morning", "Afternoon", "Night", "Weekend duty", "Off"];
const UUID = /^[0-9a-f-]{36}$/i;

/** Saves the whole week grid in one go: a blank cell clears the shift. */
export async function saveRoster(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("hrm:manage");
  const monday = clean(fd.get("week"), 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(monday)) return { error: "Choose a week." };
  let saved = 0, cleared = 0;
  for (const [k, v] of fd.entries()) {
    const m = /^r_([0-9a-f-]{36})_(\d)$/i.exec(k);
    if (!m || !UUID.test(m[1])) continue;
    const shift = clean(v, 20);
    const offset = Number(m[2]);
    const [u] = await sql`SELECT 1 FROM users WHERE id = ${m[1]} AND school_id = ${me.schoolId} AND role NOT IN ('student','parent','developer')`;
    if (!u) continue;
    if (!shift) { await sql`DELETE FROM roster_shifts WHERE user_id = ${m[1]} AND day = (${monday}::date + ${offset}::int)`; cleared++; continue; }
    if (!SHIFTS_LIST.includes(shift)) continue;
    await sql`INSERT INTO roster_shifts (school_id, user_id, day, shift, set_by) VALUES (${me.schoolId}, ${m[1]}, (${monday}::date + ${offset}::int), ${shift}, ${me.id})
              ON CONFLICT (user_id, day) DO UPDATE SET shift = EXCLUDED.shift, set_by = EXCLUDED.set_by`;
    saved++;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "roster.save", entity: "roster", meta: { week: monday, saved, cleared } });
  revalidatePath("/portal/roster");
  return { ok: `Roster saved (${saved} shifts).` };
}
