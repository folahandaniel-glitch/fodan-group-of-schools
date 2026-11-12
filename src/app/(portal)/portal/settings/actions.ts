"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { can, requireMe, requirePerm } from "@/lib/auth";
import { audit, clean, safeUrl } from "@/lib/security";
import { allSettings, setSetting } from "@/lib/settings";
import { SITE_TEXT_DEFAULT } from "@/lib/site-text";
import { IMAGE_EXT, saveUpload } from "@/lib/files";
import { weightsValid } from "@/lib/logic/scoring";
import { THEME_SEEDS } from "@/lib/themes";
import { DEFAULT_SCHEDULE, normaliseSchedule, scheduleProblem, toMin, type Group, type Row } from "@/lib/schedule";
import { ACTIONS, RESOURCES, ROLES, isRoot } from "@/lib/logic/permissions";

type State = { error?: string; ok?: string };
const line = (v: FormDataEntryValue | null) => String(v ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

async function gate(group: string) {
  const me = await requireMe();
  const need = group === "home" || group === "content" || group === "site" ? "cms:edit" : "settings:edit";
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
    for (const k of ["cbt", "facebook", "youtube", "instagram", "tiktok", "linkedin", "x", "telegram", "snapchat", "threads", "whatsapp", "website"]) {
      const v = T(`s_${k}`, 300);
      social[k] = v ? safeUrl(v) ?? "" : "";
    }
    await setSetting("social", social);
    const custom: string[] = [];
    for (const l of line(fd.get("customLinks")).slice(0, 12)) {
      const [label, url] = l.split("|").map((x) => x.trim());
      const u = url ? safeUrl(url) : null;
      if (label && u) custom.push(`${label.slice(0, 40)} | ${u}`);
    }
    await setSetting("links", { custom });
  } else if (group === "theme") {
    const ids = new Set(THEME_SEEDS.map((t) => t.id));
    const def = T("default", 40);
    const offered = new Set(fd.getAll("offer").map(String));
    await setSetting("theme", { default: ids.has(def) ? def : "fodan-classic", picker: fd.get("picker") === "on", hidden: [...ids].filter((i) => !offered.has(i)) });
  } else if (group === "home") {
    await setSetting("home", {
      heroTitle: T("heroTitle", 160), heroSub: T("heroSub", 500), about: T("about", 1500), aboutCollege: T("aboutCollege", 1500), vision: T("vision", 600), mission: T("mission", 800),
      values: line(fd.get("values")).slice(0, 12), examPrep: T("examPrep", 800), stats: cur.home.stats,
    });
  } else if (group === "site") {
    const d = SITE_TEXT_DEFAULT;
    const pairs = (k: string, max = 12) => line(fd.get(k)).slice(0, max).map((l) => { const [label, href] = l.split("|").map((x) => x.trim()); return { label, href }; })
      .filter((x) => x.label && x.href && /^(\/|#|https?:\/\/)/.test(x.href)).map((x) => ({ href: x.href, label: x.label.slice(0, 60) }));
    const cards = line(fd.get("portalCards")).slice(0, 6).map((l) => { const [t, d2, href, cta] = l.split("|").map((x) => x.trim()); return { t: t ?? "", d: d2 ?? "", href: href ?? "", cta: cta ?? "" }; })
      .filter((c) => c.t && c.href && /^(\/|https?:\/\/)/.test(c.href));
    const grp = <F extends Record<string, string>>(prefix: string, f: F): F => Object.fromEntries(Object.keys(f).map((k) => [k, T(prefix + "." + k, 400)])) as F;
    const next = {
      nav: pairs("nav").map((x) => ({ href: x.href, label: x.label })), signInLabel: T("signInLabel", 40), registerLabel: T("registerLabel", 40), cbtLabel: T("cbtLabel", 40),
      footerContactTitle: T("footerContactTitle", 60), footerPortalsTitle: T("footerPortalsTitle", 60), footerLinks: pairs("footerLinks"), backendLabel: T("backendLabel", 40),
      hero: grp("hero", d.hero), portalCards: cards, contactCategories: line(fd.get("contactCategories")).slice(0, 12).map((x) => x.slice(0, 40)),
      sections: Object.fromEntries(Object.entries(d.sections).map(([k, f]) => [k, grp("sections." + k, f)])),
      pages: Object.fromEntries(Object.entries(d.pages).map(([k, f]) => [k, grp("pages." + k, f)])),
    };
    await setSetting("siteText", next);
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
    if (fd.get("resetSchedule") === "on") await setSetting("schedule", DEFAULT_SCHEDULE);
    else {
      const groups: Group[] = [];
      for (let g = 0; g < 6; g++) {
        if (fd.get(`g${g}_name`) === null) continue;
        const rows: Row[] = [];
        for (let i = 0; i < 40; i++) {
          const start = T(`g${g}_r${i}_start`, 5), end = T(`g${g}_r${i}_end`, 5);
          if (fd.get(`g${g}_r${i}_start`) === null) break;
          if (!start && !end) continue; // a blank row is removed
          if (!Number.isFinite(toMin(start)) || !Number.isFinite(toMin(end)) || toMin(end) <= toMin(start)) return { error: `${T(`g${g}_name`, 40) || "Group"}, row ${i + 1}: enter a start time and a later end time, or clear both to remove the row.` };
          rows.push({ kind: T(`g${g}_r${i}_kind`, 6) === "break" ? "break" : "period", label: T(`g${g}_r${i}_label`, 30), start, end });
        }
        if (rows.length === 0) continue;
        const problem = scheduleProblem(rows);
        if (problem) return { error: `${T(`g${g}_name`, 40) || "Group"}: ${problem}` };
        const days = [0, 1, 2, 3, 4].filter((d) => fd.get(`g${g}_d${d}`) === "on");
        const close = T(`g${g}_close`, 5);
        const noLesson = T(`g${g}_nl`, 60).split(/[ ,]+/).map(Number).filter((n) => n >= 1 && n <= 30);
        groups.push({ name: T(`g${g}_name`, 40) || "Days", days, close: Number.isFinite(toMin(close)) ? close : [...rows].sort((x, y) => toMin(x.start) - toMin(y.start))[rows.length - 1].end, noLesson: [...new Set(noLesson)].sort((x, y) => x - y), rows });
      }
      if (groups.length === 0) return { error: "Keep at least one group of days with a period." };
      const used = groups.flatMap((g) => g.days);
      if (new Set(used).size !== used.length) return { error: "A weekday can belong to only one group." };
      await setSetting("schedule", normaliseSchedule({ groups }));
    }
    await setSetting("report", { stamp: T("stamp", 40) || "School Stamp", signatories: ["Class Teacher", "Principal"], showAttendance: fd.get("showAttendance") === "on" });
    await setSetting("certificate", { heading: T("heading", 80), proprietorSign: T("proprietorSign", 80), principalSign: T("principalSign", 80) });
  } else return { error: "Unknown settings group." };

  await audit({ schoolId: me.schoolId, actorId: me.id, action: "settings.update", entity: "settings", entityId: group });
  revalidatePath("/", "layout");
  revalidatePath("/portal/timetable");
  return { ok: "Saved." };
}

export async function savePermissions(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("roles:manage");
  const role = clean(fd.get("role"), 30);
  if (!ROLES.includes(role as never) || isRoot(role)) return { error: "This role cannot be edited." };
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
