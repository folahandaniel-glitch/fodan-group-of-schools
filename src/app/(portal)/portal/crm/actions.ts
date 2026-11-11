"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { STAGES, STAGE_LABEL } from "@/lib/crm";

type State = { error?: string; ok?: string };
const UUID = /^[0-9a-f-]{36}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const KINDS = ["family", "sponsor", "vendor", "partner", "other"];
const STATUSES = ["lead", "prospect", "client", "inactive"];
const refresh = (id?: string) => { revalidatePath("/portal/crm"); if (id) revalidatePath(`/portal/crm/${id}`); };

async function ownsAccount(schoolId: string, id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const [a] = await sql`SELECT 1 FROM crm_accounts WHERE id = ${id} AND school_id = ${schoolId}`;
  return !!a;
}

export async function createAccount(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("crm:create");
  const name = clean(fd.get("name"), 160);
  const email = clean(fd.get("email"), 160).toLowerCase();
  if (name.length < 2) return { error: "Enter a name." };
  if (email && !EMAIL.test(email)) return { error: "Enter a valid email address." };
  const kind = KINDS.includes(clean(fd.get("kind"), 12)) ? clean(fd.get("kind"), 12) : "family";
  const status = STATUSES.includes(clean(fd.get("status"), 12)) ? clean(fd.get("status"), 12) : "lead";
  const [dup] = await sql`SELECT id FROM crm_accounts WHERE school_id = ${me.schoolId} AND lower(name) = lower(${name})`;
  if (dup) return { error: "An account with this name already exists. Open it instead of creating a duplicate." };
  const [a] = await sql`INSERT INTO crm_accounts (school_id, name, kind, status, phone, email, address, source, notes, owner_id, created_by)
    VALUES (${me.schoolId}, ${name}, ${kind}, ${status}, ${clean(fd.get("phone"), 40) || null}, ${email || null}, ${clean(fd.get("address"), 300) || null},
            ${clean(fd.get("source"), 120) || null}, ${clean(fd.get("notes"), 2000) || null}, ${me.id}, ${me.id}) RETURNING id`;
  const contact = clean(fd.get("contact"), 120);
  if (contact) await sql`INSERT INTO crm_contacts (school_id, account_id, name, phone, is_primary) VALUES (${me.schoolId}, ${a.id}, ${contact}, ${clean(fd.get("cphone"), 40) || null}, true)`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "crm.account.create", entity: "crm_account", entityId: a.id, meta: { name } });
  refresh();
  return { ok: "Account created." };
}

export async function updateAccount(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("crm:edit");
  const id = clean(fd.get("id"), 40);
  if (!(await ownsAccount(me.schoolId, id))) return { error: "Account not found." };
  const name = clean(fd.get("name"), 160), email = clean(fd.get("email"), 160).toLowerCase();
  if (name.length < 2) return { error: "Enter a name." };
  if (email && !EMAIL.test(email)) return { error: "Enter a valid email address." };
  const kind = KINDS.includes(clean(fd.get("kind"), 12)) ? clean(fd.get("kind"), 12) : "family";
  const status = STATUSES.includes(clean(fd.get("status"), 12)) ? clean(fd.get("status"), 12) : "lead";
  try {
    await sql`UPDATE crm_accounts SET name = ${name}, kind = ${kind}, status = ${status}, phone = ${clean(fd.get("phone"), 40) || null}, email = ${email || null},
              address = ${clean(fd.get("address"), 300) || null}, source = ${clean(fd.get("source"), 120) || null}, notes = ${clean(fd.get("notes"), 2000) || null}
              WHERE id = ${id} AND school_id = ${me.schoolId}`;
  } catch { return { error: "Another account already uses that name." }; }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "crm.account.update", entity: "crm_account", entityId: id });
  refresh(id);
  return { ok: "Account updated." };
}

export async function deleteAccount(fd: FormData): Promise<void> {
  const me = await requirePerm("crm:manage");
  const id = clean(fd.get("id"), 40);
  if (!(await ownsAccount(me.schoolId, id))) return;
  await sql`DELETE FROM crm_accounts WHERE id = ${id} AND school_id = ${me.schoolId}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "crm.account.delete", entity: "crm_account", entityId: id });
  refresh();
  redirect("/portal/crm");
}

export async function addContact(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("crm:create");
  const id = clean(fd.get("account"), 40), name = clean(fd.get("name"), 120);
  if (!(await ownsAccount(me.schoolId, id))) return { error: "Account not found." };
  if (name.length < 2) return { error: "Enter the contact's name." };
  await sql`INSERT INTO crm_contacts (school_id, account_id, name, title, phone, email) VALUES (${me.schoolId}, ${id}, ${name}, ${clean(fd.get("title"), 80) || null}, ${clean(fd.get("phone"), 40) || null}, ${clean(fd.get("email"), 160) || null})`;
  refresh(id);
  return { ok: "Contact added." };
}

export async function removeContact(fd: FormData): Promise<void> {
  const me = await requirePerm("crm:edit");
  const id = clean(fd.get("id"), 40), account = clean(fd.get("account"), 40);
  if (UUID.test(id)) await sql`DELETE FROM crm_contacts WHERE id = ${id} AND school_id = ${me.schoolId}`;
  refresh(account);
}

export async function logActivity(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("crm:create");
  const id = clean(fd.get("account"), 40), kind = clean(fd.get("kind"), 12), summary = clean(fd.get("summary"), 1500);
  const fu = clean(fd.get("followUp"), 10);
  if (!(await ownsAccount(me.schoolId, id))) return { error: "Account not found." };
  if (!["call", "meeting", "email", "sms", "visit", "note"].includes(kind)) return { error: "Choose the type of contact." };
  if (summary.length < 2) return { error: "Write a short summary." };
  if (fu && !DATE.test(fu)) return { error: "Enter a valid follow-up date." };
  const opp = clean(fd.get("opportunity"), 40);
  await sql`INSERT INTO crm_activities (school_id, account_id, opportunity_id, kind, summary, follow_up_on, by_user)
            VALUES (${me.schoolId}, ${id}, ${UUID.test(opp) ? opp : null}, ${kind}, ${summary}, ${fu || null}, ${me.id})`;
  refresh(id);
  return { ok: "Logged." };
}

export async function completeFollowUp(fd: FormData): Promise<void> {
  const me = await requirePerm("crm:edit");
  const id = clean(fd.get("id"), 40), account = clean(fd.get("account"), 40);
  if (UUID.test(id)) await sql`UPDATE crm_activities SET follow_up_done = true WHERE id = ${id} AND school_id = ${me.schoolId}`;
  refresh(account);
}

export async function createOpportunity(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("crm:create");
  const id = clean(fd.get("account"), 40), title = clean(fd.get("title"), 160);
  const close = clean(fd.get("expected"), 10);
  if (!(await ownsAccount(me.schoolId, id))) return { error: "Account not found." };
  if (title.length < 3) return { error: "Give the opportunity a title." };
  if (close && !DATE.test(close)) return { error: "Enter a valid date." };
  const value = Math.min(Math.max(Number(fd.get("value")) || 0, 0), 1e10);
  const [o] = await sql`INSERT INTO crm_opportunities (school_id, account_id, title, value, expected_close, owner_id, created_by)
                        VALUES (${me.schoolId}, ${id}, ${title}, ${value}, ${close || null}, ${me.id}, ${me.id}) RETURNING id`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "crm.opportunity.create", entity: "crm_opportunity", entityId: o.id, meta: { title, value } });
  refresh(id);
  return { ok: "Opportunity added." };
}

/** Moves an opportunity to another stage. Winning promotes the account to a client; losing needs a reason. */
export async function moveOpportunity(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("crm:edit");
  const id = clean(fd.get("id"), 40), stage = clean(fd.get("stage"), 12), reason = clean(fd.get("reason"), 300);
  if (!UUID.test(id) || !(STAGES as readonly string[]).includes(stage)) return { error: "Unknown stage." };
  const [o] = await sql`SELECT * FROM crm_opportunities WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!o) return { error: "Opportunity not found." };
  if (["won", "lost"].includes(o.stage)) return { error: "This opportunity is already closed." };
  if (stage === "lost" && reason.length < 3) return { error: "Record why it was lost. It helps next time." };
  const closing = stage === "won" || stage === "lost";
  await sql`UPDATE crm_opportunities SET stage = ${stage}, lost_reason = ${stage === "lost" ? reason : null}, closed_at = ${closing ? sql`now()` : null} WHERE id = ${id}`;
  if (stage === "won") await sql`UPDATE crm_accounts SET status = 'client' WHERE id = ${o.account_id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "crm.opportunity.move", entity: "crm_opportunity", entityId: id, meta: { from: o.stage, to: stage } });
  refresh(o.account_id);
  return { ok: `Moved to ${STAGE_LABEL[stage]}.` };
}

/** Quick "next stage" button used on the pipeline board. */
export async function advanceOpportunity(fd: FormData): Promise<void> {
  const me = await requirePerm("crm:edit");
  const id = clean(fd.get("id"), 40);
  if (!UUID.test(id)) return;
  const [o] = await sql`SELECT stage, account_id FROM crm_opportunities WHERE id = ${id} AND school_id = ${me.schoolId}`;
  const i = o ? (STAGES as readonly string[]).indexOf(o.stage) : -1;
  if (i < 0 || o.stage === "won" || o.stage === "lost") return;
  const next = STAGES[i + 1];
  await sql`UPDATE crm_opportunities SET stage = ${next}, closed_at = ${next === "won" ? sql`now()` : null} WHERE id = ${id}`;
  if (next === "won") await sql`UPDATE crm_accounts SET status = 'client' WHERE id = ${o.account_id}`;
  refresh(o.account_id);
}
