"use server";
import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/auth";
import { audit } from "@/lib/security";
import { allSettings, setSetting } from "@/lib/settings";
import { MENU_CATALOGUE, PLATFORM_MODULES, normalisePlatform } from "@/lib/platform";

type State = { error?: string; ok?: string };

/** Developer only: switches whole modules and individual menu items on or off for everyone else. */
export async function savePlatform(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  if (me.role !== "developer") return { error: "Only the Developer can change this." };
  const modules: Record<string, boolean> = {};
  for (const m of PLATFORM_MODULES) modules[m.key] = fd.get(`mod_${m.key}`) === "on";
  const menus: Record<string, boolean> = {};
  MENU_CATALOGUE.forEach((m, i) => { if (fd.get(`menu_${i}`) !== "on") menus[m.href] = false; });
  const state = normalisePlatform({ modules, menus });
  await setSetting("platform", state);
  // Registration also drives the public sign-up and parent-linking pages.
  const cur = await allSettings();
  await setSetting("features", { ...(cur.features as Record<string, unknown>), registration: modules.registration, parentLinking: modules.registration });
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "platform.save", entity: "settings", entityId: "platform", meta: { off: PLATFORM_MODULES.filter((m) => !modules[m.key]).map((m) => m.key), menusOff: Object.keys(menus).length } });
  revalidatePath("/", "layout");
  return { ok: "Saved. The portal menus and pages now follow these switches." };
}
