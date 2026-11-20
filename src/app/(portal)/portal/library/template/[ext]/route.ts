import { can, getMe } from "@/lib/auth";
import { TEMPLATE_EXTS, buildTemplate, type TemplateExt } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ ext: string }> }) {
  const me = await getMe();
  if (!me || !me.mfaPassed || !(can(me, "library:manage") || can(me, "*"))) return new Response("Not found", { status: 404 });
  const { ext } = await ctx.params;
  if (!(TEMPLATE_EXTS as readonly string[]).includes(ext)) return new Response("Not found", { status: 404 });
  const t = buildTemplate(ext as TemplateExt);
  return new Response(new Uint8Array(t.data), { headers: { "Content-Type": t.mime, "Content-Disposition": `attachment; filename="library-book-template.${ext}"`, "Cache-Control": "no-store" } });
}
