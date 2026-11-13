"use server";
import { revalidatePath } from "next/cache";
import { can, requireMe } from "@/lib/auth";
import { audit, clean, safeUrl } from "@/lib/security";
import { allSettings, setSetting } from "@/lib/settings";
import { IMAGE_EXT, saveUpload } from "@/lib/files";

type State = { error?: string; ok?: string };
const SECTIONS = ["glance", "about", "values", "academics", "exams", "facilities", "news", "team", "portals", "faq"];

async function gate() {
  const me = await requireMe();
  if (!can(me, "studio:manage") && !can(me, "cms:manage") && !can(me, "settings:manage") && !can(me, "*")) throw new Error("denied");
  return me;
}
async function studio() { return ((await allSettings()).studio ?? {}) as Record<string, any>; }
const done = () => { revalidatePath("/", "layout"); };

export async function saveSections(_p: State, fd: FormData): Promise<State> {
  let me; try { me = await gate(); } catch { return { error: "You do not have permission." }; }
  const shown = new Set(fd.getAll("show").map(String));
  const hiddenSections = SECTIONS.filter((s) => !shown.has(s));
  await setSetting("studio", { ...(await studio()), hiddenSections });
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "studio.sections", entity: "settings", entityId: "studio", meta: { hidden: hiddenSections } });
  done();
  return { ok: "Homepage sections saved." };
}

export async function saveSeo(_p: State, fd: FormData): Promise<State> {
  let me; try { me = await gate(); } catch { return { error: "You do not have permission." }; }
  const cur = await studio();
  let ogFile = (cur.seo?.ogFile as string) ?? "";
  const f = fd.get("og") as File | null;
  if (f && f.size > 0) {
    const r = await saveUpload(f, { schoolId: me.schoolId, userId: me.id, allow: IMAGE_EXT, makePublic: true });
    if (!r.ok) return { error: r.error };
    ogFile = r.id;
  }
  if (fd.get("clearOg") === "on") ogFile = "";
  await setSetting("studio", { ...cur, seo: { title: clean(fd.get("title"), 70), description: clean(fd.get("description"), 200), keywords: clean(fd.get("keywords"), 200), ogFile } });
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "studio.seo", entity: "settings", entityId: "studio" });
  done();
  return { ok: "Search and sharing details saved." };
}

export async function saveBar(_p: State, fd: FormData): Promise<State> {
  let me; try { me = await gate(); } catch { return { error: "You do not have permission." }; }
  const link = clean(fd.get("link"), 300);
  const url = link ? (link.startsWith("/") ? link : safeUrl(link)) : "";
  if (link && !url) return { error: "The link must start with https:// or /." };
  const tone = ["gold", "navy", "red", "green"].includes(clean(fd.get("tone"), 8)) ? clean(fd.get("tone"), 8) : "gold";
  await setSetting("studio", { ...(await studio()), bar: { on: fd.get("on") === "on", text: clean(fd.get("text"), 200), link: url ?? "", tone } });
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "studio.bar", entity: "settings", entityId: "studio" });
  done();
  return { ok: "Announcement bar saved." };
}

export async function uploadMedia(_p: State, fd: FormData): Promise<State> {
  let me; try { me = await gate(); } catch { return { error: "You do not have permission." }; }
  const f = fd.get("file") as File | null;
  const r = await saveUpload(f, { schoolId: me.schoolId, userId: me.id, allow: IMAGE_EXT, makePublic: true });
  if (!r.ok) return { error: r.error };
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "studio.media", entity: "file", entityId: r.id });
  revalidatePath("/portal/studio");
  return { ok: `Uploaded. Use the address /api/files/${r.id}` };
}

/** Developer only: puts the public website into maintenance mode (the portal and sign-in keep working). */
export async function saveMaintenance(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  if (me.role !== "developer") return { error: "Only the Developer can switch maintenance mode." };
  await setSetting("studio", { ...(await studio()), maintenance: { on: fd.get("on") === "on", message: clean(fd.get("message"), 300) || "We are making improvements and will be back shortly." } });
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "studio.maintenance", entity: "settings", entityId: "studio", meta: { on: fd.get("on") === "on" } });
  done();
  return { ok: fd.get("on") === "on" ? "The public website is now in maintenance mode." : "The public website is live." };
}
