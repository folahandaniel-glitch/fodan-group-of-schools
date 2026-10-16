"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireMe } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { canCreate, canManage, canView, loadModules } from "@/lib/modules";
import { rateLimit } from "@/lib/security";
import { expenseAccountFor, post } from "@/lib/ledger";

type State = { error?: string; ok?: string };
const uuid = (v: unknown) => { const s = clean(v, 40); return /^[0-9a-f-]{36}$/i.test(s) ? s : null; };

async function mod(key: string) {
  return (await loadModules()).find((m) => m.key === key) ?? null;
}

export async function createRecord(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  const m = await mod(clean(fd.get("module"), 20));
  if (!m || !canCreate(me, m)) return { error: "You cannot create records here." };
  if (!(await rateLimit(`rec:${me.id}`, 30, 3600))) return { error: "Too many submissions. Please try again later." };
  const title = clean(fd.get("title"), 200), body = clean(fd.get("body"), 6000);
  if (!title) return { error: "Enter a title." };
  const data: Record<string, string> = {};
  for (const f of m.fields) {
    const v = clean(fd.get(`f_${f.name}`), 300);
    if (f.required && !v) return { error: `${f.label} is required.` };
    if (f.type === "select" && v && !f.options?.includes(v)) return { error: `Invalid ${f.label}.` };
    data[f.name] = v;
  }
  if (m.key === "leave" && data.from && data.to && data.to < data.from) return { error: "The end date is before the start date." };
  const manage = canManage(me, m);
  const status = manage && m.statuses.includes(clean(fd.get("status"), 30)) ? clean(fd.get("status"), 30) : m.defaultStatus;
  const assignee = m.assignable && manage ? uuid(fd.get("assignee")) : null;
  const due = /^\d{4}-\d{2}-\d{2}$/.test(clean(fd.get("due"), 10)) ? clean(fd.get("due"), 10) : null;
  const [r] = await sql`INSERT INTO records (school_id, module, title, body, status, data, owner_id, assignee_id, due_on)
    VALUES (${me.schoolId}, ${m.key}, ${title}, ${body}, ${status}, ${sql.json(data)}, ${me.id}, ${assignee}, ${due}) RETURNING id`;
  if (assignee) await sql`INSERT INTO notifications (user_id, title, link) VALUES (${assignee}, ${`New task: ${title}`}, ${`/portal/m/${m.key}/${r.id}`})`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: `${m.key}.create`, entity: "record", entityId: r.id });
  revalidatePath(`/portal/m/${m.key}`);
  return { ok: "Saved." };
}

async function load(me: { schoolId: string }, id: string | null) {
  if (!id) return null;
  const [r] = await sql`SELECT * FROM records WHERE id = ${id} AND school_id = ${me.schoolId}`;
  return r ?? null;
}

export async function setRecordStatus(fd: FormData): Promise<void> {
  const me = await requireMe();
  const r = await load(me, uuid(fd.get("id")));
  if (!r) return;
  const m = await mod(r.module);
  const status = clean(fd.get("status"), 30);
  if (!m || !m.statuses.includes(status)) return;
  const mgr = canManage(me, m);
  const own = (r.owner_id === me.id || r.assignee_id === me.id) && (m.ownerMay ?? []).includes(status);
  if (!mgr && !own) return;
  // Separation of duties for money: nobody approves or pays their own request.
  if (["finance", "procurement"].includes(m.key) && r.owner_id === me.id && me.role !== "super_admin" && ["approved", "paid", "received"].includes(status)) return;
  await sql`UPDATE records SET status = ${status}, updated_at = now() WHERE id = ${r.id}`;
  if (m.key === "finance" && status === "paid") {
    const amount = Number(String(r.data?.amount ?? "").replace(/[^0-9.]/g, ""));
    await post({ schoolId: me.schoolId, description: `${r.title} (${r.data?.category ?? "expense"})`, debit: expenseAccountFor(String(r.data?.category ?? "")), credit: "1000", amount, ref: `finance:${r.id}`, by: me.id });
  }
  if (r.owner_id && r.owner_id !== me.id) {
    await sql`INSERT INTO notifications (user_id, title, link) VALUES (${r.owner_id}, ${`${m.label}: "${r.title}" is now ${status.replace("_", " ")}`}, ${`/portal/m/${m.key}/${r.id}`})`;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: `${m.key}.status`, entity: "record", entityId: r.id, meta: { from: r.status, to: status } });
  revalidatePath(`/portal/m/${m.key}`);
  revalidatePath(`/portal/m/${m.key}/${r.id}`);
}

export async function assignRecord(fd: FormData): Promise<void> {
  const me = await requireMe();
  const r = await load(me, uuid(fd.get("id")));
  if (!r) return;
  const m = await mod(r.module);
  if (!m || !m.assignable || !canManage(me, m)) return;
  const to = uuid(fd.get("assignee"));
  await sql`UPDATE records SET assignee_id = ${to}, updated_at = now() WHERE id = ${r.id}`;
  if (to) await sql`INSERT INTO notifications (user_id, title, link) VALUES (${to}, ${`Task assigned: ${r.title}`}, ${`/portal/m/${m.key}/${r.id}`})`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: `${m.key}.assign`, entity: "record", entityId: r.id, meta: { to } });
  revalidatePath(`/portal/m/${m.key}/${r.id}`);
}

export async function replyRecord(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  const r = await load(me, uuid(fd.get("id")));
  const m = r ? await mod(r.module) : null;
  if (!r || !m || !m.replies || !canView(me, m)) return { error: "Not available." };
  const mgr = canManage(me, m);
  if (m.ownOnly && !mgr && r.owner_id !== me.id && r.assignee_id !== me.id) return { error: "Not available." };
  if (["locked", "closed", "hidden"].includes(r.status) && !mgr) return { error: "This thread is closed." };
  const body = clean(fd.get("body"), 4000);
  if (!body) return { error: "Write a reply." };
  if (!(await rateLimit(`reply:${me.id}`, 40, 3600))) return { error: "Too many replies. Please slow down." };
  await sql`INSERT INTO record_replies (record_id, user_id, body) VALUES (${r.id}, ${me.id}, ${body})`;
  await sql`UPDATE records SET updated_at = now() WHERE id = ${r.id}`;
  if (r.owner_id && r.owner_id !== me.id) await sql`INSERT INTO notifications (user_id, title, body, link) VALUES (${r.owner_id}, ${`New reply: ${r.title}`}, ${body.slice(0, 140)}, ${`/portal/m/${m.key}/${r.id}`})`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: `${m.key}.reply`, entity: "record", entityId: r.id });
  revalidatePath(`/portal/m/${m.key}/${r.id}`);
  return { ok: "Reply posted." };
}

export async function hideReply(fd: FormData): Promise<void> {
  const me = await requireMe();
  const id = uuid(fd.get("reply"));
  if (!id) return;
  const [x] = await sql`SELECT p.id, p.hidden, r.module, r.id AS rid FROM record_replies p JOIN records r ON r.id = p.record_id WHERE p.id = ${id} AND r.school_id = ${me.schoolId}`;
  const m = x ? await mod(x.module) : null;
  if (!x || !m || !canManage(me, m)) return;
  await sql`UPDATE record_replies SET hidden = NOT hidden WHERE id = ${id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "audit", action: `${m.key}.moderate`, entity: "reply", entityId: id });
  revalidatePath(`/portal/m/${m.key}/${x.rid}`);
}

export async function acknowledgeRecord(fd: FormData): Promise<void> {
  const me = await requireMe();
  const r = await load(me, uuid(fd.get("id")));
  const m = r ? await mod(r.module) : null;
  if (!r || !m || !m.acknowledge || !canView(me, m)) return;
  await sql`INSERT INTO record_events (record_id, user_id, kind) VALUES (${r.id}, ${me.id}, 'ack') ON CONFLICT DO NOTHING`;
  revalidatePath(`/portal/m/${m.key}/${r.id}`);
}

export async function togglePin(fd: FormData): Promise<void> {
  const me = await requireMe();
  const r = await load(me, uuid(fd.get("id")));
  const m = r ? await mod(r.module) : null;
  if (!r || !m || !canManage(me, m)) return;
  await sql`UPDATE records SET pinned = NOT pinned WHERE id = ${r.id}`;
  revalidatePath(`/portal/m/${m.key}`);
}
