import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { studentOf } from "@/lib/scope";
import { attemptView, claimSession, recordViolation, saveProgress, submitAttempt } from "@/lib/cbt";

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

export async function GET(req: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await ctx.params;
  const a = await authed(attemptId);
  if (!a) return NextResponse.json({ error: "Not available" }, { status: 404 });
  const cid = new URL(req.url).searchParams.get("cid") ?? "";
  if (!(await claimSession(attemptId, a.st.id, cid.slice(0, 60)))) return NextResponse.json({ error: "This exam is already open in another window or device.", conflict: true }, { status: 409 });
  const v = await attemptView(attemptId, a.st.id);
  if (!v) return NextResponse.json({ error: "Not available" }, { status: 404 });
  return NextResponse.json(v, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  const { attemptId } = await ctx.params;
  const a = await authed(attemptId);
  if (!a) return NextResponse.json({ error: "Not available" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { action?: string; answers?: Record<string, string>; flags?: string[]; cid?: string; type?: string } | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  // Ownership check before any state change (IDOR guard).
  const [own] = await sql`SELECT 1 FROM attempts WHERE id = ${attemptId} AND student_id = ${a.st.id}`;
  if (!own) return NextResponse.json({ error: "Not available" }, { status: 404 });
  if (!(await claimSession(attemptId, a.st.id, String(body.cid ?? "").slice(0, 60)))) return NextResponse.json({ error: "This exam is open in another window.", conflict: true }, { status: 409 });
  if (body.action === "violation") {
    if (body.answers) await saveProgress(attemptId, a.st.id, body.answers, body.flags ?? []);
    const r = await recordViolation(attemptId, a.st.id, String(body.type ?? "fullscreen"));
    const v = r.submitted ? await attemptView(attemptId, a.st.id) : null;
    return NextResponse.json({ ...r, score: v?.score ?? null, maxScore: v?.maxScore ?? null });
  }
  if (body.action === "submit") {
    if (body.answers) await saveProgress(attemptId, a.st.id, body.answers, body.flags ?? []);
    await submitAttempt(attemptId, "student");
    const v = await attemptView(attemptId, a.st.id);
    return NextResponse.json({ submitted: true, score: v?.score ?? null, maxScore: v?.maxScore ?? null });
  }
  const r = await saveProgress(attemptId, a.st.id, body.answers ?? {}, body.flags ?? []);
  return NextResponse.json({ saved: r.ok, expired: r.expired ?? false, serverNow: Date.now() });
}
