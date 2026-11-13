"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean, rateLimit } from "@/lib/security";
import { normalisePhone, sendSms, smsConfigured } from "@/lib/sms";
import { teacherClassIds, wideScope } from "@/lib/scope";

type State = { error?: string; ok?: string };
const UUID = /^[0-9a-f-]{36}$/i;
const done = () => revalidatePath("/portal/sms");

/** Sends (or queues) one text to a group: a class's guardians, all staff, or numbers typed in. Duplicate numbers get one message. */
export async function sendMessage(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("sms:manage");
  if (!(await rateLimit(`sms:${me.id}`, 12, 3600))) return { error: "Too many bulk messages this hour. Try again later." };
  const audience = clean(fd.get("audience"), 12), body = String(fd.get("body") ?? "").replace(/\s+/g, " ").trim().slice(0, 480);
  if (body.length < 3) return { error: "Write the message." };
  let phones: string[] = [];
  if (audience === "class") {
    const cls = clean(fd.get("class"), 40);
    if (!UUID.test(cls)) return { error: "Choose a class." };
    const scope = wideScope(me) ? null : await teacherClassIds(me.id);
    if (scope && !scope.includes(cls)) return { error: "You can only message your own classes." };
    phones = (await sql`SELECT guardian_phone AS p FROM students WHERE school_id = ${me.schoolId} AND class_id = ${cls} AND status IN ('active','enrolled') AND guardian_phone IS NOT NULL`).map((r) => r.p as string);
  } else if (audience === "all_parents") {
    if (!wideScope(me)) return { error: "Only school leaders can message every parent." };
    phones = (await sql`SELECT guardian_phone AS p FROM students WHERE school_id = ${me.schoolId} AND status IN ('active','enrolled') AND guardian_phone IS NOT NULL`).map((r) => r.p as string);
  } else if (audience === "staff") {
    phones = (await sql`SELECT phone AS p FROM users WHERE school_id = ${me.schoolId} AND status = 'active' AND role NOT IN ('student','parent','developer') AND phone IS NOT NULL`).map((r) => r.p as string);
  } else if (audience === "numbers") {
    phones = clean(fd.get("numbers"), 2000).split(/[\s,;]+/);
  } else return { error: "Choose who receives it." };
  const unique = [...new Set(phones.map(normalisePhone).filter(Boolean))].slice(0, 500);
  if (unique.length === 0) return { error: "No valid phone numbers found for that audience." };
  let sent = 0, queued = 0, failed = 0;
  for (const to of unique) {
    const r = await sendSms(to, body);
    await sql`INSERT INTO sms_outbox (school_id, audience, to_phone, body, status, provider_ref, error, sent_by) VALUES (${me.schoolId}, ${audience}, ${to}, ${body}, ${r.status}, ${r.ref ?? null}, ${r.error ?? null}, ${me.id})`;
    if (r.status === "sent") sent++; else if (r.status === "queued") queued++; else failed++;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "sms.send", entity: "sms", meta: { audience, total: unique.length, sent, queued, failed } });
  done();
  return queued === unique.length ? { ok: `${queued} message${queued === 1 ? "" : "s"} queued. They will be sent once an SMS provider is connected.` }
    : { ok: `${sent} sent${queued ? `, ${queued} queued` : ""}${failed ? `, ${failed} failed` : ""}.` };
}

/** Sends everything still queued, once a provider key has been added. */
export async function sendQueued(_p: State, _fd: FormData): Promise<State> {
  const me = await requirePerm("sms:manage");
  if (!smsConfigured()) return { error: "No SMS provider is connected yet. Add TERMII_API_KEY and SMS_SENDER_ID in the project settings." };
  const rows = await sql`SELECT id, to_phone, body FROM sms_outbox WHERE school_id = ${me.schoolId} AND status IN ('queued','failed') ORDER BY created_at LIMIT 200`;
  let ok = 0;
  for (const r of rows) {
    const s = await sendSms(r.to_phone as string, r.body as string);
    await sql`UPDATE sms_outbox SET status = ${s.status}, provider_ref = ${s.ref ?? null}, error = ${s.error ?? null} WHERE id = ${r.id}`;
    if (s.status === "sent") ok++;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "sms.retry", entity: "sms", meta: { tried: rows.length, sent: ok } });
  done();
  return { ok: `${ok} of ${rows.length} sent.` };
}
