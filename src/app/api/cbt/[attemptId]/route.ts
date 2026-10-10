import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { studentOf } from "@/lib/scope";
import { attemptView, saveProgress, submitAttempt } from "@/lib/cbt";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;

async function authed(attemptId: string) {
  const me = await getMe();
  if (!me || !me.mfaPassed || me.role !== "student" || !UUID.test(attemptId)) return null;
  const st = await studentOf(me.id);
  return st ? { me, st } : null;
}

function sameOrigin(req: Request): boolean {
  const o = req.headers.get("origin");
  if (!o) return true;
  return new URL(o).host === req.headers.get("host");
}

export async function GET(_req: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await ctx.params;
  const a = await authed(attemptId);
  if (!a) return NextResponse.json({ error: "Not available" }, { status: 404 });
  const v = await attemptView(attemptId, a.st.id);
  if (!v) return NextResponse.json({ error: "Not available" }, { status: 404 });
  return NextResponse.json(v, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  const { attemptId } = await ctx.params;
  const a = await authed(attemptId);
  if (!a) return NextResponse.json({ error: "Not available" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { action?: string; answers?: Record<string, string>; flags?: string[] } | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  // Ownership check before any state change (IDOR guard).
  const [own] = await sql`SELECT 1 FROM attempts WHERE id = ${attemptId} AND student_id = ${a.st.id}`;
  if (!own) return NextResponse.json({ error: "Not available" }, { status: 404 });
  if (body.action === "submit") {
    if (body.answers) await saveProgress(attemptId, a.st.id, body.answers, body.flags ?? []);
    await submitAttempt(attemptId, "student");
    const v = await attemptView(attemptId, a.st.id);
    return NextResponse.json({ submitted: true, score: v?.score ?? null, maxScore: v?.maxScore ?? null });
  }
  const r = await saveProgress(attemptId, a.st.id, body.answers ?? {}, body.flags ?? []);
  return NextResponse.json({ saved: r.ok, expired: r.expired ?? false, serverNow: Date.now() });
}
