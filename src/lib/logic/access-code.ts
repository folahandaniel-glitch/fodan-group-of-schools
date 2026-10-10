import { randomBytes } from "node:crypto";

// Crockford-style base32 without I, L, O, U to avoid ambiguity.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** 15 characters of CSPRNG output = 75 bits of entropy, shown as FDN-XXXXX-XXXXX-XXXXX. */
export function generateAccessCode(bytes: Buffer = randomBytes(15)): string {
  let out = "";
  for (let i = 0; i < 15; i++) out += ALPHABET[bytes[i] & 31];
  return `FDN-${out.slice(0, 5)}-${out.slice(5, 10)}-${out.slice(10, 15)}`;
}

export function normaliseAccessCode(input: string): string {
  const s = input.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  const body = s.startsWith("FDN") ? s.slice(3) : s;
  if (body.length !== 15) return "";
  if (![...body].every((c) => ALPHABET.includes(c))) return "";
  return `FDN-${body.slice(0, 5)}-${body.slice(5, 10)}-${body.slice(10, 15)}`;
}

export function validAccessCodeShape(input: string): boolean {
  return normaliseAccessCode(input) !== "";
}
