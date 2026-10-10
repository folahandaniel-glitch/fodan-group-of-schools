"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";

type State = { error?: string; ok?: string };

export async function issueCertificate(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("certificates:create");
  const adm = clean(fd.get("admissionNo"), 40);
  const title = clean(fd.get("title"), 160);
  if (!adm || !title) return { error: "Enter the admission number and certificate title." };
  const [s] = await sql`SELECT id FROM students WHERE school_id = ${me.schoolId} AND lower(admission_no) = ${adm.toLowerCase()}`;
  if (!s) return { error: "No student with that admission number." };
  const number = `FDN-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const score = clean(fd.get("score"), 10);
  await sql`INSERT INTO certificates (school_id, student_id, number, title, exam_label, score, grade, issued_by)
            VALUES (${me.schoolId}, ${s.id}, ${number}, ${title}, ${clean(fd.get("examLabel"), 160) || null}, ${score ? Number(score) : null}, ${clean(fd.get("grade"), 4) || null}, ${me.id})`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "certificate.issue", entity: "student", entityId: s.id, meta: { number } });
  revalidatePath("/portal/certificates");
  return { ok: `Certificate ${number} issued.` };
}

export async function revokeCertificate(fd: FormData): Promise<void> {
  const me = await requirePerm("certificates:approve");
  const id = clean(fd.get("id"), 40);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await sql`UPDATE certificates SET revoked = NOT revoked WHERE id = ${id} AND school_id = ${me.schoolId}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "certificate.revoke", entity: "certificate", entityId: id });
  revalidatePath("/portal/certificates");
}
