"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { can, requirePerm } from "@/lib/auth";
import { audit, clean, platformOf, safeUrl } from "@/lib/security";
import { kindFromExt, saveUpload } from "@/lib/files";

type State = { error?: string; ok?: string };
const uuid = (v: unknown) => { const s = clean(v, 40); return /^[0-9a-f-]{36}$/i.test(s) ? s : null; };

export async function addResource(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("resources:create");
  const title = clean(fd.get("title"), 160);
  if (!title) return { error: "Enter a title." };
  const rawUrl = clean(fd.get("url"), 500);
  const file = fd.get("file") as File | null;
  let kind = clean(fd.get("kind"), 20) || "link";
  let url: string | null = null, fileId: string | null = null, platform: string | null = null;
  if (file && file.size > 0) {
    const r = await saveUpload(file, { schoolId: me.schoolId, userId: me.id });
    if (!r.ok) return { error: r.error };
    fileId = r.id;
    kind = kindFromExt(r.kind);
  } else if (rawUrl) {
    const u = safeUrl(rawUrl);
    if (!u) return { error: "Enter a valid web address starting with https://." };
    url = u;
    platform = platformOf(u);
    kind = /youtube|youtu\.be/.test(u) ? "youtube" : "link";
  } else return { error: "Upload a file or paste a link." };
  const publish = fd.get("published") === "on" && can(me, "resources:publish");
  const [r] = await sql`INSERT INTO resources (school_id, title, description, subject_id, class_id, department_id, term_id, lesson_id, topic, subtopic, kind, url, file_id, platform, duration, recommended, published, uploaded_by)
    VALUES (${me.schoolId}, ${title}, ${clean(fd.get("description"), 1000) || null}, ${uuid(fd.get("subjectId"))}, ${uuid(fd.get("classId"))}, ${uuid(fd.get("departmentId"))},
      ${uuid(fd.get("termId"))}, ${uuid(fd.get("lessonId"))}, ${clean(fd.get("topic"), 160) || null}, ${clean(fd.get("subtopic"), 160) || null}, ${kind}, ${url}, ${fileId}, ${platform},
      ${clean(fd.get("duration"), 20) || null}, ${fd.get("recommended") === "on"}, ${publish}, ${me.id}) RETURNING id`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "resource.create", entity: "resource", entityId: r.id, meta: { kind } });
  revalidatePath("/portal/resources");
  return { ok: publish ? "Resource published." : "Resource saved as unpublished." };
}

export async function toggleResource(fd: FormData): Promise<void> {
  const me = await requirePerm("resources:publish");
  const id = uuid(fd.get("id"));
  if (!id) return;
  await sql`UPDATE resources SET published = NOT published WHERE id = ${id} AND school_id = ${me.schoolId}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "resource.toggle", entity: "resource", entityId: id });
  revalidatePath("/portal/resources");
}

export async function deleteResource(fd: FormData): Promise<void> {
  const me = await requirePerm("resources:edit");
  const id = uuid(fd.get("id"));
  if (!id) return;
  await sql`DELETE FROM resources WHERE id = ${id} AND school_id = ${me.schoolId} AND (uploaded_by = ${me.id} OR ${can(me, "resources:manage")})`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "resource.delete", entity: "resource", entityId: id });
  revalidatePath("/portal/resources");
}
