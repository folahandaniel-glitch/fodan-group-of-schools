"use server";
import { revalidatePath } from "next/cache";
import { requireMe, can } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { setSetting } from "@/lib/settings";
import { MODULES } from "@/lib/modules";
import { ROLES } from "@/lib/logic/permissions";

type State = { error?: string; ok?: string };
const TOKENS = new Set<string>(["all", "staff", "student", "parent", ...ROLES]);

export async function saveModules(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  if (!can(me, "settings:manage") && !can(me, "*")) return { error: "Only the Super Admin can change modules." };
  const out: Record<string, unknown> = {};
  for (const m of MODULES) {
    const list = (k: string) => clean(fd.get(`${m.key}_${k}`), 300).split(",").map((s) => s.trim()).filter(Boolean);
    const create = list("create"), view = list("view"), manage = list("manage");
    for (const t of [...create, ...view, ...manage]) if (!TOKENS.has(t)) return { error: `“${t}” is not a valid audience for ${m.label}. Use all, staff, student, parent or a role key.` };
    if (manage.length === 0) return { error: `${m.label}: choose at least one manager role.` };
    out[m.key] = { enabled: fd.get(`${m.key}_enabled`) === "on", label: clean(fd.get(`${m.key}_label`), 60) || m.label, create, view, manage };
  }
  await setSetting("modules", out);
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "modules.update", entity: "settings", entityId: "modules" });
  revalidatePath("/portal", "layout");
  return { ok: "Modules saved." };
}

export async function saveLeaveDays(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  if (!can(me, "settings:manage") && !can(me, "*")) return { error: "Only the Super Admin can change leave entitlements." };
  const out: Record<string, number> = {};
  for (const line of clean(fd.get("days"), 2000).split("\n")) {
    const [k, v] = line.split("=");
    const n = Number(v);
    if (k?.trim() && Number.isFinite(n) && n >= 0 && n <= 366) out[k.trim().slice(0, 40)] = n;
  }
  await setSetting("leaveDays", out);
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "leave.entitlements" });
  revalidatePath("/portal/m/leave");
  return { ok: "Leave entitlements saved." };
}

export async function saveLabels(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  if (!can(me, "settings:manage") && !can(me, "*")) return { error: "Only the Super Admin can change terminology." };
  const labels: Record<string, string> = {};
  for (const line of clean(fd.get("labels"), 4000).split("\n")) {
    const [k, ...v] = line.split("=");
    const key = k?.trim(), val = v.join("=").trim();
    if (key && val && val.length <= 40) labels[key] = val;
  }
  await setSetting("labels", labels);
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "labels.update", entity: "settings", entityId: "labels" });
  revalidatePath("/portal", "layout");
  return { ok: "Terminology saved." };
}
