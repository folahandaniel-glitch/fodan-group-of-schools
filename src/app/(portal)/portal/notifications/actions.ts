"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireMe } from "@/lib/auth";

export async function markAllRead(): Promise<void> {
  const me = await requireMe();
  await sql`UPDATE notifications SET read = true WHERE user_id = ${me.id} AND read = false`;
  revalidatePath("/portal/notifications");
  revalidatePath("/portal");
}
