import { sql } from "./db";
import { encrypt, lookupHash } from "./crypto";
import { generateAccessCode } from "./logic/access-code";

/** A fresh, unique student access code: the plain value (shown once to the school), its lookup hash and its encrypted copy. */
export async function newAccessCode(): Promise<{ plain: string; hash: string; enc: string }> {
  for (let i = 0; i < 5; i++) {
    const plain = generateAccessCode();
    const hash = lookupHash(plain);
    const [dup] = await sql`SELECT 1 FROM students WHERE code_hash = ${hash}`;
    if (!dup) return { plain, hash, enc: encrypt(plain) };
  }
  throw new Error("Could not generate a unique code");
}

const day = (d: unknown) => (d ? new Date(d as string).toISOString().slice(0, 10) : "");
/** True when the code is inside its validity window (Lagos date). No dates set means no limit. */
export function codeInWindow(st: { code_valid_from?: unknown; code_expires_on?: unknown }): boolean {
  const today = new Date(Date.now() + 3600_000).toISOString().slice(0, 10);
  const from = day(st.code_valid_from), to = day(st.code_expires_on);
  return (!from || from <= today) && (!to || to >= today);
}
