"use server";
import { redirect } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { studentOf } from "@/lib/scope";
import { startAttempt } from "@/lib/cbt";

export async function beginAssessment(fd: FormData): Promise<void> {
  const me = await requireMe();
  if (me.role !== "student") redirect("/forbidden");
  const st = await studentOf(me.id);
  const id = String(fd.get("id") ?? "");
  if (!st || !/^[0-9a-f-]{36}$/i.test(id)) redirect("/portal/work?error=unavailable");
  const r = await startAttempt(id, { id: st.id, class_id: st.class_id, school_id: st.school_id, user_id: me.id });
  if (!r.ok) redirect(`/portal/work?error=${encodeURIComponent(r.error)}`);
  redirect(`/portal/take/${r.attemptId}`);
}
