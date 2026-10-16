import { notFound } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { canManage, canView, loadModules } from "@/lib/modules";
import { listStaff } from "@/lib/data";
import { Badge, Card, PageHeader, TextArea, statusTone } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { acknowledgeRecord, assignRecord, hideReply, replyRecord, setRecordStatus, togglePin } from "../../actions";

export const dynamic = "force-dynamic";

export default async function RecordPage({ params }: { params: Promise<{ module: string; id: string }> }) {
  const me = await requireMe();
  const { module: key, id } = await params;
  const m = (await loadModules()).find((x) => x.key === key);
  if (!m || !canView(me, m) || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [r] = await sql`SELECT r.*, o.first_name || ' ' || o.last_name AS owner, a.first_name || ' ' || a.last_name AS assignee
                        FROM records r LEFT JOIN users o ON o.id = r.owner_id LEFT JOIN users a ON a.id = r.assignee_id
                        WHERE r.id = ${id} AND r.module = ${m.key} AND r.school_id = ${me.schoolId}`;
  if (!r) notFound();
  const mgr = canManage(me, m);
  const mine = r.owner_id === me.id || r.assignee_id === me.id;
  if (m.ownOnly && !mgr && !mine) notFound();
  if (!mgr && !mine && ["hidden", "draft", "archived"].includes(r.status)) notFound();

  const replies = m.replies ? await sql`SELECT p.id, p.body, p.hidden, p.created_at, u.first_name || ' ' || u.last_name AS author, u.role
                                         FROM record_replies p LEFT JOIN users u ON u.id = p.user_id WHERE p.record_id = ${id} ${mgr ? sql`` : sql`AND NOT p.hidden`} ORDER BY p.created_at` : [];
  const acks = m.acknowledge ? await sql`SELECT u.first_name || ' ' || u.last_name AS name, e.user_id FROM record_events e JOIN users u ON u.id = e.user_id WHERE e.record_id = ${id} AND e.kind = 'ack'` : [];
  const acked = acks.some((a) => a.user_id === me.id);
  const staff = m.assignable && mgr ? await listStaff(me.schoolId) : [];
  const options = m.statuses.filter((s) => mgr || (mine && (m.ownerMay ?? []).includes(s)));
  const closed = ["locked", "closed", "hidden"].includes(r.status) && !mgr;

  return (
    <>
      <PageHeader eyebrow={m.label} title={r.title} sub={`${r.owner ?? "Unknown"} · ${new Date(r.created_at).toLocaleString("en-GB")}${r.assignee ? ` · assigned to ${r.assignee}` : ""}`}
        actions={<Badge tone={statusTone(r.status)}>{r.status.replace("_", " ")}</Badge>} />
      <Card>
        <dl className="mb-3 grid gap-2 text-sm sm:grid-cols-3">
          {m.fields.map((f) => r.data?.[f.name] ? <div key={f.name}><dt className="text-xs text-muted">{f.label}</dt><dd className="font-semibold">{String(r.data[f.name])}</dd></div> : null)}
          {r.due_on && <div><dt className="text-xs text-muted">Due</dt><dd className="font-semibold">{new Date(r.due_on).toLocaleDateString("en-GB")}</dd></div>}
        </dl>
        <p className="whitespace-pre-line text-ink-2">{r.body || "—"}</p>
      </Card>

      {(options.length > 0 || (mgr && m.assignable) || mgr) && (
        <Card className="mt-5">
          <h2 className="text-lg">Actions</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            {options.length > 0 && (
              <form action={setRecordStatus} className="flex gap-2"><input type="hidden" name="id" value={id} />
                <select name="status" defaultValue={r.status} className="select" aria-label="Status">{options.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select>
                <button className="btn btn-primary">Update status</button></form>
            )}
            {mgr && m.assignable && (
              <form action={assignRecord} className="flex gap-2"><input type="hidden" name="id" value={id} />
                <select name="assignee" defaultValue={r.assignee_id ?? ""} className="select" aria-label="Assignee"><option value="">Unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}</select>
                <button className="btn btn-ghost">Assign</button></form>
            )}
            {mgr && <form action={togglePin}><input type="hidden" name="id" value={id} /><button className="btn btn-ghost">{r.pinned ? "Unpin" : "Pin"}</button></form>}
          </div>
        </Card>
      )}

      {m.acknowledge && (
        <Card className="mt-5">
          <h2 className="text-lg">Acknowledgements ({acks.length})</h2>
          {!acked && <form action={acknowledgeRecord} className="mt-2"><input type="hidden" name="id" value={id} /><button className="btn btn-gold">I have read this memo</button></form>}
          {acked && <p className="mt-2 text-sm font-semibold text-ok">You acknowledged this memo.</p>}
          {mgr && acks.length > 0 && <p className="mt-2 text-sm text-ink-2">{acks.map((a) => a.name).join(", ")}</p>}
        </Card>
      )}

      {m.replies && (
        <Card className="mt-5">
          <h2 className="text-lg">Replies ({replies.filter((p) => !p.hidden).length})</h2>
          <ul className="mt-3 divide-y divide-line">
            {replies.length === 0 && <li className="py-2 text-sm text-muted">No replies yet.</li>}
            {replies.map((p) => (
              <li key={p.id} className={`py-3 ${p.hidden ? "opacity-50" : ""}`}>
                <p className="text-xs text-muted"><b className="text-ink">{p.author ?? "Former user"}</b> · {new Date(p.created_at).toLocaleString("en-GB")}{p.hidden ? " · hidden" : ""}</p>
                <p className="mt-1 whitespace-pre-line text-sm">{p.body}</p>
                {mgr && <form action={hideReply} className="mt-1"><input type="hidden" name="reply" value={p.id} /><button className="text-xs font-bold text-bad hover:underline">{p.hidden ? "Restore" : "Hide"}</button></form>}
              </li>
            ))}
          </ul>
          {closed ? <p className="mt-3 text-sm font-semibold text-muted">This thread is closed.</p> : (
            <div className="mt-3"><ActionForm action={replyRecord} submit="Post reply">
              <input type="hidden" name="id" value={id} /><TextArea label="Your reply" name="body" rows={3} required />
            </ActionForm></div>
          )}
        </Card>
      )}
    </>
  );
}
