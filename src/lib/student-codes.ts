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
