import postgres from "postgres";
import { SCHEMA_SQL } from "./schema";

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __sql?: Sql; __ready?: Promise<void> };

function connect(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  const local = /127\.0\.0\.1|localhost/.test(url);
  // libpq-only options (channel_binding, sslmode) are not server parameters for postgres.js.
  const u = new URL(url);
  u.searchParams.delete("channel_binding");
  u.searchParams.delete("sslmode");
  return postgres(u.toString(), {
    // The embedded dev database (PGlite) serves one backend: serialise queries locally.
    max: local ? 1 : 5,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: local ? false : "require",
    prepare: false,
    onnotice: () => {},
  });
}

export const sql: Sql = new Proxy(function () {} as unknown as Sql, {
  apply(_t, _this, args) {
    g.__sql ??= connect();
    return (g.__sql as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_t, prop) {
    g.__sql ??= connect();
    return (g.__sql as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/** Applies the schema once per server instance, then seeds structural defaults. */
export function ready(): Promise<void> {
  g.__ready ??= (async () => {
    g.__sql ??= connect();
    for (const stmt of splitSql(SCHEMA_SQL)) await g.__sql.unsafe(stmt);
    const { seedDefaults } = await import("./seed");
    await seedDefaults();
  })().catch((e) => {
    g.__ready = undefined;
    throw e;
  });
  return g.__ready;
}

function splitSql(src: string): string[] {
  // Statements are separated by ";\n"; function bodies use $$ and are kept intact.
  const out: string[] = [];
  let cur = "";
  let inDollar = false;
  for (const line of src.split("\n")) {
    cur += line + "\n";
    if ((line.match(/\$\$/g) ?? []).length % 2 === 1) inDollar = !inDollar;
    if (!inDollar && line.trimEnd().endsWith(";")) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export async function one<T = Record<string, unknown>>(q: Promise<T[]> | PromiseLike<T[]>): Promise<T | null> {
  const rows = await q;
  return rows[0] ?? null;
}
