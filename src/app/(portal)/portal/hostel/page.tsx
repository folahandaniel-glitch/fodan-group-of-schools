import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { Badge, Card, Empty, Field, PageHeader, Stat } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { addBlock, addRooms, allocate, deleteRoom, vacate } from "./actions";

export const metadata = { title: "Hostel" };
export const dynamic = "force-dynamic";
type Row = Record<string, any>;

export default async function Hostel() {
  const me = await requireMe();
  if (!can(me, "hostel:view") && !can(me, "hostel:manage")) redirect("/forbidden");
  const manage = can(me, "hostel:manage");
  const blocks: Row[] = await sql`SELECT id, name, gender FROM hostel_blocks WHERE school_id = ${me.schoolId} ORDER BY name`;
  const rooms: Row[] = await sql`SELECT r.id, r.block_id, r.name, r.beds FROM hostel_rooms r JOIN hostel_blocks b ON b.id = r.block_id WHERE b.school_id = ${me.schoolId} ORDER BY r.name`;
  const stays: Row[] = await sql`SELECT a.id, a.room_id, a.from_on, s.first_name, s.last_name, s.admission_no, c.name AS cname, c.arm FROM hostel_allocations a JOIN students s ON s.id = a.student_id LEFT JOIN classes c ON c.id = s.class_id
    WHERE a.school_id = ${me.schoolId} AND a.to_on IS NULL ORDER BY s.last_name`;
  const beds = rooms.reduce((a, r) => a + r.beds, 0);

  return (
    <>
      <PageHeader title="Hostel" sub="Hostels, rooms and beds, and which student sleeps where." />
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Hostels" value={blocks.length} /><Stat label="Beds" value={beds} tone="royal" /><Stat label="Occupied" value={stays.length} /><Stat label="Free" value={beds - stays.length} tone="royal" /></section>

      {manage && (
        <div className="mb-5 grid gap-5 lg:grid-cols-3">
          <Card><h2 className="text-xl">Add a hostel</h2>
            <ActionForm action={addBlock} submit="Add hostel" small className="mt-3 grid gap-2"><Field label="Name" name="name" required placeholder="Gold House" />
              <div className="field"><label htmlFor="hg">For</label><select id="hg" name="gender" className="select"><option>Mixed</option><option>Boys</option><option>Girls</option></select></div></ActionForm></Card>
          <Card><h2 className="text-xl">Add rooms</h2>
            <ActionForm action={addRooms} submit="Add rooms" small className="mt-3 grid gap-2">
              <div className="field"><label htmlFor="hb">Hostel</label><select id="hb" name="block" className="select" required><option value="">Choose…</option>{blocks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              <Field label="Room names (comma separated)" name="names" placeholder="A1, A2, A3" required /><Field label="Beds per room" name="beds" type="number" min={1} max={40} defaultValue={4} /></ActionForm></Card>
          <Card><h2 className="text-xl">Place a student</h2>
            <ActionForm action={allocate} submit="Place student" small className="mt-3 grid gap-2"><Field label="Admission number" name="admission" required />
              <div className="field"><label htmlFor="hr">Room</label><select id="hr" name="room" className="select" required><option value="">Choose…</option>{rooms.map((r) => {
                const used = stays.filter((s) => s.room_id === r.id).length; const b = blocks.find((x) => x.id === r.block_id);
                return used < r.beds ? <option key={r.id} value={r.id}>{b?.name} · {r.name} ({r.beds - used} free)</option> : null; })}</select></div></ActionForm>
            <p className="hint mt-2">Placing a student who already has a bed moves them.</p></Card>
        </div>
      )}

      {blocks.length === 0 ? <Empty title="No hostels yet">{manage ? "Add a hostel, then its rooms." : "The school has not set up the hostel yet."}</Empty> : blocks.map((b) => (
        <Card key={b.id} className="mb-4"><h2 className="text-xl">{b.name} <Badge>{b.gender}</Badge></h2>
          {rooms.filter((r) => r.block_id === b.id).length === 0 ? <p className="mt-2 text-sm text-muted">No rooms yet.</p> : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rooms.filter((r) => r.block_id === b.id).map((r) => {
              const occ = stays.filter((s) => s.room_id === r.id);
              return (
                <div key={r.id} className="rounded-2xl border border-line p-3"><p className="flex items-center justify-between font-bold">Room {r.name}<Badge tone={occ.length >= r.beds ? "bad" : "ok"}>{occ.length}/{r.beds}</Badge></p>
                  <ul className="mt-1 space-y-1 text-sm">{occ.map((s) => <li key={s.id} className="flex items-center justify-between gap-2"><span>{s.last_name}, {s.first_name} <span className="text-xs text-muted">{s.cname}{s.arm}</span></span>{manage && <form action={vacate}><input type="hidden" name="id" value={s.id} /><button className="text-xs font-bold text-bad">Vacate</button></form>}</li>)}
                    {occ.length === 0 && <li className="text-muted">Empty</li>}</ul>
                  {manage && occ.length === 0 && <form action={deleteRoom} className="mt-2"><input type="hidden" name="id" value={r.id} /><button className="btn btn-ghost btn-sm">Delete room</button></form>}</div>);
            })}</div>)}
        </Card>))}
    </>
  );
}
