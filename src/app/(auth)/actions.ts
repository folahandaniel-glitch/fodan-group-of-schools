"use server";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { createSession, destroySession, getMe, markMfaPassed } from "@/lib/auth";
import { hashPassword, lookupHash, sha256, verifyPassword, verifyTotp } from "@/lib/crypto";
import { audit, clean, clientIp, rateLimit } from "@/lib/security";
import { checkPassword, normEmail, validEmail } from "@/lib/logic/password";
import { normaliseAccessCode } from "@/lib/logic/access-code";
import { getSchool, getSetting } from "@/lib/settings";
import { createUser, issueResetToken, linkChild, UserError } from "@/lib/accounts";
import { sendMail } from "@/lib/mail";

type State = { error?: string; ok?: string };
const DUMMY = "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$7mS1z3Gm0Rb1wCq0m5s8y2m0l8O8mZk0b3o0m9bq4lE";

export async function login(_p: State, fd: FormData): Promise<State> {
  const email = normEmail(clean(fd.get("email"), 254));
  const password = String(fd.get("password") ?? "");
  const ip = await clientIp();
  if (!(await rateLimit(`login-ip:${ip}`, 30, 600)) || !(await rateLimit(`login-user:${email}`, 8, 900))) {
    return { error: "Too many sign-in attempts. Please wait a few minutes and try again." };
  }
  const [u] = email ? await sql`SELECT * FROM users WHERE lower(email) = ${email}` : [];
  if (!u) {
    await verifyPassword(DUMMY, password);
    return { error: "Invalid email or password." };
  }
  if (u.locked_until && new Date(u.locked_until) > new Date()) return { error: "This account is temporarily locked. Try again later." };
  const ok = await verifyPassword(u.password_hash, password);
  if (!ok) {
    const n = u.failed_logins + 1;
    await sql`UPDATE users SET failed_logins = ${n}, locked_until = ${n >= 8 ? sql`now() + interval '15 minutes'` : null} WHERE id = ${u.id}`;
    await audit({ schoolId: u.school_id, actorId: u.id, actor: email, category: "security", action: "login.failed", meta: { attempts: n } });
    return { error: "Invalid email or password." };
  }
  if (u.status !== "active") {
    await audit({ schoolId: u.school_id, actorId: u.id, category: "security", action: "login.blocked", meta: { status: u.status } });
    return { error: "This account is suspended. Please contact the school." };
  }
  await sql`UPDATE users SET failed_logins = 0, locked_until = NULL, last_login = now() WHERE id = ${u.id}`;
  await createSession(u.id, !u.mfa_enabled);
  await audit({ schoolId: u.school_id, actorId: u.id, actor: email, action: "login", meta: { mfa: u.mfa_enabled } });
  redirect(u.mfa_enabled ? "/login/mfa" : "/portal");
}

export async function verifyMfa(_p: State, fd: FormData): Promise<State> {
  const me = await getMe();
  if (!me) redirect("/login");
  const ip = await clientIp();
  if (!(await rateLimit(`mfa:${me.id}`, 8, 600)) || !(await rateLimit(`mfa-ip:${ip}`, 30, 600))) return { error: "Too many attempts. Please wait and try again." };
  const code = clean(fd.get("code"), 20).replace(/\s|-/g, "");
  const [u] = await sql`SELECT mfa_secret, recovery_codes FROM users WHERE id = ${me.id}`;
  let ok = !!u.mfa_secret && verifyTotp(u.mfa_secret, code);
  if (!ok && Array.isArray(u.recovery_codes)) {
    const h = sha256(code.toUpperCase());
    if ((u.recovery_codes as string[]).includes(h)) {
      ok = true;
      await sql`UPDATE users SET recovery_codes = ${sql.json((u.recovery_codes as string[]).filter((x) => x !== h))} WHERE id = ${me.id}`;
    }
  }
  if (!ok) {
    await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "mfa.failed" });
    return { error: "That code is not valid." };
  }
  await markMfaPassed(me.sessionId);
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "mfa.passed" });
  redirect("/portal");
}

export async function logout() {
  const me = await getMe();
  if (me) await audit({ schoolId: me.schoolId, actorId: me.id, action: "logout" });
  await destroySession();
  redirect("/");
}

function pwPair(fd: FormData): { pw: string } | { error: string } {
  const pw = String(fd.get("password") ?? "");
  const c = String(fd.get("confirm") ?? "");
  const chk = checkPassword(pw);
  if (!chk.ok) return { error: chk.problems[0] };
  if (pw !== c) return { error: "The two passwords do not match." };
  return { pw };
}

export async function registerStudent(_p: State, fd: FormData): Promise<State> {
  const ip = await clientIp();
  if (!(await rateLimit(`reg-ip:${ip}`, 12, 3600))) return { error: "Too many attempts. Please try again later." };
  const features = await getSetting<{ registration: boolean }>("features");
  if (features && features.registration === false) return { error: "Registration is currently closed. Please contact the school." };
  const code = normaliseAccessCode(String(fd.get("code") ?? ""));
  const email = normEmail(clean(fd.get("email"), 254));
  const first = clean(fd.get("firstName"), 80);
  const last = clean(fd.get("lastName"), 80);
  if (!validEmail(email)) return { error: "Enter a valid email address — it will be your username." };
  const pp = pwPair(fd);
  if ("error" in pp) return pp;
  const BAD = "Invalid access code, or the details do not match the school record.";
  if (!code) return { error: BAD };
  const [st] = await sql`SELECT * FROM students WHERE code_hash = ${lookupHash(code)}`;
  if (!st || st.code_status !== "active" || st.user_id || ["withdrawn", "graduated", "archived"].includes(st.status) ||
      st.last_name.trim().toLowerCase() !== last.toLowerCase() || st.first_name.trim().toLowerCase() !== first.toLowerCase()) {
    await audit({ category: "security", action: "student.register.failed", meta: { ip } });
    return { error: BAD };
  }
  try {
    const uid = await createUser({ schoolId: st.school_id, email, password: pp.pw, role: "student", firstName: st.first_name, lastName: st.last_name, phone: clean(fd.get("phone"), 30) });
    await sql`UPDATE students SET user_id = ${uid}, status = 'active', code_activated_at = now(),
        middle_name = COALESCE(NULLIF(${clean(fd.get("middleName"), 80)}, ''), middle_name),
        dob = COALESCE(dob, NULLIF(${clean(fd.get("dob"), 10)}, '')::date),
        gender = COALESCE(NULLIF(${clean(fd.get("gender"), 12)}, ''), gender),
        address = COALESCE(NULLIF(${clean(fd.get("address"), 300)}, ''), address),
        state = COALESCE(NULLIF(${clean(fd.get("state"), 80)}, ''), state),
        country = COALESCE(NULLIF(${clean(fd.get("country"), 80)}, ''), country),
        guardian_name = COALESCE(NULLIF(${clean(fd.get("guardianName"), 120)}, ''), guardian_name),
        guardian_phone = COALESCE(NULLIF(${clean(fd.get("guardianPhone"), 30)}, ''), guardian_phone),
        emergency_contact = COALESCE(NULLIF(${clean(fd.get("emergency"), 120)}, ''), emergency_contact),
        previous_school = COALESCE(NULLIF(${clean(fd.get("previousSchool"), 160)}, ''), previous_school)
        WHERE id = ${st.id}`;
    await audit({ schoolId: st.school_id, actorId: uid, action: "access_code.activated", entity: "student", entityId: st.id });
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
  redirect("/login?registered=1");
}

export async function registerParent(_p: State, fd: FormData): Promise<State> {
  const ip = await clientIp();
  if (!(await rateLimit(`reg-ip:${ip}`, 12, 3600))) return { error: "Too many attempts. Please try again later." };
  const name = clean(fd.get("fullName"), 160);
  const [first, ...rest] = name.split(/\s+/);
  const email = normEmail(clean(fd.get("email"), 254));
  const phone = clean(fd.get("phone"), 30);
  if (!first || rest.length === 0) return { error: "Enter your full name (first and last name)." };
  if (!validEmail(email)) return { error: "Enter a valid email address — it will be your username." };
  if (phone.replace(/\D/g, "").length < 7) return { error: "Enter a valid phone number." };
  const pp = pwPair(fd);
  if ("error" in pp) return pp;
  const school = await getSchool();
  let uid: string;
  try {
    uid = await createUser({ schoolId: school.id, email, password: pp.pw, role: "parent", firstName: first, lastName: rest.join(" "), phone });
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
  await sql`INSERT INTO parent_profiles (user_id, address, relationship, emergency_contact)
            VALUES (${uid}, ${clean(fd.get("address"), 300)}, ${clean(fd.get("relationship"), 40)}, ${clean(fd.get("emergency"), 120)})`;
  const code = clean(fd.get("code"), 40);
  if (code) {
    const r = await linkChild({ id: uid, email, phone }, { code, admissionNo: clean(fd.get("admissionNo"), 40), dob: clean(fd.get("dob"), 10), relationship: clean(fd.get("relationship"), 40) });
    redirect(`/login?registered=1&link=${r.ok ? r.status : "failed"}`);
  }
  redirect("/login?registered=1");
}

export async function forgot(_p: State, fd: FormData): Promise<State> {
  const email = normEmail(clean(fd.get("email"), 254));
  const ip = await clientIp();
  const generic = { ok: "If an account exists for that email, a reset link has been sent. If you do not receive one, contact the school office." };
  if (!(await rateLimit(`forgot:${ip}`, 5, 3600))) return generic;
  const [u] = validEmail(email) ? await sql`SELECT id, school_id FROM users WHERE lower(email) = ${email} AND status = 'active'` : [];
  if (u) {
    const raw = await issueResetToken(u.id, null, 30);
    const base = process.env.APP_BASE_URL || "";
    await sendMail(email, "Reset your Fodan portal password", `Use this link within 30 minutes to choose a new password:\n${base}/reset/${raw}\n\nIf you did not ask for this, ignore this email.`);
    await audit({ schoolId: u.school_id, actorId: u.id, category: "security", action: "password.reset.requested" });
  }
  return generic;
}

export async function resetPassword(_p: State, fd: FormData): Promise<State> {
  const raw = String(fd.get("token") ?? "");
  const pp = pwPair(fd);
  if ("error" in pp) return pp;
  const [t] = await sql`SELECT user_id FROM reset_tokens WHERE token_hash = ${sha256(raw)} AND used_at IS NULL AND expires_at > now()`;
  if (!t) return { error: "This reset link is invalid or has expired. Ask the school for a new one." };
  const [u] = await sql`SELECT school_id FROM users WHERE id = ${t.user_id}`;
  await sql`UPDATE users SET password_hash = ${await hashPassword(pp.pw)}, must_change_password = false, failed_logins = 0, locked_until = NULL, updated_at = now() WHERE id = ${t.user_id}`;
  await sql`UPDATE reset_tokens SET used_at = now() WHERE token_hash = ${sha256(raw)}`;
  await sql`DELETE FROM sessions WHERE user_id = ${t.user_id}`;
  await audit({ schoolId: u.school_id, actorId: t.user_id, category: "security", action: "password.reset.completed" });
  redirect("/login?reset=1");
}
