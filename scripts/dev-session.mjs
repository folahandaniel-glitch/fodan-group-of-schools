// DEV ONLY: creates a session row for an existing local user and prints the cookie value.
// Usage: node scripts/dev-session.mjs user@example.com
import postgres from "postgres";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
if (!/127\.0\.0\.1|localhost/.test(env.DATABASE_URL)) throw new Error("Refusing: non-local database");
const sql = postgres(env.DATABASE_URL, { max: 1, prepare: false });
const [u] = await sql`SELECT id FROM users WHERE lower(email) = ${process.argv[2].toLowerCase()}`;
if (!u) throw new Error("no such user");
const raw = randomBytes(32).toString("base64url");
await sql`INSERT INTO sessions (id, user_id, mfa_passed, expires_at) VALUES (${createHash("sha256").update(raw).digest("hex")}, ${u.id}, true, now() + interval '1 day')`;
console.log(raw);
await sql.end();
