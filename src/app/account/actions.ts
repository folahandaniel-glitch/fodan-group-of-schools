"use server";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { sql } from "@/lib/db";
import { requireMe } from "@/lib/auth";
import { hashPassword, newTotpSecret, sha256, verifyPassword, verifyTotp } from "@/lib/crypto";
import { audit, clean } from "@/lib/security";
import { checkPassword } from "@/lib/logic/password";

type State = { error?: string; ok?: string; qr?: string; secret?: string; recovery?: string[] };

export async function changePassword(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  const cur = String(fd.get("current") ?? "");
  const pw = String(fd.get("password") ?? "");
  if (pw !== String(fd.get("confirm") ?? "")) return { error: "The two passwords do not match." };
  const c = checkPassword(pw);
  if (!c.ok) return { error: c.problems[0] };
  const [u] = await sql`SELECT password_hash FROM users WHERE id = ${me.id}`;
  if (!(await verifyPassword(u.password_hash, cur))) {
    await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "password.change.failed" });
    return { error: "Your current password is not correct." };
  }
  if (await verifyPassword(u.password_hash, pw)) return { error: "Choose a password different from your current one." };
  await sql`UPDATE users SET password_hash = ${await hashPassword(pw)}, must_change_password = false, updated_at = now() WHERE id = ${me.id}`;
  await sql`DELETE FROM sessions WHERE user_id = ${me.id} AND id <> ${me.sessionId}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "password.changed" });
  redirect("/portal");
}

export async function updateProfile(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  await sql`UPDATE users SET first_name = ${clean(fd.get("firstName"), 80)}, last_name = ${clean(fd.get("lastName"), 80)}, phone = ${clean(fd.get("phone"), 30) || null}, updated_at = now() WHERE id = ${me.id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "profile.update" });
  return { ok: "Profile updated." };
}

export async function beginMfa(): Promise<State> {
  const me = await requireMe();
  const secret = newTotpSecret();
  await sql`UPDATE users SET mfa_secret = ${secret}, mfa_enabled = false WHERE id = ${me.id}`;
  const uri = `otpauth://totp/Fodan%20Portal:${encodeURIComponent(me.email)}?secret=${secret}&issuer=Fodan%20Portal`;
  return { qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }), secret };
}

export async function confirmMfa(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  const [u] = await sql`SELECT mfa_secret FROM users WHERE id = ${me.id}`;
  if (!u?.mfa_secret || !verifyTotp(u.mfa_secret, clean(fd.get("code"), 10))) return { error: "That code is not valid. Check the time on your device and try again." };
  const plain = Array.from({ length: 8 }, () => randomBytes(5).toString("hex").toUpperCase());
  await sql`UPDATE users SET mfa_enabled = true, recovery_codes = ${sql.json(plain.map(sha256))} WHERE id = ${me.id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "mfa.enabled" });
  return { ok: "Two-factor authentication is on. Save these recovery codes — they are shown only once.", recovery: plain };
}

export async function revokeOtherSessions(): Promise<void> {
  const me = await requireMe();
  await sql`DELETE FROM sessions WHERE user_id = ${me.id} AND id <> ${me.sessionId}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "sessions.revoked" });
  redirect("/account/security");
}
