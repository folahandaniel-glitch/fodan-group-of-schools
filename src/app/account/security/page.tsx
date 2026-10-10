import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import { MfaSetup } from "@/components/mfa-setup";
import { revokeOtherSessions } from "../actions";

export const metadata = { title: "Account security" };

export default async function Security({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const me = await requireMe();
  const sp = await searchParams;
  const sessions = await sql`SELECT id, created_at, ip, user_agent FROM sessions WHERE user_id = ${me.id} AND expires_at > now() ORDER BY created_at DESC`;
  return (
    <>
      <PageHeader title="Account security" />
      {sp.setup && <div className="mb-4"><Notice>Super Admin accounts must enable two-factor authentication before using the portal.</Notice></div>}
      <Card className="mb-5">
        <div className="mb-3 flex items-center gap-2"><h2 className="text-xl">Two-factor authentication</h2><Badge tone={me.mfaEnabled ? "ok" : "warn"}>{me.mfaEnabled ? "On" : "Off"}</Badge></div>
        {me.mfaEnabled ? <p className="text-sm text-ink-2">Your account is protected with an authenticator app. Recovery codes were shown when you enabled it.</p> : <MfaSetup />}
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-xl">Active sessions</h2>
          <form action={revokeOtherSessions}><button className="btn btn-danger btn-sm">Sign out other devices</button></form></div>
        <ul className="divide-y divide-line text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span className="truncate">{String(s.user_agent).slice(0, 70) || "Unknown device"}</span>
              <span className="text-muted">{new Date(s.created_at).toLocaleString("en-GB")} {s.id === me.sessionId && <Badge tone="ok">This device</Badge>}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
