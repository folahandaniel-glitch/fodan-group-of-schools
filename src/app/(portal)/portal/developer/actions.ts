"use server";
import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/auth";
import { audit } from "@/lib/security";
import { allSettings, setSetting } from "@/lib/settings";
import { FEATURES, MENU_CATALOGUE, PLATFORM_MODULES, normalisePlatform } from "@/lib/platform";
import { normaliseRules } from "@/lib/exam-rules";

type State = { error?: string; ok?: string };

/** Developer only: switches whole modules and individual menu items on or off for everyone else. */
export async function savePlatform(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  if (me.role !== "developer") return { error: "Only the Developer can change this." };
  const modules: Record<string, boolean> = {};
  for (const m of PLATFORM_MODULES) modules[m.key] = fd.get(`mod_${m.key}`) === "on";
  const menus: Record<string, boolean> = {};
  MENU_CATALOGUE.forEach((m, i) => { if (fd.get(`menu_${i}`) !== "on") menus[m.href] = false; });
  const features: Record<string, boolean> = {};
  for (const f of FEATURES) features[f.key] = fd.get(`feat_${f.key}`) === "on";
  const state = normalisePlatform({ modules, menus, features });
  await setSetting("platform", state);
  // Registration also drives the public sign-up and parent-linking pages.
  const cur = await allSettings();
  await setSetting("features", { ...(cur.features as Record<string, unknown>), registration: modules.registration, parentLinking: modules.registration });
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "platform.save", entity: "settings", entityId: "platform", meta: { off: PLATFORM_MODULES.filter((m) => !modules[m.key]).map((m) => m.key), menusOff: Object.keys(menus).length } });
  revalidatePath("/", "layout");
  return { ok: "Saved. The portal menus and pages now follow these switches." };
}

/** Developer only: exam rules (how many warnings, standard times). */
export async function saveExamRules(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  if (me.role !== "developer") return { error: "Only the Developer can change this." };
  const r = normaliseRules({ maxAttempts: Number(fd.get("maxAttempts")), standard: { classwork: Number(fd.get("m_classwork")), assignment: Number(fd.get("m_assignment")), mock: Number(fd.get("m_mock")), other: Number(fd.get("m_other")) }, lateEntryMin: Number(fd.get("lateEntryMin")) });
  await setSetting("exam_rules", r);
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "exam_rules.save", entity: "settings", entityId: "exam_rules", meta: r });
  return { ok: "Exam rules saved." };
}
