import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ready, sql } from "./db";
import { sha256, token } from "./crypto";
import { defaultsFor, permits } from "./logic/permissions";

const COOKIE = "fgs_session";
const DAYS = 7;

export type Me = {
  id: string;
  schoolId: string;
  email: string;
  role: string;
  roles: string[];
  firstName: string;
  lastName: string;
  name: string;
  mustChange: boolean;
  mfaEnabled: boolean;
  mfaPassed: boolean;
  sessionId: string;
  perms: Set<string>;
};

export async function createSession(userId: string, mfaPassed: boolean): Promise<void> {
  const raw = token(32);
  const h = await headers();
  await sql`INSERT INTO sessions (id, user_id, mfa_passed, ip, user_agent, expires_at)
            VALUES (${sha256(raw)}, ${userId}, ${mfaPassed}, ${h.get("x-forwarded-for")?.split(",")[0] ?? null}, ${(h.get("user-agent") ?? "").slice(0, 200)}, now() + make_interval(days => ${DAYS}))`;
  (await cookies()).set(COOKIE, raw, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: DAYS * 86400,
  });
}

export async function destroySession(): Promise<void> {
  const c = await cookies();
  const raw = c.get(COOKIE)?.value;
  if (raw) await sql`DELETE FROM sessions WHERE id = ${sha256(raw)}`;
  c.delete(COOKIE);
}

export async function markMfaPassed(sessionId: string): Promise<void> {
  await sql`UPDATE sessions SET mfa_passed = true WHERE id = ${sessionId}`;
}

export const getMe = cache(async (): Promise<Me | null> => {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  await ready();
  const sid = sha256(raw);
  const [u] = await sql`
    SELECT u.*, s.mfa_passed FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ${sid} AND s.expires_at > now() AND u.status = 'active'`;
  if (!u) return null;
  const extra = await sql`SELECT role FROM user_roles WHERE user_id = ${u.id}`;
  const roles = [u.role, ...extra.map((r) => r.role as string)];
  const overrides = await sql`SELECT role, permissions FROM role_permissions WHERE school_id = ${u.school_id} AND role = ANY(${roles})`;
  const perms = new Set<string>();
  for (const r of roles) {
    const o = overrides.find((x) => x.role === r);
    for (const p of (o ? (o.permissions as string[]) : defaultsFor(r))) perms.add(p);
  }
  return {
    id: u.id, schoolId: u.school_id, email: u.email, role: u.role, roles,
    firstName: u.first_name, lastName: u.last_name, name: `${u.first_name} ${u.last_name}`.trim() || u.email,
    mustChange: u.must_change_password, mfaEnabled: u.mfa_enabled, mfaPassed: u.mfa_passed, sessionId: sid, perms,
  };
});

export function can(me: Me, perm: string): boolean {
  return permits(me.perms, perm);
}

export async function requireMe(): Promise<Me> {
  const me = await getMe();
  if (!me) redirect("/login");
  if (!me.mfaPassed) redirect("/login/mfa");
  return me;
}

/** Server-side gate used by every page and action. Redirects rather than hiding UI. */
export async function requirePerm(perm: string): Promise<Me> {
  const me = await requireMe();
  if (!can(me, perm)) redirect("/forbidden");
  return me;
}

export function isStaff(me: Me): boolean {
  return me.role !== "student" && me.role !== "parent";
}
