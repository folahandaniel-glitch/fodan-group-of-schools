import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

function secret(): Buffer {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 24) throw new Error("AUTH_SECRET must be set (24+ characters)");
  return createHash("sha256").update(s).digest();
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const token = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** Keyed hash used for looking up access codes without storing them in the clear. */
export const lookupHash = (s: string) => createHmac("sha256", secret()).update(s).digest("hex");

// Argon2id (algorithm 2) with OWASP-aligned parameters.
const ARGON = { algorithm: 2 as const, memoryCost: 19456, timeCost: 2, parallelism: 1 };
export const hashPassword = (pw: string) => argonHash(pw, ARGON);
export async function verifyPassword(hashed: string, pw: string): Promise<boolean> {
  try {
    return await argonVerify(hashed, pw);
  } catch {
    return false;
  }
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", secret(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}
export function decrypt(blob: string): string {
  const [iv, tag, enc] = blob.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", secret(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// --- TOTP (RFC 6238, SHA-1, 6 digits, 30s) for Super Admin 2FA ---
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function newTotpSecret(): string {
  const b = randomBytes(20);
  let bits = "";
  for (const x of b) bits += x.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}
function b32decode(s: string): Buffer {
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) {
    const v = B32.indexOf(c);
    if (v >= 0) bits += v.toString(2).padStart(5, "0");
  }
  const out: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
export function totp(secretB32: string, at = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30000)));
  const h = createHmac("sha1", b32decode(secretB32)).update(counter).digest();
  const o = h[h.length - 1] & 15;
  const code = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(code % 1_000_000).padStart(6, "0");
}
export function verifyTotp(secretB32: string, code: string): boolean {
  const c = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return false;
  const now = Date.now();
  return [-30000, 0, 30000].some((d) => safeEqual(totp(secretB32, now + d), c));
}
