"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { can, requireMe } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { CRITERIA, RECRUIT_STAGES, nextStage, overallScore, workingDays } from "@/lib/logic/hr";

type State = { error?: string; ok?: string };
const UUID = /^[0-9a-f-]{36}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function staffOnly() {
  const me = await requireMe();
  if (["student", "parent"].includes(me.role)) throw new Error("Staff only");
  return me;
}
async function hr() {
  const me = await staffOnly();
  if (!(can(me, "hrm:manage") || can(me, "hrm:review"))) throw new Error("HR only");
  return me;
}

/* ---------- Leave ---------- */
export async function requestLeave(_p: State, fd: FormData): Promise<State> {
  const me = await staffOnly();
  const type = clean(fd.get("type"), 40), from = clean(fd.get("from"), 10), to = clean(fd.get("to"), 10), reason = clean(fd.get("reason"), 400);
  if (!UUID.test(type) || !DATE.test(from) || !DATE.test(to)) return { error: "Choose the leave type and both dates." };
  if (to < from) return { error: "The end date must be on or after the start date." };
  const [t] = await sql`SELECT id, name, days, paid FROM hr_leave_types WHERE id = ${type} AND school_id = ${me.schoolId} AND active`;
  if (!t) return { error: "Leave type not found." };
  const hol = (await sql`SELECT day::text AS d FROM hr_holidays WHERE school_id = ${me.schoolId} AND day BETWEEN ${from} AND ${to}`).map((r) => String(r.d).slice(0, 10));
  const days = workingDays(from, to, hol);
  if (days < 1) return { error: "That period has no working days." };
  const [{ used }] = await sql`SELECT COALESCE(sum(days), 0)::int AS used FROM hr_leave WHERE user_id = ${me.id} AND type_id = ${type} AND status IN ('approved','pending') AND extract(year FROM from_on) = ${Number(from.slice(0, 4))}`;
  if (t.days > 0 && used + days > t.days) return { error: `That would be ${used + days} days of ${t.name}. The yearly allowance is ${t.days} (you have ${Math.max(0, t.days - used)} left).` };
  const [clash] = await sql`SELECT 1 FROM hr_leave WHERE user_id = ${me.id} AND status IN ('approved','pending') AND from_on <= ${to} AND to_on >= ${from}`;
  if (clash) return { error: "You already have leave booked or waiting for approval in that period." };
  const [r] = await sql`INSERT INTO hr_leave (school_id, user_id, type_id, from_on, to_on, days, reason) VALUES (${me.schoolId}, ${me.id}, ${type}, ${from}, ${to}, ${days}, ${reason || null}) RETURNING id`;
  await sql`INSERT INTO notifications (user_id, title, body, link) SELECT id, ${`Leave request: ${me.name}`}, ${`${t.name}, ${days} working day(s) from ${from}`}, '/portal/hrm/leave' FROM users
    WHERE school_id = ${me.schoolId} AND status = 'active' AND role IN ('developer','super_admin','hr_manager','principal','headteacher','vp_admin','proprietor','director') AND id <> ${me.id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "leave.request", entity: "leave", entityId: r.id, meta: { days } });
  revalidatePath("/portal/hrm/leave");
  return { ok: `Request sent for ${days} working day${days === 1 ? "" : "s"}.` };
}

export async function decideLeave(fd: FormData): Promise<void> {
  const me = await hr();
  const id = clean(fd.get("id"), 40), op = clean(fd.get("op"), 10);
  if (!UUID.test(id) || !["approve", "reject", "cancel"].includes(op)) return;
  const [l] = await sql`SELECT id, user_id, status FROM hr_leave WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!l || (op !== "cancel" && l.status !== "pending") || l.user_id === me.id && op === "approve") return;
  const status = op === "approve" ? "approved" : op === "reject" ? "rejected" : "cancelled";
  await sql`UPDATE hr_leave SET status = ${status}, decided_by = ${me.id}, decided_at = now(), comment = ${clean(fd.get("comment"), 300) || null} WHERE id = ${id}`;
  await sql`INSERT INTO notifications (user_id, title, body, link) VALUES (${l.user_id}, ${`Your leave was ${status}`}, ${clean(fd.get("comment"), 200) || null}, '/portal/hrm/leave')`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: `leave.${op}`, entity: "leave", entityId: id });
  revalidatePath("/portal/hrm/leave");
}

export async function cancelMyLeave(fd: FormData): Promise<void> {
  const me = await staffOnly();
  const id = clean(fd.get("id"), 40);
  if (UUID.test(id)) await sql`UPDATE hr_leave SET status = 'cancelled' WHERE id = ${id} AND user_id = ${me.id} AND status = 'pending'`;
  revalidatePath("/portal/hrm/leave");
}

export async function saveLeaveType(_p: State, fd: FormData): Promise<State> {
  const me = await hr();
  const name = clean(fd.get("name"), 60), days = Math.min(Math.max(Math.round(Number(fd.get("days")) || 0), 0), 366);
  if (!name) return { error: "Enter the leave type name." };
  await sql`INSERT INTO hr_leave_types (school_id, name, days, paid) VALUES (${me.schoolId}, ${name}, ${days}, ${fd.get("paid") === "on"}) ON CONFLICT (school_id, name) DO UPDATE SET days = EXCLUDED.days, paid = EXCLUDED.paid, active = true`;
  revalidatePath("/portal/hrm/leave");
  return { ok: "Leave type saved." };
}

/* ---------- Appraisals ---------- */
export async function saveAppraisal(_p: State, fd: FormData): Promise<State> {
  const me = await hr();
  const user = clean(fd.get("user"), 40), period = clean(fd.get("period"), 60);
  if (!UUID.test(user) || !period) return { error: "Choose the staff member and the review period." };
  if (user === me.id) return { error: "You cannot appraise yourself." };
  const [u] = await sql`SELECT id FROM users WHERE id = ${user} AND school_id = ${me.schoolId} AND role NOT IN ('student','parent','developer')`;
  if (!u) return { error: "Staff member not found." };
  const scores: Record<string, number> = {};
  for (const c of CRITERIA) { const n = Math.round(Number(fd.get(c.key))); if (n >= 1 && n <= 5) scores[c.key] = n; }
  if (Object.keys(scores).length < 3) return { error: "Rate at least three criteria." };
  const overall = overallScore(scores);
  const [r] = await sql`INSERT INTO hr_appraisals (school_id, user_id, period, scores, overall, strengths, improvements, goals, appraiser_id)
    VALUES (${me.schoolId}, ${user}, ${period}, ${sql.json(scores)}, ${overall}, ${clean(fd.get("strengths"), 1500) || null}, ${clean(fd.get("improvements"), 1500) || null}, ${clean(fd.get("goals"), 1500) || null}, ${me.id}) RETURNING id`;
  await sql`INSERT INTO notifications (user_id, title, body, link) VALUES (${user}, 'A performance appraisal was added for you', ${period}, '/portal/hrm/appraisals')`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "appraisal.create", entity: "appraisal", entityId: r.id, meta: { overall } });
  revalidatePath("/portal/hrm/appraisals");
  return { ok: `Appraisal saved. Overall score ${overall}.` };
}
export async function acknowledgeAppraisal(fd: FormData): Promise<void> {
  const me = await staffOnly();
  const id = clean(fd.get("id"), 40);
  if (UUID.test(id)) await sql`UPDATE hr_appraisals SET acknowledged_at = now(), staff_comment = ${clean(fd.get("comment"), 800) || null} WHERE id = ${id} AND user_id = ${me.id} AND acknowledged_at IS NULL`;
  revalidatePath("/portal/hrm/appraisals");
}

/* ---------- Recruitment ---------- */
export async function saveVacancy(_p: State, fd: FormData): Promise<State> {
  const me = await hr();
  const title = clean(fd.get("title"), 120);
  if (!title) return { error: "Enter the job title." };
  const closes = clean(fd.get("closes"), 10);
  await sql`INSERT INTO hr_vacancies (school_id, title, department, kind, openings, description, closes_on)
    VALUES (${me.schoolId}, ${title}, ${clean(fd.get("department"), 80) || null}, ${clean(fd.get("kind"), 20) || "full_time"}, ${Math.min(Math.max(Math.round(Number(fd.get("openings")) || 1), 1), 100)}, ${clean(fd.get("description"), 3000) || null}, ${DATE.test(closes) ? closes : null})`;
  revalidatePath("/portal/hrm/recruitment");
  return { ok: "Vacancy opened." };
}
export async function closeVacancy(fd: FormData): Promise<void> {
  const me = await hr();
  const id = clean(fd.get("id"), 40);
  if (UUID.test(id)) await sql`UPDATE hr_vacancies SET status = CASE WHEN status = 'open' THEN 'closed' ELSE 'open' END WHERE id = ${id} AND school_id = ${me.schoolId}`;
  revalidatePath("/portal/hrm/recruitment");
}
export async function addCandidate(_p: State, fd: FormData): Promise<State> {
  const me = await hr();
  const vac = clean(fd.get("vacancy"), 40), name = clean(fd.get("name"), 120);
  if (!UUID.test(vac) || !name) return { error: "Choose the vacancy and enter the candidate's name." };
  const [v] = await sql`SELECT id FROM hr_vacancies WHERE id = ${vac} AND school_id = ${me.schoolId}`;
  if (!v) return { error: "Vacancy not found." };
  await sql`INSERT INTO hr_candidates (school_id, vacancy_id, name, email, phone, notes) VALUES (${me.schoolId}, ${vac}, ${name}, ${clean(fd.get("email"), 160) || null}, ${clean(fd.get("phone"), 30) || null}, ${clean(fd.get("notes"), 800) || null})`;
  revalidatePath("/portal/hrm/recruitment");
  return { ok: "Candidate added." };
}
export async function moveCandidate(fd: FormData): Promise<void> {
  const me = await hr();
  const id = clean(fd.get("id"), 40), op = clean(fd.get("op"), 10);
  if (!UUID.test(id)) return;
  const [c] = await sql`SELECT stage FROM hr_candidates WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!c) return;
  const to = op === "reject" ? "rejected" : op === "next" ? nextStage(c.stage as string) : null;
  if (to && RECRUIT_STAGES.includes(to as never)) await sql`UPDATE hr_candidates SET stage = ${to}, rating = COALESCE(${Math.round(Number(fd.get("rating"))) || null}, rating) WHERE id = ${id}`;
  revalidatePath("/portal/hrm/recruitment");
}
