"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { requireMe, requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { childIds } from "@/lib/scope";
import { post } from "@/lib/ledger";

type State = { error?: string; ok?: string };
const UUID = /^[0-9a-f-]{36}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const refresh = (id?: string) => { revalidatePath("/portal/holiday"); if (id) revalidatePath(`/portal/holiday/${id}`); };

export async function createProgramme(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("holiday:manage");
  const title = clean(fd.get("title"), 160), subject = clean(fd.get("subject"), 80);
  const level = Number(fd.get("level")), term = Number(fd.get("term")) || null;
  const starts = clean(fd.get("starts"), 10), ends = clean(fd.get("ends"), 10);
  if (title.length < 3 || !(level >= 1 && level <= 12)) return { error: "Enter a title and choose the class." };
  if (!DATE.test(starts) || !DATE.test(ends) || ends < starts) return { error: "Enter valid dates. The programme cannot end before it starts." };
  const fee = Math.min(Math.max(Number(fd.get("fee")) || 0, 0), 1e9);
  const capacity = Number(fd.get("capacity")) > 0 ? Math.min(Math.round(Number(fd.get("capacity"))), 5000) : null;
  let sessions: { title: string; topic: string | null }[] = [];
  if (subject && term) {
    const t = await sql`SELECT id, topic, week FROM curriculum_topics WHERE school_id = ${me.schoolId} AND level = ${level} AND term = ${term} AND lower(subject) = lower(${subject}) AND teaching`;
    sessions = t.sort((a, b) => (parseInt(a.week, 10) || 0) - (parseInt(b.week, 10) || 0)).map((x) => ({ title: x.topic as string, topic: x.id as string }));
  }
  const manual = String(fd.get("sessions") ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 60);
  if (manual.length) sessions = manual.map((s) => ({ title: s.slice(0, 200), topic: null }));
  if (sessions.length === 0) return { error: "No sessions. Load the scheme of work and pick a subject and term, or type the session titles (one per line)." };
  const [p] = await sql`INSERT INTO holiday_programmes (school_id, title, level, subject, term, starts_on, ends_on, fee, capacity, created_by)
    VALUES (${me.schoolId}, ${title}, ${level}, ${subject}, ${term}, ${starts}, ${ends}, ${fee}, ${capacity}, ${me.id}) RETURNING id`;
  for (const [i, s] of sessions.entries()) await sql`INSERT INTO holiday_sessions (programme_id, session_no, title, topic_id) VALUES (${p.id}, ${i + 1}, ${s.title}, ${s.topic})`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "holiday.create", entity: "holiday_programme", entityId: p.id, meta: { sessions: sessions.length } });
  refresh();
  return { ok: `Programme created with ${sessions.length} sessions.` };
}

export async function updateProgramme(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("holiday:manage");
  const id = clean(fd.get("id"), 40), title = clean(fd.get("title"), 160);
  const starts = clean(fd.get("starts"), 10), ends = clean(fd.get("ends"), 10);
  if (!UUID.test(id) || title.length < 3) return { error: "Enter a title." };
  if (!DATE.test(starts) || !DATE.test(ends) || ends < starts) return { error: "Enter valid dates." };
  const fee = Math.min(Math.max(Number(fd.get("fee")) || 0, 0), 1e9);
  const capacity = Number(fd.get("capacity")) > 0 ? Math.round(Number(fd.get("capacity"))) : null;
  await sql`UPDATE holiday_programmes SET title = ${title}, starts_on = ${starts}, ends_on = ${ends}, fee = ${fee}, capacity = ${capacity}, active = ${fd.get("active") === "on"}
            WHERE id = ${id} AND school_id = ${me.schoolId}`;
  refresh(id);
  return { ok: "Programme updated." };
}

export async function deleteProgramme(fd: FormData): Promise<void> {
  const me = await requirePerm("holiday:manage");
  const id = clean(fd.get("id"), 40);
  if (UUID.test(id)) await sql`DELETE FROM holiday_programmes WHERE id = ${id} AND school_id = ${me.schoolId}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "holiday.delete", entity: "holiday_programme", entityId: id });
  refresh();
  redirect("/portal/holiday");
}

/** Students enrol themselves; parents enrol their own linked children. Only the child's own class level, open programmes, capacity respected. */
export async function enrol(fd: FormData): Promise<void> {
  const me = await requireMe();
  const pid = clean(fd.get("programme"), 40), sid = clean(fd.get("student"), 40);
  if (!UUID.test(pid) || !UUID.test(sid)) return;
  if (me.role === "student") { const [s] = await sql`SELECT 1 FROM students WHERE id = ${sid} AND user_id = ${me.id}`; if (!s) return; }
  else if (me.role === "parent") { if (!(await childIds(me.id)).includes(sid)) return; }
  else { await requirePerm("holiday:manage"); }
  const [p] = await sql`SELECT hp.*, (SELECT count(*)::int FROM holiday_enrolments e WHERE e.programme_id = hp.id) AS taken FROM holiday_programmes hp WHERE hp.id = ${pid} AND hp.school_id = ${me.schoolId} AND hp.active AND hp.ends_on >= current_date`;
  const [st] = await sql`SELECT c.level FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ${sid} AND s.school_id = ${me.schoolId}`;
  if (!p || !st || st.level !== p.level || (p.capacity && p.taken >= p.capacity)) return;
  await sql`INSERT INTO holiday_enrolments (programme_id, student_id, enrolled_by, paid, paid_at) VALUES (${pid}, ${sid}, ${me.id}, ${Number(p.fee) === 0}, ${Number(p.fee) === 0 ? sql`now()` : null}) ON CONFLICT DO NOTHING`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "holiday.enrol", entity: "holiday_programme", entityId: pid, meta: { student: sid } });
  refresh(pid);
}

export async function unenrol(fd: FormData): Promise<void> {
  const me = await requireMe();
  const id = clean(fd.get("id"), 40);
  if (!UUID.test(id)) return;
  const [e] = await sql`SELECT e.id, e.paid, e.student_id, e.programme_id FROM holiday_enrolments e JOIN holiday_programmes p ON p.id = e.programme_id WHERE e.id = ${id} AND p.school_id = ${me.schoolId}`;
  if (!e) return;
  const kids = me.role === "parent" ? await childIds(me.id) : [];
  const [own] = me.role === "student" ? await sql`SELECT 1 FROM students WHERE id = ${e.student_id} AND user_id = ${me.id}` : [];
  const manager = me.perms.has("*") || me.perms.has("holiday:manage");
  if (!(manager || ((own || kids.includes(e.student_id)) && !e.paid))) return;
  await sql`DELETE FROM holiday_enrolments WHERE id = ${id}`;
  refresh(e.programme_id);
}

/** Records that the fee was received and books it as income. Safe to repeat: the ledger entry is keyed by the enrolment. */
export async function markPaid(fd: FormData): Promise<void> {
  const me = await requirePerm("holiday:manage");
  const id = clean(fd.get("id"), 40);
  if (!UUID.test(id)) return;
  const [e] = await sql`SELECT e.id, e.programme_id, p.fee, p.title, s.first_name, s.last_name FROM holiday_enrolments e JOIN holiday_programmes p ON p.id = e.programme_id
                        JOIN students s ON s.id = e.student_id WHERE e.id = ${id} AND p.school_id = ${me.schoolId}`;
  if (!e) return;
  await sql`UPDATE holiday_enrolments SET paid = true, paid_at = coalesce(paid_at, now()) WHERE id = ${id}`;
  await post({ schoolId: me.schoolId, description: `Holiday programme: ${e.title} (${e.first_name} ${e.last_name})`, debit: "1000", credit: "4100", amount: Number(e.fee), ref: `holiday:${id}`, by: me.id });
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "holiday.paid", entity: "holiday_enrolment", entityId: id, meta: { amount: Number(e.fee) } });
  refresh(e.programme_id);
}

export async function saveAttendance(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("holiday:manage");
  const pid = clean(fd.get("programme"), 40), no = Number(fd.get("session"));
  if (!UUID.test(pid) || !(no >= 1)) return { error: "Choose a session." };
  const [p] = await sql`SELECT 1 FROM holiday_programmes WHERE id = ${pid} AND school_id = ${me.schoolId}`;
  if (!p) return { error: "Programme not found." };
  const present = fd.getAll("present").map(String).filter((x) => UUID.test(x));
  await sql`DELETE FROM holiday_attendance WHERE programme_id = ${pid} AND session_no = ${no}`;
  for (const s of present)
    await sql`INSERT INTO holiday_attendance (programme_id, student_id, session_no, marked_by)
              SELECT ${pid}, student_id, ${no}, ${me.id} FROM holiday_enrolments WHERE programme_id = ${pid} AND student_id = ${s} AND paid ON CONFLICT DO NOTHING`;
  refresh(pid);
  return { ok: `Attendance saved for session ${no}.` };
}
