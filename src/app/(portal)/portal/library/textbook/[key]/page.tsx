import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { can, requireMe } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { UnitView } from "@/components/unit-view";
import { TEXTBOOKS } from "@/content/cbt";

export const dynamic = "force-dynamic";

export default async function Textbook({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ u?: string }> }) {
  const me = await requireMe();
  if (!can(me, "library:view") && !can(me, "library:manage")) redirect("/forbidden");
  const { key } = await params, sp = await searchParams;
  const b = TEXTBOOKS.find((x) => x.key === key);
  if (!b) notFound();
  const units = b.work.units, i = Math.min(Math.max(parseInt(sp.u ?? "0", 10) || 0, 0), units.length - 1);
  const u = units[i];
  return (
    <>
      <PageHeader eyebrow="Illustrated textbook" title={b.work.title} sub={b.work.subtitle} actions={<div className="no-print flex gap-2"><PrintButton label="Print" /><Link href="/portal/library" className="btn btn-ghost btn-sm">← Library</Link></div>} />
      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <nav className="no-print card card-pad h-fit text-sm lg:sticky lg:top-20" aria-label="Chapters"><p className="mb-2 font-bold">Chapters</p>
          <ol className="max-h-[60dvh] space-y-1 overflow-y-auto">{units.map((x, k) => <li key={k}><Link href={`?u=${k}`} className={`block rounded-lg px-2 py-1 ${k === i ? "bg-strong font-bold text-white" : "hover:bg-paper-2"}`}>{x.label}: {x.title.split(" · ").slice(2).join(" · ") || x.title}</Link></li>)}</ol></nav>
        <Card><h2 className="text-2xl">{u.title}</h2><div className="mt-3"><UnitView u={u} /></div>
          <div className="no-print mt-6 flex justify-between">{i > 0 ? <Link href={`?u=${i - 1}`} className="btn btn-ghost">← Previous</Link> : <span />}{i < units.length - 1 ? <Link href={`?u=${i + 1}`} className="btn btn-primary">Next chapter →</Link> : <span />}</div></Card>
      </div>
    </>
  );
}
