"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { can, requireMe, requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { isClassTeacherOf, watToday, wideScope } from "@/lib/scope";
import { getSchedule } from "@/lib/schedule-server";
import { availability, periodAt } from "@/lib/schedule";

type State = { error?: string; ok?: string };
const uuid = (v: unknown) => { const s = clean(v, 40); return /^[0-9a-f-]{36}$/i.test(s) ? s : null; };

/** Class teachers draft the timetable of their own class; school leaders may edit any class. Drafts stay hidden from students until published. */
export async function saveTimetable(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("timetable:edit");
  const classId = uuid(fd.get("classId"));
  if (!classId) return { error: "Choose a class." };
  const [c] = await sql`SELECT 1 FROM classes WHERE id = ${classId} AND school_id = ${me.schoolId}`;
  if (!c) return { error: "Class not found." };
  if (!wideScope(me) && !(await isClassTeacherOf(me.id, classId))) return { error: "You can only draft the timetable of the class you are class teacher of." };
  const publisher = can(me, "timetable:publish");
  const schedule = await getSchedule();
  const dayOnly = fd.get("day") === null ? null : Number(fd.get("day"));
  if (dayOnly !== null && !(dayOnly >= 0 && dayOnly <= 4)) return { error: "Choose a weekday." };
  const conflicts: string[] = [];
  const ops: { day: number; period: number; subject: string | null; teacher: string | null; room: string | null }[] = [];
  for (const [k, v] of fd.entries()) {
    const m = /^s_(\d)_(\d+)$/.exec(k);
    if (!m) continue;
    if (dayOnly !== null && Number(m[1]) !== dayOnly) continue;
    ops.push({ day: Number(m[1]), period: Number(m[2]), subject: uuid(v), teacher: uuid(fd.get(`t_${m[1]}_${m[2]}`)), room: clean(fd.get(`r_${m[1]}_${m[2]}`), 40) || null });
  }
  for (const o of ops) {
    // Lessons cannot sit in periods that are closed or marked "no lesson" for that weekday.
    if (!availability(schedule, o.day, o.period).open) { await sql`DELETE FROM timetable_slots WHERE class_id = ${classId} AND day = ${o.day} AND period = ${o.period}`; continue; }
    if (!o.subject) { await sql`DELETE FROM timetable_slots WHERE class_id = ${classId} AND day = ${o.day} AND period = ${o.period}`; continue; }
    if (o.teacher) {
      const [t] = await sql`SELECT 1 FROM users WHERE id = ${o.teacher} AND school_id = ${me.schoolId} AND role NOT IN ('student','parent','developer')`;
      if (!t) continue;
      const [clash] = await sql`SELECT c.name, c.arm FROM timetable_slots t JOIN classes c ON c.id = t.class_id
                                WHERE t.teacher_id = ${o.teacher} AND t.day = ${o.day} AND t.period = ${o.period} AND t.class_id <> ${classId}`;
      if (clash) { conflicts.push(`Day ${o.day + 1}, period ${o.period}: teacher already teaches ${clash.name}${clash.arm}`); continue; }
    }
    // A changed slot saved by someone who cannot publish returns to draft, so nothing unreviewed reaches students. Unchanged slots stay as they were.
    await sql`INSERT INTO timetable_slots (school_id, class_id, subject_id, teacher_id, day, period, room)
              VALUES (${me.schoolId}, ${classId}, ${o.subject}, ${o.teacher}, ${o.day}, ${o.period}, ${o.room})
              ON CONFLICT (class_id, day, period) DO UPDATE SET subject_id = EXCLUDED.subject_id, teacher_id = EXCLUDED.teacher_id, room = EXCLUDED.room
                ${publisher ? sql`` : sql`, published = CASE WHEN timetable_slots.subject_id IS DISTINCT FROM EXCLUDED.subject_id OR timetable_slots.teacher_id IS DISTINCT FROM EXCLUDED.teacher_id OR timetable_slots.room IS DISTINCT FROM EXCLUDED.room THEN false ELSE timetable_slots.published END`}`;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "timetable.save", entity: "class", entityId: classId, meta: { conflicts: conflicts.length, draft: !publisher } });
  revalidatePath("/portal/timetable");
  if (conflicts.length) return { error: `Saved, but ${conflicts.length} slot(s) were skipped due to teacher conflicts: ${conflicts.join("; ")}` };
  return { ok: publisher ? "Timetable saved." : "Draft saved. It goes live when a school leader publishes it." };
}

export async function publishTimetable(fd: FormData): Promise<void> {
  const me = await requirePerm("timetable:publish");
  const classId = uuid(fd.get("classId"));
  if (!classId) return;
  const publish = fd.get("publish") === "1";
  await sql`UPDATE timetable_slots SET published = ${publish} WHERE class_id = ${classId} AND school_id = ${me.schoolId}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: publish ? "timetable.publish" : "timetable.unpublish", entity: "class", entityId: classId });
  revalidatePath("/portal/timetable");
}

/** The subject teacher confirms they taught the timetabled period. Allowed on the slot's own day, from 10 minutes before the period starts. */
export async function registerPeriod(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  const id = uuid(fd.get("slot"));
  if (!id) return { error: "Period not found." };
  const [slot] = await sql`SELECT * FROM timetable_slots WHERE id = ${id} AND school_id = ${me.schoolId} AND teacher_id = ${me.id} AND published`;
  if (!slot) return { error: "This period is not assigned to you." };
  const now = watToday();
  if (slot.day !== now.dow) return { error: "You can only register a period on the day it is timetabled." };
  const w = periodAt(await getSchedule(), slot.day, slot.period);
  if (w && now.minutes < w.start - 10) return { error: "This period has not started yet." };
  const status = w && now.minutes > w.end + 5 ? "late" : "on_time";
  const r = await sql`INSERT INTO period_registers (school_id, class_id, subject_id, teacher_id, day, period, status, note)
                      VALUES (${me.schoolId}, ${slot.class_id}, ${slot.subject_id}, ${me.id}, ${now.day}, ${slot.period}, ${status}, ${clean(fd.get("note"), 200) || null})
                      ON CONFLICT (class_id, day, period) DO NOTHING RETURNING id`;
  if (!r.length) return { error: "This period is already registered." };
  revalidatePath("/portal/timetable");
  return { ok: status === "late" ? "Registered (recorded as late)." : "Registered. Thank you." };
}
