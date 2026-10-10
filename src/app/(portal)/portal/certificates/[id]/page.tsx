import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { canSeeStudent } from "@/lib/scope";
import { allSettings, classLabel } from "@/lib/settings";
import { Logo } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMe();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [c] = await sql`SELECT c.*, s.first_name, s.middle_name, s.last_name, s.admission_no, s.id AS sid, cl.name AS class_name, cl.arm
                        FROM certificates c JOIN students s ON s.id = c.student_id LEFT JOIN classes cl ON cl.id = s.class_id
                        WHERE c.id = ${id} AND c.school_id = ${me.schoolId}`;
  if (!c || !(await canSeeStudent(me, c.sid))) notFound();
  const s = await allSettings();
  const qr = await QRCode.toDataURL(`${process.env.APP_BASE_URL || ""}/verify/${c.number}`, { margin: 1, width: 120 });
  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-4 flex justify-end"><PrintButton /></div>
      <article className="print-sheet relative mx-auto aspect-[1.414/1] w-full overflow-hidden border-[10px] border-double border-ink bg-white p-8 text-center sm:p-12">
        <div className="pointer-events-none absolute inset-3 border border-gold-2" aria-hidden />
        <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-[0.05]" aria-hidden><Logo size={380} /></div>
        <div className="relative flex h-full flex-col items-center justify-between">
          <div><Logo size={86} /><p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-gold">{s.brand.group}</p>
            <h1 className="text-2xl sm:text-3xl">{s.brand.school}</h1></div>
          <div>
            <p className="font-display text-xl italic text-royal sm:text-2xl">{c.title}</p>
            <p className="mt-3 text-xs uppercase tracking-widest text-muted">This is to certify that</p>
            <p className="mt-1 font-display text-3xl sm:text-5xl">{c.first_name} {c.middle_name} {c.last_name}</p>
            <p className="mt-1 text-sm text-muted">Student ID {c.admission_no}{c.class_name ? ` · ${classLabel({ name: c.class_name, arm: c.arm })}` : ""}</p>
            {(c.exam_label || c.score !== null) && <p className="mt-3 text-sm">{c.exam_label}{c.score !== null ? ` — Score ${c.score}` : ""}{c.grade ? ` · Grade ${c.grade}` : ""}</p>}
            <p className="mt-2 text-xs text-muted">Issued {new Date(c.issued_on).toLocaleDateString("en-GB", { dateStyle: "long" })}</p>
          </div>
          <div className="grid w-full grid-cols-3 items-end gap-4 text-xs">
            <div><div className="border-b border-ink pb-8" />{s.certificate.proprietorSign}<br /><b>{s.founder.name}</b></div>
            <div className="grid place-items-center gap-1">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={qr} alt="Verification QR" width={70} height={70} /><span className="font-mono text-[10px]">{c.number}</span></div>
            <div><div className="border-b border-ink pb-8" />{s.certificate.principalSign}</div>
          </div>
        </div>
        {c.revoked && <div className="absolute inset-0 grid place-items-center bg-white/70"><p className="rotate-[-18deg] border-4 border-bad px-6 py-2 font-display text-5xl text-bad">REVOKED</p></div>}
      </article>
    </div>
  );
}
