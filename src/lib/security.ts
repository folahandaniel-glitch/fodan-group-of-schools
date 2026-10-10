import { headers } from "next/headers";
import { sql } from "./db";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

export async function audit(opts: {
  schoolId?: string | null;
  actorId?: string | null;
  actor?: string | null;
  action: string;
  entity?: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  category?: "audit" | "security";
}): Promise<void> {
  let ip = "";
  try {
    ip = await clientIp();
  } catch {
    /* outside a request */
  }
  // Never persist anything that looks like a secret.
  const meta = JSON.parse(JSON.stringify(opts.meta ?? {}, (k, v) => (/pass|secret|token|code_enc|hash/i.test(k) ? undefined : v)));
  let label = opts.actor ?? null;
  let schoolId = opts.schoolId ?? null;
  if (opts.actorId && (!label || !schoolId)) {
    const [u] = await sql`SELECT email, school_id FROM users WHERE id = ${opts.actorId}`;
    label ??= u?.email ?? null;
    if (!schoolId || !/^[0-9a-f-]{36}$/i.test(schoolId) || !u) schoolId = schoolId ?? u?.school_id ?? null;
  }
  await sql`INSERT INTO audit_logs (school_id, category, actor_id, actor_label, action, entity, entity_id, meta, ip)
            VALUES (${schoolId}, ${opts.category ?? "audit"}, ${opts.actorId ?? null}, ${label},
                    ${opts.action}, ${opts.entity ?? null}, ${opts.entityId ?? null}, ${sql.json(meta)}, ${ip})`;
}

/** Fixed-window limiter backed by the database so it works across serverless instances. */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const [r] = await sql`
    INSERT INTO rate_limits (key, count, window_start) VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN now() ELSE rate_limits.window_start END
    RETURNING count`;
  return r.count <= max;
}

/** Strip anything that could be interpreted as markup; React escapes output as well (defence in depth). */
export function clean(s: unknown, max = 2000): string {
  return String(s ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, max);
}

export function safeUrl(u: string): string | null {
  try {
    const url = new URL(u.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function platformOf(u: string): string {
  const h = new URL(u).hostname.replace(/^www\./, "");
  if (/youtube\.com|youtu\.be/.test(h)) return "YouTube";
  if (/facebook\.com|fb\.watch/.test(h)) return "Facebook";
  if (/drive\.google\.com|docs\.google\.com/.test(h)) return "Google Drive";
  return h;
}
