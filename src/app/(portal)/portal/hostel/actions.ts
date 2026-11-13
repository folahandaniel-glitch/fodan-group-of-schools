"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";

type State = { error?: string; ok?: string };
const UUID = /^[0-9a-f-]{36}$/i;
const done = () => revalidatePath("/portal/hostel");

export async function addBlock(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("hostel:manage");
  const name = clean(fd.get("name"), 60), gender = ["Boys", "Girls", "Mixed"].includes(clean(fd.get("gender"), 8)) ? clean(fd.get("gender"), 8) : "Mixed";
  if (!name) return { error: "Enter the hostel name." };
  try { await sql`INSERT INTO hostel_blocks (school_id, name, gender) VALUES (${me.schoolId}, ${name}, ${gender})`; } catch { return { error: "A hostel with that name already exists." }; }
  done();
  return { ok: "Hostel added." };
}

export async function addRooms(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("hostel:manage");
  const block = clean(fd.get("block"), 40), names = clean(fd.get("names"), 400), beds = Math.round(Number(fd.get("beds")));
  if (!UUID.test(block) || !names || !(beds >= 1 && beds <= 40)) return { error: "Choose a hostel, list the room names and give the beds per room." };
  const [b] = await sql`SELECT 1 FROM hostel_blocks WHERE id = ${block} AND school_id = ${me.schoolId}`;
  if (!b) return { error: "Hostel not found." };
  let n = 0;
  for (const r of names.split(/[,\n]+/).map((x) => x.trim()).filter(Boolean).slice(0, 60)) {
    const ins = await sql`INSERT INTO hostel_rooms (block_id, name, beds) VALUES (${block}, ${r.slice(0, 30)}, ${beds}) ON CONFLICT DO NOTHING RETURNING id`;
    n += ins.length;
  }
  done();
  return { ok: `${n} room${n === 1 ? "" : "s"} added.` };
}

export async function deleteRoom(fd: FormData): Promise<void> {
  const me = await requirePerm("hostel:manage");
  const id = clean(fd.get("id"), 40);
  if (!UUID.test(id)) return;
  const [occ] = await sql`SELECT 1 FROM hostel_allocations a JOIN hostel_rooms r ON r.id = a.room_id JOIN hostel_blocks b ON b.id = r.block_id WHERE r.id = ${id} AND a.to_on IS NULL AND b.school_id = ${me.schoolId} LIMIT 1`;
  if (occ) return;
  await sql`DELETE FROM hostel_rooms WHERE id = ${id} AND block_id IN (SELECT id FROM hostel_blocks WHERE school_id = ${me.schoolId})`;
  done();
}

export async function allocate(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("hostel:manage");
  const adm = clean(fd.get("admission"), 40).toLowerCase(), room = clean(fd.get("room"), 40);
  if (!adm || !UUID.test(room)) return { error: "Enter the admission number and choose a room." };
  const [st] = await sql`SELECT id, first_name, last_name, gender FROM students WHERE school_id = ${me.schoolId} AND lower(admission_no) = ${adm} AND status IN ('active','enrolled')`;
  if (!st) return { error: "No active student with that admission number." };
  const [r] = await sql`SELECT r.id, r.beds, b.gender, (SELECT count(*)::int FROM hostel_allocations a WHERE a.room_id = r.id AND a.to_on IS NULL) AS used
    FROM hostel_rooms r JOIN hostel_blocks b ON b.id = r.block_id WHERE r.id = ${room} AND b.school_id = ${me.schoolId}`;
  if (!r) return { error: "Room not found." };
  if (r.used >= r.beds) return { error: "That room is full." };
  if (r.gender !== "Mixed" && st.gender && st.gender.toLowerCase().slice(0, 1) !== r.gender.toLowerCase().slice(0, 1)) return { error: `This is a ${r.gender.toLowerCase()} hostel and the student is recorded as ${st.gender}.` };
  await sql`UPDATE hostel_allocations SET to_on = current_date WHERE student_id = ${st.id} AND to_on IS NULL`; // moving rooms closes the old stay
  await sql`INSERT INTO hostel_allocations (school_id, student_id, room_id, by_user) VALUES (${me.schoolId}, ${st.id}, ${room}, ${me.id})`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "hostel.allocate", entity: "student", entityId: st.id });
  done();
  return { ok: `${st.first_name} ${st.last_name} is now in the room.` };
}

export async function vacate(fd: FormData): Promise<void> {
  const me = await requirePerm("hostel:manage");
  const id = clean(fd.get("id"), 40);
  if (UUID.test(id)) await sql`UPDATE hostel_allocations SET to_on = current_date WHERE id = ${id} AND school_id = ${me.schoolId} AND to_on IS NULL`;
  done();
}
