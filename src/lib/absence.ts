import { sql } from "./db";
import { getSetting } from "./settings";

type Rules = { absentFine: number; enabled: boolean };

/** Fines for staff who were expected at school on `day` and neither clocked in, were marked present/late/on leave, had approved leave, nor had their reason accepted.
 *  Safe to run twice: a fine is recorded once per person per day. Weekends and listed public holidays are skipped. */
export async function applyAbsenceFines(schoolId: string, day: string, by: string | null): Promise<{ checked: number; fined: number; skipped?: string }> {
  const rules = ((await getSetting<Rules>("fines")) ?? { absentFine: 0, enabled: false }) as Rules;
  if (!rules.enabled || !(rules.absentFine > 0)) return { checked: 0, fined: 0, skipped: "Fines are switched off or the absence fine is 0." };
  const dow = (new Date(day + "T00:00:00Z").getUTCDay() + 6) % 7;
  if (dow > 4) return { checked: 0, fined: 0, skipped: "That day is a weekend." };
  const [h] = await sql`SELECT name FROM hr_holidays WHERE school_id = ${schoolId} AND day = ${day}`;
  if (h) return { checked: 0, fined: 0, skipped: `${h.name} is a public holiday.` };

  const staff = await sql`
    SELECT u.id, (SELECT status FROM clock_notices n WHERE n.user_id = u.id AND n.day = ${day}) AS notice
    FROM users u JOIN staff_profiles p ON p.user_id = u.id
    WHERE u.school_id = ${schoolId} AND u.status = 'active' AND u.role NOT IN ('student','parent','developer') AND p.branch_id IS NOT NULL
      AND u.created_at < ${day}::date
      AND NOT EXISTS (SELECT 1 FROM clock_entries c WHERE c.user_id = u.id AND c.day = ${day})
      AND NOT EXISTS (SELECT 1 FROM roster_shifts rs WHERE rs.user_id = u.id AND rs.day = ${day} AND rs.shift = 'Off')
      AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.kind = 'staff' AND a.subject_ref = u.id AND a.day = ${day} AND a.status IN ('present','late','leave'))
      AND NOT EXISTS (SELECT 1 FROM records r WHERE r.module = 'leave' AND r.status = 'approved' AND r.owner_id = u.id
                      AND r.data->>'from' ~ '^\d{4}-\d{2}-\d{2}$' AND r.data->>'to' ~ '^\d{4}-\d{2}-\d{2}$'
                      AND (r.data->>'from')::date <= ${day}::date AND (r.data->>'to')::date >= ${day}::date)`;
  let fined = 0;
  for (const s of staff) {
    if (s.notice === "accepted") continue; // management accepted the reason: no fine
    const reason = `Absent without leave${s.notice ? " (reason given, awaiting decision)" : ""}`;
    const r = await sql`INSERT INTO fines (school_id, user_id, day, reason, amount, created_by) VALUES (${schoolId}, ${s.id}, ${day}, ${reason}, ${rules.absentFine}, ${by})
                        ON CONFLICT (user_id, day, reason) DO NOTHING RETURNING id`;
    if (r.length) {
      fined++;
      await sql`INSERT INTO notifications (user_id, title, body, link) VALUES (${s.id}, 'Absence fine recorded', ${`You were not clocked in on ${day}. Explain through the Clock in button, or ask HR to review.`}, '/portal/clock')`;
    }
  }
  return { checked: staff.length, fined };
}
