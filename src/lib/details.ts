import sharp from "sharp";
import { sql } from "./db";
import { decrypt, encrypt } from "./crypto";
import { allFields, progress, roleOf, type Values } from "./logic/details";

export const PHOTO_MAX = 5000; // bytes: "not more than 5 KB"

/** Shrinks any picture to a small square-ish JPEG of at most 5 KB by lowering size and quality until it fits. */
export async function compressPhoto(input: Buffer): Promise<Buffer> {
  for (const side of [240, 200, 168, 144, 120, 104, 88, 72, 64]) {
    for (const q of [70, 55, 42, 32, 24, 18]) {
      const out = await sharp(input, { failOn: "none" }).rotate().resize(side, side, { fit: "cover", position: "attention" }).flatten({ background: "#ffffff" }).jpeg({ quality: q, mozjpeg: true, chromaSubsampling: "4:2:0" }).toBuffer();
      if (out.length <= PHOTO_MAX) return out;
    }
  }
  return sharp(input, { failOn: "none" }).resize(48, 48, { fit: "cover" }).jpeg({ quality: 15, mozjpeg: true }).toBuffer();
}

export async function loadDetails(userId: string): Promise<{ values: Values; complete: boolean; photo: string | null }> {
  const [r] = await sql`SELECT d.data_enc, d.complete, u.photo_file FROM users u LEFT JOIN member_details d ON d.user_id = u.id WHERE u.id = ${userId}`;
  let values: Values = {};
  if (r?.data_enc) { try { values = JSON.parse(decrypt(r.data_enc as string)) as Values; } catch { values = {}; } }
  return { values, complete: !!r?.complete, photo: (r?.photo_file as string) ?? null };
}

export async function storeDetails(schoolId: string, userId: string, role: string, values: Values, complete: boolean): Promise<void> {
  const keys = new Set(allFields(roleOf(role)).map((f) => f.key));
  const clean: Values = {};
  for (const [k, v] of Object.entries(values)) if (keys.has(k)) clean[k] = String(v).trim().slice(0, 500);
  await sql`INSERT INTO member_details (user_id, school_id, data_enc, complete) VALUES (${userId}, ${schoolId}, ${encrypt(JSON.stringify(clean))}, ${complete})
    ON CONFLICT (user_id) DO UPDATE SET data_enc = EXCLUDED.data_enc, complete = EXCLUDED.complete, updated_at = now()`;
}

export async function savePhoto(schoolId: string, userId: string, role: string, file: File): Promise<{ ok: true; bytes: number } | { ok: false; error: string }> {
  if (!file || file.size === 0) return { ok: false, error: "Choose a picture." };
  if (file.size > 12 * 1024 * 1024) return { ok: false, error: "That picture is too large to read. Choose one under 12 MB." };
  let small: Buffer;
  try { small = await compressPhoto(Buffer.from(await file.arrayBuffer())); } catch { return { ok: false, error: "That file is not a picture we can read. Use a JPG or PNG." }; }
  const [f] = await sql`INSERT INTO files (school_id, name, mime, size, public, data, uploaded_by) VALUES (${schoolId}, 'photo.jpg', 'image/jpeg', ${small.length}, ${role !== "student" && role !== "parent"}, ${small}, ${userId}) RETURNING id`;
  await sql`UPDATE users SET photo_file = ${f.id}, updated_at = now() WHERE id = ${userId}`;
  return { ok: true, bytes: small.length };
}

/** Compulsory-fields progress for lists and banners. */
export async function completion(userId: string, role: string) {
  const d = await loadDetails(userId);
  return { ...progress(roleOf(role), d.values, !!d.photo), saved: d.complete };
}
