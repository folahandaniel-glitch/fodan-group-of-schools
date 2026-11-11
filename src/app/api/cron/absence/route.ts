import { NextResponse } from "next/server";
import { ready, sql } from "@/lib/db";
import { applyAbsenceFines } from "@/lib/absence";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

/** Runs every morning (see vercel.json) for the previous school day. Vercel sends "Authorization: Bearer <CRON_SECRET>". */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return new NextResponse("Cron is not configured", { status: 503 });
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given), b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new NextResponse("Not permitted", { status: 401 });
  await ready();
  const day = new Date(Date.now() + 3600_000 - 86400_000).toISOString().slice(0, 10); // yesterday, West Africa Time
  const schools = await sql`SELECT id FROM schools`;
  const out = [];
  for (const s of schools) out.push({ day, ...(await applyAbsenceFines(s.id as string, day, null)) });
  return NextResponse.json(out);
}
