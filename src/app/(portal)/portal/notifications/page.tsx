import Link from "next/link";
import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Card, Empty, PageHeader } from "@/components/ui";
import { markAllRead } from "./actions";

export const metadata = { title: "Notifications" };

export default async function Notifications() {
  const me = await requireMe();
  const rows = await sql`SELECT id, title, body, link, read, created_at FROM notifications WHERE user_id = ${me.id} ORDER BY created_at DESC LIMIT 60`;
  return (
    <>
      <PageHeader title="Notifications" actions={<form action={markAllRead}><button className="btn btn-ghost btn-sm">Mark all read</button></form>} />
      {rows.length === 0 ? <Empty title="You are all caught up" /> : (
        <Card pad={false}><ul className="divide-y divide-line">
          {rows.map((n) => (
            <li key={n.id} className={`px-4 py-3 ${n.read ? "" : "bg-gold-soft/30"}`}>
              <p className="font-bold">{n.link ? <Link className="hover:underline" href={n.link}>{n.title}</Link> : n.title}</p>
              {n.body && <p className="text-sm text-ink-2">{n.body}</p>}
              <p className="text-xs text-muted">{new Date(n.created_at).toLocaleString("en-GB")}</p>
            </li>
          ))}
        </ul></Card>
      )}
    </>
  );
}
