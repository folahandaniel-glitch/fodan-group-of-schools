"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";

type State = { error?: string; ok?: string };
const uuid = (v: unknown) => { const s = clean(v, 40); return /^[0-9a-f-]{36}$/i.test(s) ? s : null; };

export async function saveTimetable(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("timetable:edit");
  const classId = uuid(fd.get("classId"));
  if (!classId) return { error: "Choose a class." };
  const [c] = await sql`SELECT 1 FROM classes WHERE id = ${classId} AND school_id = ${me.schoolId}`;
  if (!c) return { error: "Class not found." };
  const conflicts: string[] = [];
  const ops: { day: number; period: number; subject: string | null; teacher: string | null; room: string | null }[] = [];
  for (const [k, v] of fd.entries()) {
    const m = /^s_(\d)_(\d+)$/.exec(k);
    if (!m) continue;
    ops.push({
      day: Number(m[1]), period: Number(m[2]), subject: uuid(v),
      teacher: uuid(fd.get(`t_${m[1]}_${m[2]}`)), room: clean(fd.get(`r_${m[1]}_${m[2]}`), 40) || null,
    });
  }
  for (const o of ops) {
    if (!o.subject) {
      await sql`DELETE FROM timetable_slots WHERE class_id = ${classId} AND day = ${o.day} AND period = ${o.period}`;
      continue;
    }
    if (o.teacher) {
      const [clash] = await sql`SELECT c.name, c.arm FROM timetable_slots t JOIN classes c ON c.id = t.class_id
                                WHERE t.teacher_id = ${o.teacher} AND t.day = ${o.day} AND t.period = ${o.period} AND t.class_id <> ${classId}`;
      if (clash) { conflicts.push(`Day ${o.day + 1}, period ${o.period}: teacher already teaches ${clash.name}${clash.arm}`); continue; }
    }
    await sql`INSERT INTO timetable_slots (school_id, class_id, subject_id, teacher_id, day, period, room)
              VALUES (${me.schoolId}, ${classId}, ${o.subject}, ${o.teacher}, ${o.day}, ${o.period}, ${o.room})
              ON CONFLICT (class_id, day, period) DO UPDATE SET subject_id = EXCLUDED.subject_id, teacher_id = EXCLUDED.teacher_id, room = EXCLUDED.room`;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "timetable.save", entity: "class", entityId: classId, meta: { conflicts: conflicts.length } });
  revalidatePath("/portal/timetable");
  if (conflicts.length) return { error: `Saved, but ${conflicts.length} slot(s) were skipped due to teacher conflicts: ${conflicts.join("; ")}` };
  return { ok: "Timetable saved." };
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
