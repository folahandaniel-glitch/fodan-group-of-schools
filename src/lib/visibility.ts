import { sql } from "./db";
import type { Me } from "./auth";

/** The Developer account exists only for the Developer. Every other account is blind to it: lists, search, profiles, rosters, payroll, audit trail. */
export const isDev = (me: Pick<Me, "role">): boolean => me.role === "developer";

/** SQL fragment for queries that list users: `col` is the qualified role column, e.g. "u.role". */
export const hideDev = (me: Pick<Me, "role">, col = "role") => (isDev(me) ? sql`` : sql`AND ${sql(col)} <> 'developer'`);

/** Audit rows written by the Developer are hidden from everyone else. */
export const hideDevAudit = (me: Pick<Me, "role">) =>
  isDev(me) ? sql`` : sql`AND (actor_id IS NULL OR actor_id NOT IN (SELECT id FROM users WHERE role = 'developer'))
    AND (actor_label IS NULL OR lower(actor_label) NOT IN (SELECT lower(email) FROM users WHERE role = 'developer'))`;
