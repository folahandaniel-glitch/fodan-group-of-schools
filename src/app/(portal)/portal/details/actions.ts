"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireMe } from "@/lib/auth";
import { audit } from "@/lib/security";
import { loadDetails, savePhoto, storeDetails } from "@/lib/details";
import { SECTIONS, allFields, roleOf, validate, type Values } from "@/lib/logic/details";

type State = { error?: string; ok?: string };

/** Saves the signed-in person's own details. "draft" keeps what is filled in; "submit" needs every field and a picture. */
export async function saveMyDetails(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  const role = roleOf(me.role), mode = String(fd.get("mode")) === "draft" ? "draft" : "submit";
  const values: Values = {};
  for (const f of allFields(role)) values[f.key] = String(fd.get(f.key) ?? "").trim();
  const prev = await loadDetails(me.id);
  const file = fd.get("photo") as File | null;
  let hasPhoto = !!prev.photo;
  if (file && typeof file !== "string" && file.size > 0) {
    const r = await savePhoto(me.schoolId, me.id, me.role, file);
    if (!r.ok) return { error: r.error };
    hasPhoto = true;
  }
  const missing = validate(role, values);
  const complete = mode === "submit" && Object.keys(missing).length === 0 && hasPhoto;
  if (mode === "submit" && !complete) {
    await storeDetails(me.schoolId, me.id, me.role, values, false);
    const bad = SECTIONS[role].map((s) => ({ s, f: s.fields.filter((x) => missing[x.key]) })).filter((x) => x.f.length);
    const lines = bad.slice(0, 4).map((x) => `${x.s.title}: ${x.f.slice(0, 4).map((y) => `${y.label} (${missing[y.key].toLowerCase()})`).join(", ")}${x.f.length > 4 ? "…" : ""}`);
    return { error: `Not complete yet. ${!hasPhoto ? "Add your picture. " : ""}${lines.join(" | ")}${bad.length > 4 ? " | more sections need attention" : ""}. Your progress was saved.` };
  }
  await storeDetails(me.schoolId, me.id, me.role, values, complete);
  if (values.surname && values.firstName && role !== "student") await sql`UPDATE users SET last_name = ${values.surname}, first_name = ${values.firstName}, updated_at = now() WHERE id = ${me.id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: complete ? "details.complete" : "details.save", entity: "user", entityId: me.id });
  revalidatePath("/portal/details"); revalidatePath("/portal");
  return { ok: complete ? "All details saved. Thank you." : "Progress saved. Finish every section and press Submit when ready." };
}
