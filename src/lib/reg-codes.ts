import { sql } from "./db";
import { encrypt, lookupHash } from "./crypto";
import { generateAccessCode } from "./logic/access-code";
import { codeInWindow } from "./student-codes";

/**
 * Registration codes: one code, one registration. They are not tied to a named student or a class,
 * so a student picks their class when registering and a parent simply registers. kind = student | parent.
 */
export type RegCode = { id: string; school_id: string; kind: string; status: string; valid_from: unknown; expires_on: unknown; used_at: unknown; valid_days: number | null };

export async function findRegCode(code: string, kind: "student" | "parent"): Promise<RegCode | null> {
  if (!code) return null;
  const [r] = await sql`SELECT id, school_id, kind, status, valid_from, expires_on, used_at, valid_days FROM access_codes WHERE code_hash = ${lookupHash(code)} AND kind = ${kind}`;
  return (r as RegCode) ?? null;
}
export const regCodeUsable = (r: RegCode) => r.status === "active" && !r.used_at && codeInWindow({ code_valid_from: r.valid_from, code_expires_on: r.expires_on });

/** Takes the code for one registration. Returns false if someone else already used it. */
export async function claimRegCode(id: string): Promise<boolean> {
  const [r] = await sql`UPDATE access_codes SET used_at = now() WHERE id = ${id} AND used_at IS NULL AND status = 'active' RETURNING id`;
  return !!r;
}
export async function releaseRegCode(id: string): Promise<void> { await sql`UPDATE access_codes SET used_at = NULL, used_by = NULL WHERE id = ${id}`; }
/** Links the code to the new account and, if the code has a duration, starts the access countdown right now. */
export async function finishRegCode(id: string, userId: string): Promise<void> {
  await sql`UPDATE access_codes SET used_by = ${userId} WHERE id = ${id}`;
  await sql`UPDATE users SET access_until = now() + make_interval(days => a.valid_days) FROM access_codes a WHERE a.id = ${id} AND users.id = ${userId} AND a.valid_days IS NOT NULL`;
}

export async function makeRegCodes(o: { schoolId: string; kind: "student" | "parent"; count: number; batch: string | null; from: string | null; to: string | null; days: number | null; by: string }): Promise<number> {
  let made = 0;
  for (let i = 0; i < o.count; i++) {
    for (let t = 0; t < 5; t++) {
      const plain = generateAccessCode(), hash = lookupHash(plain);
      const [r] = await sql`INSERT INTO access_codes (school_id, kind, code_hash, code_enc, batch, valid_from, expires_on, valid_days, created_by)
        VALUES (${o.schoolId}, ${o.kind}, ${hash}, ${encrypt(plain)}, ${o.batch}, ${o.from}, ${o.to}, ${o.days}, ${o.by}) ON CONFLICT (code_hash) DO NOTHING RETURNING id`;
      if (r) { made++; break; }
    }
  }
  return made;
}
