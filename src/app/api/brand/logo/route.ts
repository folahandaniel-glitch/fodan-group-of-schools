import { NextResponse } from "next/server";
import { sql, ready } from "@/lib/db";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Serves the Super-Admin-uploaded logo when one exists, otherwise the supplied official crest.
export async function GET(req: Request) {
  await ready();
  const brand = await getSetting<{ logoFile?: string }>("brand");
  if (brand?.logoFile) {
    const [f] = await sql`SELECT mime, data FROM files WHERE id = ${brand.logoFile} AND public = true`;
    if (f) {
      return new Response(new Uint8Array(f.data), { headers: { "Content-Type": f.mime, "Cache-Control": "public, max-age=300" } });
    }
  }
  return NextResponse.redirect(new URL("/brand/logo.webp", req.url), { status: 307, headers: { "Cache-Control": "public, max-age=300" } });
}
