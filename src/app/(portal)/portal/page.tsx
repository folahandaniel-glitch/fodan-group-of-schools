import Link from "next/link";
import { requireMe, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { currentTerm, classLabel, getSetting } from "@/lib/settings";
import { PageHeader, Stat, Card, Badge, Empty } from "@/components/ui";
import { studentOf, teacherClassIds, childIds, wideScope } from "@/lib/scope";
import { ROLE_LABEL } from "@/lib/logic/permissions";

export const metadata = { title: "Dashboard" };

const fmtDate = (d: unknown) => new Date(String(d)).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

async function announcements(me: { schoolId: string; role: string }) {
  return sql`SELECT id, title, body, created_at FROM content_items
             WHERE school_id = ${me.schoolId} AND published = true AND kind = 'announcement'
               AND audience IN ('public','all', ${me.role === "parent" ? "parents" : me.role === "student" ? "students" : "staff"})
             ORDER BY created_at DESC LIMIT 4`;
}

export default async function Dashboard() {
  const me = await requireMe();
  const term = await currentTerm();
  const news = await announcements(me);
  const hello = `Welcome, ${me.firstName || me.name}`;
  const newsCard = (
    <Card>
      <h2 className="text-xl">Announcements</h2>
      {news.length === 0 ? <p className="mt-2 text-sm text-muted">No announcements right now.</p> : (
        <ul className="mt-3 divide-y divide-line">
          {news.map((n) => <li key={n.id} className="py-3"><p className="font-bold">{n.title}</p><p className="line-clamp-2 text-sm text-ink-2">{n.body}</p><p className="mt-1 text-xs text-muted">{fmtDate(n.created_at)}</p></li>)}
        </ul>
      )}
    </Card>
  );

  /* ───────── Student ───────── */
  if (me.role === "student") {
    const st = await studentOf(me.id);
    if (!st) return <Empty title="Your student record could not be found">Please contact the school office.</Empty>;
    const [avg] = await sql`SELECT round(avg(total)::numeric, 1) AS avg, count(*)::int AS n FROM results WHERE student_id = ${st.id} AND released = true AND term_id = ${term?.id ?? null}`;
    const pending = await sql`
      SELECT a.id, a.title, a.kind, a.due_at, s.name AS subject FROM assessments a LEFT JOIN subjects s ON s.id = a.subject_id
      WHERE a.class_id = ${st.class_id} AND a.status = 'published' AND a.kind <> 'mock'
        AND NOT EXISTS (SELECT 1 FROM attempts t WHERE t.assessment_id = a.id AND t.student_id = ${st.id} AND t.status = 'submitted')
      ORDER BY a.due_at NULLS LAST LIMIT 6`;
    const recent = await sql`SELECT r.total, r.grade, s.name AS subject FROM results r JOIN subjects s ON s.id = r.subject_id
                             WHERE r.student_id = ${st.id} AND r.released = true ORDER BY r.updated_at DESC LIMIT 6`;
    const best = [...recent].sort((a, b) => b.total - a.total);
    return (
      <>
        <PageHeader eyebrow={classLabel({ name: st.class_name ?? "No class", arm: st.class_arm, department: st.dept_name })} title={hello}
          sub={term ? `${term.session_name} · ${term.name}` : undefined} actions={<Link className="btn btn-primary" href="/portal/work">Open my work</Link>} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Average score" value={avg?.avg ?? "—"} hint={avg?.n ? `${avg.n} subjects this term` : "Awaiting released results"} />
          <Stat label="Pending work" value={pending.length} tone="royal" hint="Assignments, tests and exams" />
          <Stat label="Access status" value={<span className="text-2xl">{st.code_status === "active" ? "Active" : "Suspended"}</span>} hint="School access code" />
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="text-xl">Pending work</h2>
            {pending.length === 0 ? <p className="mt-2 text-sm text-muted">You are all caught up.</p> : (
              <ul className="mt-3 divide-y divide-line">
                {pending.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                    <div><p className="font-bold">{p.title}</p><p className="text-xs text-muted">{p.subject} · <span className="uppercase">{p.kind}</span>{p.due_at ? ` · due ${fmtDate(p.due_at)}` : ""}</p></div>
                    <Link href="/portal/work" className="btn btn-ghost btn-sm">Open</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="text-xl">Recent results</h2>
            {recent.length === 0 ? <p className="mt-2 text-sm text-muted">Results appear here once your school releases them.</p> : (
              <>
                <ul className="mt-3 divide-y divide-line">{recent.map((r, i) => <li key={i} className="flex justify-between py-2"><span>{r.subject}</span><span><b>{r.total}</b> <Badge>{r.grade}</Badge></span></li>)}</ul>
                <p className="mt-3 text-xs text-muted">Strongest: {best[0]?.subject} · Needs attention: {best[best.length - 1]?.subject}</p>
              </>
            )}
          </Card>
          {newsCard}
        </div>
      </>
    );
  }

  /* ───────── Parent ───────── */
  if (me.role === "parent") {
    const links = await sql`
      SELECT l.status, s.id, s.first_name, s.last_name, s.admission_no, c.name AS class_name, c.arm AS class_arm, d.name AS dept,
             (SELECT round(avg(total)::numeric,1) FROM results r WHERE r.student_id = s.id AND r.released = true AND r.term_id = ${term?.id ?? null}) AS avg
      FROM parent_links l JOIN students s ON s.id = l.student_id LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN departments d ON d.id = c.department_id
      WHERE l.parent_id = ${me.id} ORDER BY s.first_name`;
    return (
      <>
        <PageHeader eyebrow="Parent portal" title={hello} sub="Follow every child's progress in one place."
          actions={<Link className="btn btn-primary" href="/portal/children">Add or manage children</Link>} />
        {links.length === 0 ? <Empty title="No children linked yet">Use your child's access code, admission number and date of birth to link them.</Empty> : (
          <div className="grid gap-4 md:grid-cols-2">
            {links.map((c) => (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="text-xl">{c.first_name} {c.last_name}</h2>
                    <p className="text-sm text-muted">{classLabel({ name: c.class_name ?? "—", arm: c.class_arm, department: c.dept })} · {c.admission_no}</p></div>
                  <Badge tone={c.status === "active" ? "ok" : "warn"}>{c.status === "active" ? "Linked" : "Awaiting approval"}</Badge>
                </div>
                {c.status === "active" && (
                  <>
                    <p className="mt-4 text-sm text-muted">Average this term</p>
                    <p className="font-display text-4xl">{c.avg ?? "—"}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link className="btn btn-ghost btn-sm" href={`/portal/results?student=${c.id}`}>Results</Link>
                      <Link className="btn btn-ghost btn-sm" href={`/portal/report/${c.id}`}>Report card</Link>
                      <Link className="btn btn-ghost btn-sm" href={`/portal/attendance?student=${c.id}`}>Attendance</Link>
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
        <div className="mt-6">{newsCard}</div>
      </>
    );
  }

  /* ───────── Staff / management ───────── */
  const wide = wideScope(me);
  const myClasses = wide ? [] : await teacherClassIds(me.id);
  const [cnt] = await sql`
    SELECT (SELECT count(*)::int FROM students WHERE school_id = ${me.schoolId} AND status IN ('active','enrolled')) AS students,
           (SELECT count(*)::int FROM users WHERE school_id = ${me.schoolId} AND role NOT IN ('student','parent') AND status = 'active') AS staff,
           (SELECT count(*)::int FROM users WHERE school_id = ${me.schoolId} AND role = 'parent') AS parents,
           (SELECT count(*)::int FROM classes WHERE school_id = ${me.schoolId} AND NOT archived) AS classes,
           (SELECT count(*)::int FROM lesson_notes WHERE school_id = ${me.schoolId} AND status = 'submitted') AS lessons_pending,
           (SELECT count(*)::int FROM questions WHERE school_id = ${me.schoolId} AND status = 'PENDING_REVIEW') AS questions_pending,
           (SELECT count(*)::int FROM parent_links l JOIN students s ON s.id = l.student_id WHERE s.school_id = ${me.schoolId} AND l.status = 'pending') AS links_pending,
           (SELECT count(*)::int FROM contact_messages WHERE school_id = ${me.schoolId} AND status = 'new') AS messages_new`;
  const [mine] = wide ? [] : await sql`
    SELECT (SELECT count(*)::int FROM lesson_notes WHERE teacher_id = ${me.id} AND status IN ('draft','rejected')) AS lessons_open,
           (SELECT count(*)::int FROM assessments WHERE created_by = ${me.id} AND status = 'draft') AS drafts,
           (SELECT count(*)::int FROM students WHERE class_id = ANY(${myClasses}) AND status IN ('active','enrolled')) AS my_students`;
  const recentAudit = can(me, "audit:view") ? await sql`SELECT action, actor_label, created_at, category FROM audit_logs WHERE school_id = ${me.schoolId} ORDER BY created_at DESC LIMIT 8` : [];
  const classes = (!wide && myClasses.length ? await sql`SELECT id, name, arm FROM classes WHERE id = ANY(${myClasses})` : []) as unknown as { id: string; name: string; arm: string }[];
  const seniority = await getSetting("seniority");
  void seniority;

  return (
    <>
      <PageHeader eyebrow={ROLE_LABEL[me.role] ?? me.role} title={hello} sub={term ? `${term.session_name} · ${term.name}` : "Set the current term in Settings."} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {wide ? (
          <>
            <Stat label="Students" value={cnt.students} />
            <Stat label="Staff" value={cnt.staff} tone="royal" />
            <Stat label="Parents" value={cnt.parents} />
            <Stat label="Classes" value={cnt.classes} tone="royal" />
          </>
        ) : (
          <>
            <Stat label="My classes" value={myClasses.length} />
            <Stat label="My students" value={mine?.my_students ?? 0} tone="royal" />
            <Stat label="Open lesson notes" value={mine?.lessons_open ?? 0} />
            <Stat label="Draft assessments" value={mine?.drafts ?? 0} tone="royal" />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl">Needs attention</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {can(me, "lessons:review") && <li className="flex justify-between py-2"><Link className="font-semibold hover:underline" href="/portal/lessons?status=submitted">Lesson notes awaiting review</Link><Badge tone={cnt.lessons_pending ? "warn" : "ok"}>{cnt.lessons_pending}</Badge></li>}
            {can(me, "questions:approve") && <li className="flex justify-between py-2"><Link className="font-semibold hover:underline" href="/portal/questions?status=PENDING_REVIEW">Questions pending review</Link><Badge tone={cnt.questions_pending ? "warn" : "ok"}>{cnt.questions_pending}</Badge></li>}
            {can(me, "students:edit") && <li className="flex justify-between py-2"><Link className="font-semibold hover:underline" href="/portal/students?links=pending">Parent links awaiting approval</Link><Badge tone={cnt.links_pending ? "warn" : "ok"}>{cnt.links_pending}</Badge></li>}
            {can(me, "comments:view") && <li className="flex justify-between py-2"><Link className="font-semibold hover:underline" href="/portal/comments">New website messages</Link><Badge tone={cnt.messages_new ? "warn" : "ok"}>{cnt.messages_new}</Badge></li>}
          </ul>
        </Card>
        {!wide && classes.length > 0 && (
          <Card>
            <h2 className="text-xl">My classes</h2>
            <ul className="mt-3 flex flex-wrap gap-2">{classes.map((c) => <li key={c.id}><Link className="badge badge-info text-sm" href={`/portal/students?class=${c.id}`}>{classLabel(c)}</Link></li>)}</ul>
          </Card>
        )}
        {newsCard}
        {recentAudit.length > 0 && (
          <Card>
            <div className="flex items-center justify-between"><h2 className="text-xl">Recent activity</h2><Link className="text-sm font-bold text-royal hover:underline" href="/portal/audit">View audit log</Link></div>
            <ul className="mt-3 divide-y divide-line text-sm">
              {recentAudit.map((a, i) => <li key={i} className="flex justify-between gap-3 py-2"><span><b>{a.action}</b> {a.category === "security" && <Badge tone="warn">security</Badge>}<span className="block text-xs text-muted">{a.actor_label}</span></span><span className="text-xs text-muted">{new Date(a.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span></li>)}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
