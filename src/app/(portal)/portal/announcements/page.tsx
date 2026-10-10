import { requireMe, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Badge, Card, Empty, Field, PageHeader, Select, TextArea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { postAnnouncement, removeAnnouncement } from "./actions";

export const metadata = { title: "Announcements" };

export default async function Announcements() {
  const me = await requireMe();
  const mine = me.role === "parent" ? "parents" : me.role === "student" ? "students" : "staff";
  const rows = await sql`SELECT c.id, c.kind, c.title, c.body, c.audience, c.created_at, u.first_name || ' ' || u.last_name AS author
                         FROM content_items c LEFT JOIN users u ON u.id = c.created_by
                         WHERE c.school_id = ${me.schoolId} AND c.published = true AND c.kind IN ('announcement','news','event')
                           AND c.audience IN ('public','all', ${mine}) ORDER BY c.created_at DESC LIMIT 60`;
  return (
    <>
      <PageHeader title="Announcements" sub="Notices from the school, class notices, examination announcements and emergency notices." />
      {can(me, "announcements:create") && (
        <details className="card card-pad mb-5">
          <summary className="cursor-pointer font-display text-lg">Post an announcement</summary>
          <div className="mt-4">
            <ActionForm action={postAnnouncement} submit="Post" className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Title" name="title" required /></div>
              <Select label="Audience" name="audience" allowEmpty={false} defaultValue="all"
                options={[{ value: "all", label: "Everyone with a portal account" }, { value: "students", label: "Students" }, { value: "parents", label: "Parents" }, { value: "staff", label: "Staff" }, ...(can(me, "announcements:publish") ? [{ value: "public", label: "Public website" }] : [])]} />
              <Select label="Type" name="kind" allowEmpty={false} defaultValue="announcement" options={[{ value: "announcement", label: "Announcement / notice" }, { value: "news", label: "News" }, { value: "event", label: "Event" }]} />
              <div className="sm:col-span-2"><TextArea label="Message" name="body" required rows={4} /></div>
            </ActionForm>
          </div>
        </details>
      )}
      {rows.length === 0 ? <Empty title="No announcements" /> : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2"><Badge tone="info" >{r.kind}</Badge><Badge>{r.audience}</Badge></div>
                <span className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}{r.author ? ` · ${r.author}` : ""}</span>
              </div>
              <h2 className="mt-2 text-lg">{r.title}</h2>
              <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{r.body}</p>
              {can(me, "announcements:publish") && <form action={removeAnnouncement} className="mt-3"><input type="hidden" name="id" value={r.id} /><button className="btn btn-danger btn-sm">Remove</button></form>}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
