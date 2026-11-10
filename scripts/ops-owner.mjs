// OPS: promotes one existing account to Developer and creates/refreshes the Super Admin account.
// Secrets come from the environment only, never from the repository:
//   OPS_DATABASE_URL  database to change
//   PROMOTE_EMAIL     existing account that becomes Developer (optional)
//   OWNER_EMAIL / OWNER_PASSWORD   Super Admin to create (password must be changed at first sign-in)
import postgres from "postgres";
import { hash } from "@node-rs/argon2";

const url = process.env.OPS_DATABASE_URL;
const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
const ownerPw = process.env.OWNER_PASSWORD;
const promote = process.env.PROMOTE_EMAIL?.trim().toLowerCase();
if (!url || !ownerEmail || !ownerPw) throw new Error("OPS_DATABASE_URL, OWNER_EMAIL and OWNER_PASSWORD are required");

const u = new URL(url);
u.searchParams.delete("channel_binding"); u.searchParams.delete("sslmode");
const local = /127\.0\.0\.1|localhost/.test(url);
const sql = postgres(u.toString(), { max: 1, prepare: false, ssl: local ? false : "require" });

const [school] = await sql`SELECT id FROM schools WHERE slug = 'fodan-college'`;
if (!school) throw new Error("School row not found: is this the right database?");

if (promote) {
  const r = await sql`UPDATE users SET role = 'developer' WHERE lower(email) = ${promote} AND school_id = ${school.id} RETURNING id`;
  console.log(r.length ? `Promoted ${promote} to developer` : `No account ${promote} (skipped)`);
}

const pwHash = await hash(ownerPw, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
const [ex] = await sql`SELECT id FROM users WHERE lower(email) = ${ownerEmail}`;
if (ex) {
  await sql`UPDATE users SET password_hash = ${pwHash}, role = 'super_admin', status = 'active', must_change_password = true, failed_logins = 0, locked_until = NULL WHERE id = ${ex.id}`;
  await sql`DELETE FROM sessions WHERE user_id = ${ex.id}`;
  console.log(`Refreshed ${ownerEmail} as super_admin (must change password at first sign-in)`);
} else {
  await sql`INSERT INTO users (school_id, email, password_hash, role, first_name, last_name, must_change_password)
            VALUES (${school.id}, ${ownerEmail}, ${pwHash}, 'super_admin', 'Super', 'Admin', true)`;
  console.log(`Created ${ownerEmail} as super_admin (must change password at first sign-in)`);
}
const rows = await sql`SELECT email, role, must_change_password FROM users WHERE role IN ('developer','super_admin') ORDER BY role`;
console.table(rows);
await sql.end();
