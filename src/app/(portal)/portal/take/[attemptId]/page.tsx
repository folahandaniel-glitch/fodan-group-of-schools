import { notFound, redirect } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { studentOf } from "@/lib/scope";
import { CbtRunner } from "@/components/cbt-runner";

export const metadata = { title: "Examination" };
export const dynamic = "force-dynamic";

export default async function Take({ params }: { params: Promise<{ attemptId: string }> }) {
  const me = await requireMe();
  if (me.role !== "student") redirect("/portal");
  const { attemptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();
  const st = await studentOf(me.id);
  if (!st) notFound();
  const [t] = await sql`SELECT a.kind, a.release_mode, a.released FROM attempts t JOIN assessments a ON a.id = t.assessment_id WHERE t.id = ${attemptId} AND t.student_id = ${st.id}`;
  if (!t) notFound();
  // Practice mocks show scores immediately; school assessments wait for release.
  const showScore = t.kind === "mock" || t.release_mode === "immediate" || t.released;
  return <CbtRunner attemptId={attemptId} backHref={t.kind === "mock" ? "/portal/mocks" : "/portal/work"} showScore={showScore} />;
}
