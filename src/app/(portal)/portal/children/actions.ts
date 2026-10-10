"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireMe } from "@/lib/auth";
import { clean } from "@/lib/security";
import { linkChild } from "@/lib/accounts";

type State = { error?: string; ok?: string };

export async function linkMyChild(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  if (me.role !== "parent") return { error: "Only parent accounts can link students." };
  const [u] = await sql`SELECT phone FROM users WHERE id = ${me.id}`;
  const r = await linkChild({ id: me.id, email: me.email, phone: u?.phone ?? null }, {
    code: clean(fd.get("code"), 40), admissionNo: clean(fd.get("admissionNo"), 40), dob: clean(fd.get("dob"), 10), relationship: clean(fd.get("relationship"), 40),
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/portal/children");
  return { ok: r.status === "active" ? `${r.student} is now linked to your account.` : `Request received for ${r.student}. The school office will confirm it shortly.` };
}
