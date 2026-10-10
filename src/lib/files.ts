import { sql } from "./db";

export const MAX_BYTES = 4 * 1024 * 1024; // Vercel functions accept ~4.5 MB request bodies.

const TYPES: Record<string, { mime: string; magic?: number[][] }> = {
  pdf: { mime: "application/pdf", magic: [[0x25, 0x50, 0x44, 0x46]] },
  png: { mime: "image/png", magic: [[0x89, 0x50, 0x4e, 0x47]] },
  jpg: { mime: "image/jpeg", magic: [[0xff, 0xd8, 0xff]] },
  jpeg: { mime: "image/jpeg", magic: [[0xff, 0xd8, 0xff]] },
  webp: { mime: "image/webp", magic: [[0x52, 0x49, 0x46, 0x46]] },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", magic: [[0x50, 0x4b]] },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", magic: [[0x50, 0x4b]] },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", magic: [[0x50, 0x4b]] },
  doc: { mime: "application/msword", magic: [[0xd0, 0xcf, 0x11, 0xe0]] },
  xls: { mime: "application/vnd.ms-excel", magic: [[0xd0, 0xcf, 0x11, 0xe0]] },
  ppt: { mime: "application/vnd.ms-powerpoint", magic: [[0xd0, 0xcf, 0x11, 0xe0]] },
  mp3: { mime: "audio/mpeg" },
  mp4: { mime: "video/mp4" },
};
export const IMAGE_EXT = ["png", "jpg", "jpeg", "webp"];

export type SaveResult = { ok: true; id: string; kind: string; name: string } | { ok: false; error: string };

export async function saveUpload(
  file: File | null,
  opts: { schoolId: string; userId: string; allow?: string[]; makePublic?: boolean },
): Promise<SaveResult> {
  if (!file || typeof file === "string" || file.size === 0) return { ok: false, error: "Choose a file to upload." };
  if (file.size > MAX_BYTES) return { ok: false, error: "File is too large. The limit is 4 MB." };
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const t = TYPES[ext];
  const allow = opts.allow ?? Object.keys(TYPES);
  if (!t || !allow.includes(ext)) return { ok: false, error: "This file type is not allowed." };
  const buf = Buffer.from(await file.arrayBuffer());
  if (t.magic && !t.magic.some((m) => m.every((b, i) => buf[i] === b))) {
    return { ok: false, error: "The file content does not match its type." };
  }
  const safe = file.name.replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 120);
  const [r] = await sql`INSERT INTO files (school_id, name, mime, size, public, data, uploaded_by)
                        VALUES (${opts.schoolId}, ${safe}, ${t.mime}, ${buf.length}, ${!!opts.makePublic}, ${buf}, ${opts.userId}) RETURNING id`;
  return { ok: true, id: r.id, kind: ext, name: safe };
}

export function kindFromExt(ext: string): string {
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["ppt", "pptx"].includes(ext)) return "powerpoint";
  if (["xls", "xlsx"].includes(ext)) return "excel";
  if (["mp3"].includes(ext)) return "audio";
  if (["mp4"].includes(ext)) return "video";
  if (IMAGE_EXT.includes(ext)) return "image";
  return "file";
}
