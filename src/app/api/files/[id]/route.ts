import { sql, ready } from "@/lib/db";
import { getMe } from "@/lib/auth";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  await ready();
  const [f] = await sql`SELECT name, mime, public, data FROM files WHERE id = ${id}`;
  if (!f) return new Response("Not found", { status: 404 });
  if (!f.public) {
    const me = await getMe();
    if (!me || !me.mfaPassed) return new Response("Sign in required", { status: 401 });
    const isLearner = me.role === "student" || me.role === "parent";
    if (isLearner) {
      // Learners may only open files attached to published resources or their own photo.
      const [ok] = await sql`
        SELECT 1 FROM resources WHERE file_id = ${id} AND published = true
        UNION SELECT 1 FROM users WHERE photo_file = ${id} AND id = ${me.id}`;
      if (!ok) return new Response("Not found", { status: 404 });
    }
  }
  const inline = /^(image|audio|video)\//.test(f.mime) || f.mime === "application/pdf";
  return new Response(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(f.name)}"`,
      "Cache-Control": f.public ? "public, max-age=3600" : "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    },
  });
}
