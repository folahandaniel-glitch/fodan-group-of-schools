"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, rateLimit } from "@/lib/security";
import { getSetting } from "@/lib/settings";
import { distanceM, lateMinutes } from "@/lib/geo";

export type ClockResult = { ok?: string; error?: string; state?: "in" | "out" };
type Rules = { workStart: string; graceMinutes: number; perMinute: number; lateFlat: number; enabled: boolean };

/** Position is checked on the server against the staff member's branch; the browser's claim is never trusted blindly. */
export async function clock(kind: "in" | "out", lat: number, lng: number, accuracy: number): Promise<ClockResult> {
  const me = await requirePerm("clock:create");
  if (!(await rateLimit(`clock:${me.id}`, 20, 3600))) return { error: "Too many attempts. Try again shortly." };
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { error: "Your location could not be read. Allow location access and try again." };
  const [p] = await sql`SELECT branch_id FROM staff_profiles WHERE user_id = ${me.id}`;
  if (!p?.branch_id) return { error: "You are not assigned to a branch yet. Ask school management to assign one." };
  const [b] = await sql`SELECT id, name, lat, lng, radius_m FROM branches WHERE id = ${p.branch_id} AND active`;
  if (!b || b.lat == null) return { error: "Your branch has no coordinates set yet." };
  const dist = distanceM({ lat, lng }, { lat: b.lat, lng: b.lng });
  const allowed = b.radius_m + Math.min(Math.max(accuracy || 0, 0), 100);
  if (dist > allowed) {
    await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: `clock.${kind}.refused`, meta: { dist, branch: b.name } });
    return { error: `You are about ${dist} m from ${b.name}. Move within ${b.radius_m} m of the branch to clock ${kind}.` };
  }
  const rules = ((await getSetting<Rules>("fines")) ?? {}) as Rules;
  const wat = new Date(Date.now() + 3600_000); // West Africa Time (UTC+1)
  const day = wat.toISOString().slice(0, 10), hm = wat.toISOString().slice(11, 16);
  if (kind === "in") {
    const late = lateMinutes(hm, rules.workStart ?? "08:00", rules.graceMinutes ?? 10);
    const r = await sql`INSERT INTO clock_entries (school_id, user_id, branch_id, day, clock_in, in_lat, in_lng, in_dist_m, late_minutes)
      VALUES (${me.schoolId}, ${me.id}, ${b.id}, ${day}, now(), ${lat}, ${lng}, ${dist}, ${late}) ON CONFLICT (user_id, day) DO NOTHING RETURNING id`;
    if (r.length === 0) return { error: "You have already clocked in today." };
    if (late > 0 && rules.enabled) {
      const amount = (rules.lateFlat ?? 0) + (rules.perMinute ?? 0) * late;
      const [notice] = await sql`SELECT 1 FROM clock_notices WHERE user_id = ${me.id} AND day = ${day}`;
      // A fine is still recorded, but it is marked when the staff member explained beforehand, so HR can waive it.
      if (amount > 0) await sql`INSERT INTO fines (school_id, user_id, day, reason, amount) VALUES (${me.schoolId}, ${me.id}, ${day}, ${`Late by ${late} minutes${notice ? " (reason given beforehand)" : ""}`}, ${amount}) ON CONFLICT DO NOTHING`;
    }
    await audit({ schoolId: me.schoolId, actorId: me.id, action: "clock.in", meta: { dist, late } });
    revalidatePath("/portal/clock");
    return { state: "in", ok: late > 0 ? `Clocked in at ${hm}. You are ${late} minutes late.` : `Clocked in at ${hm}. On time.` };
  }
  const r = await sql`UPDATE clock_entries SET clock_out = now(), out_lat = ${lat}, out_lng = ${lng}, out_dist_m = ${dist}
                      WHERE user_id = ${me.id} AND day = ${day} AND clock_in IS NOT NULL AND clock_out IS NULL RETURNING id`;
  if (r.length === 0) return { error: "No open clock-in found for today." };
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "clock.out", meta: { dist } });
  revalidatePath("/portal/clock");
  return { state: "out", ok: `Clocked out at ${hm}.` };
}

/** Tell the office you will be late or absent. This does not clock you in: you can still clock in later, once you are within your branch's range. */
export async function submitClockNotice(kind: string, reason: string): Promise<ClockResult> {
  const me = await requirePerm("clock:create");
  if (!(await rateLimit(`notice:${me.id}`, 10, 3600))) return { error: "Too many attempts. Try again shortly." };
  const why = String(reason ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
  if (!["late", "absent"].includes(kind)) return { error: "Choose whether you will be late or absent." };
  if (why.length < 5) return { error: "Write the reason in a few words." };
  const day = new Date(Date.now() + 3600_000).toISOString().slice(0, 10);
  await sql`INSERT INTO clock_notices (school_id, user_id, day, kind, reason) VALUES (${me.schoolId}, ${me.id}, ${day}, ${kind}, ${why})
            ON CONFLICT (user_id, day) DO UPDATE SET kind = EXCLUDED.kind, reason = EXCLUDED.reason, created_at = now()`;
  await sql`INSERT INTO notifications (user_id, title, body, link)
            SELECT id, ${`${me.name} will be ${kind === "late" ? "late" : "absent"} today`}, ${why.slice(0, 160)}, '/portal/clock'
            FROM users WHERE school_id = ${me.schoolId} AND status = 'active' AND role IN ('vp_admin','hr_manager','hr_admin','super_admin') AND id <> ${me.id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "clock.notice", meta: { kind } });
  revalidatePath("/portal/clock");
  return { ok: kind === "late" ? "Your office has been told you will be late. You can still clock in when you arrive." : "Your office has been told you will be absent." };
}
