import { sql } from "./db";
import { hashPassword, lookupHash, sha256, token } from "./crypto";
import { normaliseAccessCode } from "./logic/access-code";
import { checkPassword, normEmail, validEmail } from "./logic/password";
import { audit, rateLimit } from "./security";
import { ymd } from "./data";

export class UserError extends Error {}

export async function createUser(o: {
  schoolId: string; email: string; password: string; role: string; firstName: string; lastName: string;
  phone?: string; mustChange?: boolean; actorId?: string | null;
}): Promise<string> {
  const email = normEmail(o.email);
  if (!validEmail(email)) throw new UserError("Enter a valid email address.");
  const pc = checkPassword(o.password);
  if (!pc.ok) throw new UserError(pc.problems[0]);
  const [dup] = await sql`SELECT 1 FROM users WHERE lower(email) = ${email}`;
  if (dup) throw new UserError("An account with this email already exists.");
  const [u] = await sql`INSERT INTO users (school_id, email, password_hash, role, first_name, last_name, phone, must_change_password)
    VALUES (${o.schoolId}, ${email}, ${await hashPassword(o.password)}, ${o.role}, ${o.firstName}, ${o.lastName}, ${o.phone ?? null}, ${o.mustChange ?? false})
    RETURNING id`;
  await audit({ schoolId: o.schoolId, actorId: o.actorId ?? u.id, action: "user.create", entity: "user", entityId: u.id, meta: { role: o.role, email } });
  return u.id;
}

function digits(s: string | null | undefined) { return (s ?? "").replace(/\D/g, "").slice(-10); }

export type LinkResult = { ok: true; status: "active" | "pending"; student: string } | { ok: false; error: string };

/** Secure parent → student linking. A code alone is never enough. */
export async function linkChild(parent: { id: string; email: string; phone: string | null }, input: {
  code: string; admissionNo: string; dob: string; relationship?: string;
}): Promise<LinkResult> {
  const GENERIC = "We could not verify those details. Check the access code, admission number and date of birth.";
  if (!(await rateLimit(`link:${parent.id}`, 6, 3600))) return { ok: false, error: "Too many attempts. Please try again in an hour." };
  const code = normaliseAccessCode(input.code);
  if (!code) return { ok: false, error: GENERIC };
  const [st] = await sql`SELECT id, school_id, first_name, last_name, admission_no, dob, status, code_status, guardian_email, guardian_phone
                         FROM students WHERE code_hash = ${lookupHash(code)}`;
  if (!st || st.code_status !== "active" || ["withdrawn", "graduated", "archived"].includes(st.status)) {
    await audit({ actorId: parent.id, category: "security", action: "parent.link.failed", meta: { reason: "code" } });
    return { ok: false, error: GENERIC };
  }
  const dobOk = st.dob && ymd(st.dob) === input.dob.slice(0, 10);
  const admOk = st.admission_no.toLowerCase() === input.admissionNo.trim().toLowerCase();
  if (!dobOk || !admOk) {
    await audit({ schoolId: st.school_id, actorId: parent.id, category: "security", action: "parent.link.failed", entity: "student", entityId: st.id, meta: { reason: "identity" } });
    return { ok: false, error: GENERIC };
  }
  const trusted = (st.guardian_email && normEmail(st.guardian_email) === normEmail(parent.email)) ||
    (digits(st.guardian_phone) && digits(st.guardian_phone) === digits(parent.phone));
  const status = trusted ? "active" : "pending";
  await sql`INSERT INTO parent_links (parent_id, student_id, relationship, status) VALUES (${parent.id}, ${st.id}, ${input.relationship ?? null}, ${status})
            ON CONFLICT (parent_id, student_id) DO NOTHING`;
  await audit({ schoolId: st.school_id, actorId: parent.id, action: "parent.link", entity: "student", entityId: st.id, meta: { status } });
  return { ok: true, status, student: `${st.first_name} ${st.last_name}` };
}

export async function issueResetToken(userId: string, createdBy: string | null, minutes = 60): Promise<string> {
  const raw = token(32);
  await sql`DELETE FROM reset_tokens WHERE user_id = ${userId}`;
  await sql`INSERT INTO reset_tokens (token_hash, user_id, expires_at, created_by)
            VALUES (${sha256(raw)}, ${userId}, now() + make_interval(mins => ${minutes}), ${createdBy})`;
  return raw;
}
