import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "HRM · Staff rules & fines" };
export const dynamic = "force-dynamic";

const naira = (n: number) => `₦${Number(n).toLocaleString("en-NG")}`;

export default async function Hrm() {
  const me = await requireMe();
  const rules = ((await getSetting<string[]>("staffRules")) ?? []).map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0]);
  const f = (await getSetting<{ workStart: string; graceMinutes: number; perMinute: number; lateFlat: number; absentFine: number; enabled: boolean }>("fines"));
  const mine = await sql`SELECT day, reason, amount, status FROM fines WHERE user_id = ${me.id} ORDER BY day DESC LIMIT 30`;
  const owed = mine.filter((x) => x.status !== "waived" && x.status !== "paid").reduce((a, x) => a + Number(x.amount), 0);

  return (
    <>
      <PageHeader title="HRM · Staff rules & fines" sub="The standard rules every staff member works under, and the fines attached to them." />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="text-xl">Standard rules</h2>
          {rules.length === 0 ? <div className="mt-3"><Empty title="No rules set yet" /></div> : (
            <ul className="mt-3 divide-y divide-line">
              {rules.map(([title, fine, detail], i) => (
                <li key={i} className="flex gap-3 py-3">
                  <span className="num-ghost !text-3xl w-9 shrink-0 text-right">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{title} {Number(fine) > 0 && <Badge tone="warn">Fine {naira(Number(fine))}</Badge>}</p>
                    <p className="text-sm text-muted">{detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="space-y-5">
          <Card>
            <h2 className="text-xl">Clock-in rules</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Resumption</dt><dd className="font-bold">{f.workStart}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Grace</dt><dd className="font-bold">{f.graceMinutes} min</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Late fine</dt><dd className="font-bold">{naira(f.lateFlat)}{f.perMinute > 0 ? ` + ${naira(f.perMinute)}/min` : ""}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Absence fine</dt><dd className="font-bold">{naira(f.absentFine)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Applied automatically</dt><dd className="font-bold">{f.enabled ? "Yes" : "No"}</dd></div>
            </dl>
          </Card>
          <Card>
            <h2 className="text-xl">My fines</h2>
            <p className="mt-1 text-sm text-muted">Outstanding: <strong>{naira(owed)}</strong></p>
            {mine.length === 0 ? <p className="mt-2 text-sm text-muted">No fines recorded.</p> : (
              <ul className="mt-2 divide-y divide-line text-sm">
                {mine.map((x, i) => <li key={i} className="flex justify-between gap-2 py-2"><span>{new Date(x.day).toLocaleDateString("en-GB")} · {x.reason}</span><span className="font-bold">{naira(x.amount)} <span className="text-xs text-muted">{x.status}</span></span></li>)}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
