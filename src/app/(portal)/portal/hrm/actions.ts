"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireMe, requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { ACTIONS, nextCaseNumber, offenceCount } from "@/lib/hrm";
import { isRoot } from "@/lib/logic/permissions";

type State = { error?: string; ok?: string };
const UUID = /^[0-9a-f-]{36}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const money = (v: FormDataEntryValue | null, max = 100000000) => Math.min(Math.max(Number(v) || 0, 0), max);
const done = () => revalidatePath("/portal/hrm");

async function notify(userId: string, title: string, body: string) {
  await sql`INSERT INTO notifications (user_id, title, body, link) VALUES (${userId}, ${title}, ${body}, '/portal/hrm?tab=mine')`;
}

export async function saveRule(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("hrm:manage");
  const code = clean(fd.get("code"), 12).toUpperCase().replace(/[^A-Z0-9_]/g, "");
  const title = clean(fd.get("title"), 120);
  if (!/^[A-Z0-9_]{2,12}$/.test(code)) return { error: "Use a short code of letters and numbers, for example LATE." };
  if (title.length < 3) return { error: "Enter the rule title." };
  const action = ACTIONS.includes(clean(fd.get("action"), 20) as never) ? clean(fd.get("action"), 20) : "query";
  const to = ACTIONS.includes(clean(fd.get("escalateTo"), 20) as never) ? clean(fd.get("escalateTo"), 20) : "";
  const v = { title, category: clean(fd.get("category"), 60) || "Conduct", description: clean(fd.get("description"), 800), guidance: clean(fd.get("guidance"), 800),
    fine: money(fd.get("fine")), after: Math.min(Math.round(money(fd.get("after"), 50)), 50), days: Math.min(Math.max(Math.round(money(fd.get("days"), 730)), 1), 730), active: fd.get("active") === "on" };
  const id = clean(fd.get("id"), 40);
  if (UUID.test(id)) {
    await sql`UPDATE hr_rules SET code = ${code}, title = ${v.title}, category = ${v.category}, description = ${v.description}, guidance = ${v.guidance}, default_action = ${action},
              fine_amount = ${v.fine}, escalate_after = ${v.after}, escalate_days = ${v.days}, escalate_to = ${to}, active = ${v.active} WHERE id = ${id} AND school_id = ${me.schoolId}`;
  } else {
    const [dup] = await sql`SELECT 1 FROM hr_rules WHERE school_id = ${me.schoolId} AND code = ${code}`;
    if (dup) return { error: "That code is already used by another rule." };
    await sql`INSERT INTO hr_rules (school_id, code, title, category, description, guidance, default_action, fine_amount, escalate_after, escalate_days, escalate_to, active)
              VALUES (${me.schoolId}, ${code}, ${v.title}, ${v.category}, ${v.description}, ${v.guidance}, ${action}, ${v.fine}, ${v.after}, ${v.days}, ${to}, ${v.active})`;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: UUID.test(id) ? "hrm.rule.update" : "hrm.rule.create", entity: "hr_rule", entityId: UUID.test(id) ? id : null, meta: { code, fine: v.fine } });
  done();
  return { ok: "Rule saved." };
}

export async function deleteRule(fd: FormData): Promise<void> {
  const me = await requirePerm("hrm:manage");
  const id = clean(fd.get("id"), 40);
  if (!UUID.test(id)) return;
  await sql`DELETE FROM hr_rules WHERE id = ${id} AND school_id = ${me.schoolId}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "hrm.rule.delete", entity: "hr_rule", entityId: id });
  done();
}

export async function raiseCase(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("hrm:manage");
  const userId = clean(fd.get("user"), 40), ruleId = clean(fd.get("rule"), 40);
  if (!UUID.test(userId) || userId === me.id) return { error: "Choose a staff member (not yourself)." };
  const [u] = await sql`SELECT id, role FROM users WHERE id = ${userId} AND school_id = ${me.schoolId} AND role NOT IN ('student','parent')`;
  if (!u || u.role === "developer" || (isRoot(u.role) && !isRoot(me.role))) return { error: "You cannot raise a case against that person." };
  const [rule] = UUID.test(ruleId) ? await sql`SELECT * FROM hr_rules WHERE id = ${ruleId} AND school_id = ${me.schoolId} AND active` : [];
  let kind = ACTIONS.includes(clean(fd.get("kind"), 20) as never) ? clean(fd.get("kind"), 20) : (rule?.default_action ?? "query");
  const facts = clean(fd.get("facts"), 3000);
  const incident = DATE.test(clean(fd.get("incident"), 10)) ? clean(fd.get("incident"), 10) : new Date().toISOString().slice(0, 10);
  if (facts.length < 5) return { error: "Describe what happened." };
  let note = "";
  if (rule && rule.escalate_after > 0 && rule.escalate_to && kind !== "commendation") {
    const prior = await offenceCount(me.schoolId, userId, rule.id, rule.escalate_days);
    if (prior + 1 >= rule.escalate_after) { kind = rule.escalate_to; note = ` Escalated to ${kind.replace("_", " ")}: offence ${prior + 1} within ${rule.escalate_days} days.`; }
  }
  const given = String(fd.get("fine") ?? "").trim();
  const fine = kind === "commendation" ? 0 : given !== "" ? money(given) : Number(rule?.fine_amount ?? 0);
  const title = clean(fd.get("title"), 160) || rule?.title || "Staff matter";
  const number = await nextCaseNumber(me.schoolId);
  const status = kind === "commendation" ? "decided" : "open";
  await sql`INSERT INTO hr_cases (school_id, number, user_id, rule_id, kind, title, facts, incident_on, status, fine_amount, raised_by, decision, decided_by, decided_at)
    VALUES (${me.schoolId}, ${number}, ${userId}, ${rule?.id ?? null}, ${kind}, ${title}, ${facts}, ${incident}, ${status}, ${fine}, ${me.id},
            ${kind === "commendation" ? "Commendation recorded." : null}, ${kind === "commendation" ? me.id : null}, ${kind === "commendation" ? sql`now()` : null})`;
  await notify(userId, kind === "commendation" ? `Commendation: ${title}` : `HR matter ${number}: ${title}`, kind === "commendation" ? "A commendation was recorded on your file." : "You have the right to respond. Open My record to reply.");
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "hrm.case.raise", entity: "hr_case", meta: { number, kind, userId } });
  done();
  return { ok: `${number} raised.${note}` };
}

export async function respondCase(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  const id = clean(fd.get("id"), 40), text = clean(fd.get("response"), 3000);
  if (!UUID.test(id) || text.length < 3) return { error: "Write your response." };
  const r = await sql`UPDATE hr_cases SET response = ${text}, response_at = now(), status = 'response_received'
                      WHERE id = ${id} AND school_id = ${me.schoolId} AND user_id = ${me.id} AND status = 'open' RETURNING raised_by, number`;
  if (!r.length) return { error: "This matter is no longer open for a response." };
  if (r[0].raised_by) await notify(r[0].raised_by, `Response received: ${r[0].number}`, `${me.name} has responded.`);
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "hrm.case.respond", entity: "hr_case", entityId: id });
  done();
  return { ok: "Your response has been recorded." };
}

export async function decideCase(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("hrm:manage");
  const id = clean(fd.get("id"), 40), outcome = clean(fd.get("outcome"), 12), note = clean(fd.get("note"), 2000);
  if (!UUID.test(id) || !["confirm", "dismiss"].includes(outcome)) return { error: "Choose an outcome." };
  const [c] = await sql`SELECT * FROM hr_cases WHERE id = ${id} AND school_id = ${me.schoolId} AND status IN ('open','response_received')`;
  if (!c) return { error: "Case not found or already decided." };
  if (c.user_id === me.id) return { error: "You cannot decide a case about yourself." };
  if (c.status === "open" && fd.get("waive") !== "on") return { error: "The staff member has not responded yet. Wait for the response, or tick the box to decide without one." };
  const fine = outcome === "confirm" ? money(fd.get("fine") ?? c.fine_amount) : 0;
  let fineId: string | null = null;
  if (fine > 0) {
    const [f] = await sql`INSERT INTO fines (school_id, user_id, day, reason, amount, created_by) VALUES (${me.schoolId}, ${c.user_id}, ${c.incident_on}, ${`${c.number}: ${c.title}`}, ${fine}, ${me.id})
                          ON CONFLICT (user_id, day, reason) DO UPDATE SET amount = EXCLUDED.amount RETURNING id`;
    fineId = f.id as string;
  }
  await sql`UPDATE hr_cases SET status = 'decided', decision = ${outcome === "confirm" ? (note || "Confirmed.") : (note || "Dismissed.")}, fine_amount = ${fine}, fine_id = ${fineId},
            decided_by = ${me.id}, decided_at = now() WHERE id = ${id}`;
  await notify(c.user_id, `Decision on ${c.number}`, outcome === "confirm" ? `${c.kind.replace("_", " ")} confirmed${fine ? `; fine ₦${fine.toLocaleString("en-NG")}` : ""}.` : "The matter was dismissed.");
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "hrm.case.decide", entity: "hr_case", entityId: id, meta: { outcome, fine } });
  done();
  return { ok: outcome === "confirm" ? "Decision recorded." : "Case dismissed." };
}

export async function saveCourse(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("hrm:manage");
  const name = clean(fd.get("name"), 120);
  if (name.length < 2) return { error: "Enter the course name." };
  const months = fd.get("months") ? Math.min(Math.max(Math.round(Number(fd.get("months"))), 1), 240) : null;
  try {
    await sql`INSERT INTO hr_courses (school_id, name, description, mandatory, valid_months) VALUES (${me.schoolId}, ${name}, ${clean(fd.get("description"), 400)}, ${fd.get("mandatory") === "on"}, ${months})`;
  } catch { return { error: "A course with that name already exists." }; }
  done();
  return { ok: "Course added." };
}

export async function archiveCourse(fd: FormData): Promise<void> {
  const me = await requirePerm("hrm:manage");
  const id = clean(fd.get("id"), 40);
  if (UUID.test(id)) await sql`UPDATE hr_courses SET archived = true WHERE id = ${id} AND school_id = ${me.schoolId}`;
  done();
}

export async function assignTraining(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("hrm:manage");
  const course = clean(fd.get("course"), 40), users = fd.getAll("users").map((x) => String(x)).filter((x) => UUID.test(x)).slice(0, 300);
  const due = DATE.test(clean(fd.get("due"), 10)) ? clean(fd.get("due"), 10) : null;
  const [c] = UUID.test(course) ? await sql`SELECT name FROM hr_courses WHERE id = ${course} AND school_id = ${me.schoolId} AND NOT archived` : [];
  if (!c || users.length === 0) return { error: "Choose a course and at least one person." };
  let n = 0;
  for (const u of users) {
    const r = await sql`INSERT INTO hr_training (school_id, user_id, course_id, due_on, assigned_by)
      SELECT ${me.schoolId}, id, ${course}, ${due}, ${me.id} FROM users WHERE id = ${u} AND school_id = ${me.schoolId} AND role NOT IN ('student','parent')
      ON CONFLICT DO NOTHING RETURNING user_id`;
    if (r.length) { n++; await notify(u, `Training assigned: ${c.name}`, due ? `Please complete it by ${due}.` : "Please complete it."); }
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "hrm.training.assign", entity: "hr_course", entityId: course, meta: { people: n } });
  done();
  return { ok: n ? `Assigned to ${n} ${n === 1 ? "person" : "people"}.` : "Everyone chosen already has it open." };
}

export async function completeTraining(fd: FormData): Promise<void> {
  const me = await requirePerm("hrm:manage");
  const id = clean(fd.get("id"), 40);
  if (!UUID.test(id)) return;
  await sql`UPDATE hr_training t SET status = 'completed', completed_on = current_date,
              expires_on = CASE WHEN c.valid_months IS NULL THEN NULL ELSE (current_date + make_interval(months => c.valid_months))::date END
            FROM hr_courses c WHERE t.id = ${id} AND t.school_id = ${me.schoolId} AND c.id = t.course_id AND t.status = 'assigned'`;
  done();
}

export async function saveHoliday(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("hrm:manage");
  const day = clean(fd.get("day"), 10), name = clean(fd.get("name"), 80);
  if (!DATE.test(day) || !name) return { error: "Enter the date and the name." };
  await sql`INSERT INTO hr_holidays (school_id, day, name) VALUES (${me.schoolId}, ${day}, ${name}) ON CONFLICT (school_id, day) DO UPDATE SET name = EXCLUDED.name`;
  done();
  return { ok: "Holiday saved." };
}

export async function deleteHoliday(fd: FormData): Promise<void> {
  const me = await requirePerm("hrm:manage");
  const day = clean(fd.get("day"), 10);
  if (DATE.test(day)) await sql`DELETE FROM hr_holidays WHERE school_id = ${me.schoolId} AND day = ${day}`;
  done();
}
