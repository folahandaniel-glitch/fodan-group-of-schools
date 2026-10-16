"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { can, requireMe, requirePerm } from "@/lib/auth";
import { audit, clean, safeUrl } from "@/lib/security";
import { allSettings, setSetting } from "@/lib/settings";
import { IMAGE_EXT, saveUpload } from "@/lib/files";
import { weightsValid } from "@/lib/logic/scoring";
import { ACTIONS, RESOURCES, ROLES } from "@/lib/logic/permissions";

type State = { error?: string; ok?: string };
const line = (v: FormDataEntryValue | null) => String(v ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

async function gate(group: string) {
  const me = await requireMe();
  const need = group === "home" || group === "content" ? "cms:edit" : "settings:edit";
  if (!can(me, need) && !can(me, "settings:manage") && !can(me, "cms:manage")) throw new Error("Not permitted");
  return me;
}

export async function saveSettings(_p: State, fd: FormData): Promise<State> {
  const group = clean(fd.get("_group"), 20);
  let me;
  try { me = await gate(group); } catch { return { error: "You do not have permission to change this setting." }; }
  const cur = await allSettings();
  const T = (k: string, n = 500) => clean(fd.get(k), n);

  if (group === "brand") {
    let logoFile = cur.brand.logoFile as string;
    const f = fd.get("logo") as File | null;
    if (f && f.size > 0) {
      const r = await saveUpload(f, { schoolId: me.schoolId, userId: me.id, allow: ["png", "webp", "jpg", "jpeg"], makePublic: true });
      if (!r.ok) return { error: r.error };
      logoFile = r.id;
    }
    if (fd.get("resetLogo") === "on") logoFile = "";
    await setSetting("brand", { group: T("group", 120), school: T("school", 120), tagline: T("tagline", 160), subTagline: T("subTagline", 200), logoFile });
  } else if (group === "founder") {
    let photoFile = cur.founder.photoFile as string;
    const f = fd.get("photo") as File | null;
    if (f && f.size > 0) {
      const r = await saveUpload(f, { schoolId: me.schoolId, userId: me.id, allow: IMAGE_EXT, makePublic: true });
      if (!r.ok) return { error: r.error };
      photoFile = r.id;
    }
    await setSetting("founder", {
      name: T("name", 120), position: T("position", 120), photoFile, qualifications: T("qualifications", 400), profile: T("profile", 3000),
      message: T("message", 2000), toParents: T("toParents", 1500), toStudents: T("toStudents", 1500), toStaff: T("toStaff", 1500), vision: T("vision", 800),
    });
  } else if (group === "contact") {
    await setSetting("contact", { phone: T("phone", 40), email: T("email", 160), address: T("address", 300), whatsapp: T("whatsapp", 20).replace(/\D/g, ""), officeHours: T("officeHours", 160), emergency: T("emergency", 40) });
    const social: Record<string, string> = {};
    for (const k of ["facebook", "youtube", "instagram", "tiktok", "linkedin", "x", "whatsapp", "website"]) {
      const v = T(`s_${k}`, 300);
      social[k] = v ? safeUrl(v) ?? "" : "";
    }
    await setSetting("social", social);
  } else if (group === "home") {
    await setSetting("home", {
      heroTitle: T("heroTitle", 160), heroSub: T("heroSub", 500), about: T("about", 1500), aboutCollege: T("aboutCollege", 1500), vision: T("vision", 600), mission: T("mission", 800),
      values: line(fd.get("values")).slice(0, 12), examPrep: T("examPrep", 800), stats: cur.home.stats,
    });
  } else if (group === "academic") {
    const w = { assignment: Number(fd.get("w_assignment")), ca: Number(fd.get("w_ca")), exam: Number(fd.get("w_exam")) };
    if (!weightsValid(w)) return { error: "Weights must be whole numbers that add up to exactly 100." };
    const bands = line(fd.get("grades")).map((l) => {
      const [grade, min, max, remark] = l.split("|").map((x) => x.trim());
      return { grade, min: Number(min), max: Number(max), remark: remark ?? "", tone: "blue" };
    });
    if (bands.length < 2 || bands.some((b) => !b.grade || !Number.isFinite(b.min) || !Number.isFinite(b.max) || b.min > b.max))
      return { error: "Grade bands must be lines like: A | 70 | 100 | Excellent" };
    const comments: Record<string, string> = {};
    for (const b of bands) comments[b.grade] = T(`c_${b.grade}`, 400) || cur.comments[b.grade] || "";
    await setSetting("weights", w);
    await setSetting("grading", bands);
    await setSetting("comments", comments);
    await setSetting("results", { release: ["immediate", "delayed", "manual"].includes(T("release", 10)) ? T("release", 10) : "manual", showPosition: fd.get("showPosition") === "on" });
    await setSetting("seniority", { minYears: Number(fd.get("minYears")) || 0, minPositionRank: 0, requireDegree: fd.get("requireDegree") === "on" });
  } else if (group === "eligibility") {
    const out: Record<string, number[]> = {};
    for (const k of ["common_entrance", "bece", "neco", "waec", "jamb", "international"]) {
      out[k] = T(`e_${k}`, 60).split(",").map((n) => Number(n.trim())).filter((n) => n >= 1 && n <= 12);
    }
    await setSetting("eligibility", out);
    await setSetting("features", { registration: fd.get("f_registration") === "on", parentLinking: fd.get("f_parentLinking") === "on", mocks: fd.get("f_mocks") === "on", studyCentre: fd.get("f_studyCentre") === "on", ai: fd.get("f_ai") === "on" });
  } else if (group === "auth") {
    const art = { ...(cur.authArt as Record<string, string>) };
    for (const slot of ["login", "register", "staff"]) {
      const f = fd.get(`art_${slot}`) as File | null;
      if (f && f.size > 0) {
        const r = await saveUpload(f, { schoolId: me.schoolId, userId: me.id, allow: IMAGE_EXT, makePublic: true });
        if (!r.ok) return { error: r.error };
        art[slot] = r.id;
      }
      if (fd.get(`clear_${slot}`) === "on") art[slot] = "";
    }
    art.caption = T("caption", 160);
    await setSetting("authArt", art);
    await setSetting("footer", { text: T("footer", 200) });
    const pos: Record<string, string[]> = {};
    for (const g of ["secondary", "primary", "non_teaching"]) pos[g] = line(fd.get(`pos_${g}`)).slice(0, 60).map((l) => l.slice(0, 120));
    await setSetting("positions", pos);
  } else if (group === "periods") {
    const periods = line(fd.get("periods")).map((l, i) => ({ n: i + 1, label: l.slice(0, 40) })).slice(0, 14);
    await setSetting("periods", periods);
    await setSetting("report", { stamp: T("stamp", 40) || "School Stamp", signatories: ["Class Teacher", "Principal"], showAttendance: fd.get("showAttendance") === "on" });
    await setSetting("certificate", { heading: T("heading", 80), proprietorSign: T("proprietorSign", 80), principalSign: T("principalSign", 80) });
  } else return { error: "Unknown settings group." };

  await audit({ schoolId: me.schoolId, actorId: me.id, action: "settings.update", entity: "settings", entityId: group });
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

export async function savePermissions(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("roles:manage");
  const role = clean(fd.get("role"), 30);
  if (!ROLES.includes(role as never) || role === "super_admin") return { error: "This role cannot be edited." };
  const valid = new Set<string>(RESOURCES.flatMap((r) => ACTIONS.map((a) => `${r}:${a}`)));
  const perms = fd.getAll("perm").map((v) => String(v)).filter((p) => valid.has(p));
  await sql`INSERT INTO role_permissions (school_id, role, permissions) VALUES (${me.schoolId}, ${role}, ${sql.json(perms)})
            ON CONFLICT (school_id, role) DO UPDATE SET permissions = EXCLUDED.permissions, updated_at = now()`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "permission.change", entity: "role", entityId: role, meta: { count: perms.length } });
  revalidatePath("/portal/settings");
  return { ok: `Permissions for ${role} saved.` };
}

export async function resetPermissions(fd: FormData): Promise<void> {
  const me = await requirePerm("roles:manage");
  const role = clean(fd.get("role"), 30);
  await sql`DELETE FROM role_permissions WHERE school_id = ${me.schoolId} AND role = ${role}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "permission.reset", entity: "role", entityId: role });
  revalidatePath("/portal/settings");
}

export async function saveContent(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("cms:edit");
  const id = clean(fd.get("id"), 40);
  const kind = clean(fd.get("kind"), 20);
  if (!["news", "event", "announcement", "programme", "facility", "activity", "faq"].includes(kind)) return { error: "Invalid type." };
  const title = clean(fd.get("title"), 200), body = clean(fd.get("body"), 4000);
  if (!title) return { error: "Enter a title." };
  if (id && /^[0-9a-f-]{36}$/i.test(id)) {
    await sql`UPDATE content_items SET title = ${title}, body = ${body}, sort = ${Number(fd.get("sort")) || 100}, published = ${fd.get("published") === "on"} WHERE id = ${id} AND school_id = ${me.schoolId}`;
  } else {
    await sql`INSERT INTO content_items (school_id, kind, title, body, sort, published, created_by, audience) VALUES (${me.schoolId}, ${kind}, ${title}, ${body}, ${Number(fd.get("sort")) || 100}, ${fd.get("published") === "on"}, ${me.id}, 'public')`;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "content.save", entity: "content", entityId: id || null, meta: { kind, title } });
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

export async function deleteContent(fd: FormData): Promise<void> {
  const me = await requirePerm("cms:edit");
  const id = clean(fd.get("id"), 40);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await sql`DELETE FROM content_items WHERE id = ${id} AND school_id = ${me.schoolId}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "content.delete", entity: "content", entityId: id });
  revalidatePath("/", "layout");
}
