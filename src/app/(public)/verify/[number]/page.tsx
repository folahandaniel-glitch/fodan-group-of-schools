import { sql } from "@/lib/db";
import { ready } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/security";

export const metadata = { title: "Verify a certificate", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Verify({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  await ready();
  const ok = await rateLimit(`verify:${await clientIp()}`, 60, 600);
  const [c] = ok && /^FDN-\d{4}-[0-9A-F]{8}$/.test(number)
    ? await sql`SELECT c.title, c.exam_label, c.issued_on, c.revoked, s.first_name, s.last_name FROM certificates c JOIN students s ON s.id = c.student_id WHERE c.number = ${number}`
    : [];
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="eyebrow">Certificate verification</p>
      {c && !c.revoked ? (
        <>
          <h1 className="mt-2 text-3xl text-ok">Valid certificate</h1>
          <div className="card card-pad mt-6 text-left">
            <p className="text-xs text-muted">Awarded to</p><p className="font-display text-2xl">{c.first_name} {c.last_name}</p>
            <p className="mt-3 text-xs text-muted">Certificate</p><p className="font-bold">{c.title}{c.exam_label ? ` — ${c.exam_label}` : ""}</p>
            <p className="mt-3 text-xs text-muted">Issued</p><p>{new Date(c.issued_on).toLocaleDateString("en-GB", { dateStyle: "long" })}</p>
            <p className="mt-3 text-xs text-muted">Number</p><p className="font-mono">{number}</p>
          </div>
        </>
      ) : (
        <h1 className="mt-2 text-3xl text-bad">{c ? "This certificate has been revoked" : "Certificate not found"}</h1>
      )}
    </div>
  );
}
