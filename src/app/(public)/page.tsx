import Link from "next/link";
import Image from "next/image";
import { allSettings, getSchool } from "@/lib/settings";
import { publicContent } from "@/lib/content";
import { sql } from "@/lib/db";
import { MOCK_CATEGORIES } from "@/lib/logic/academics";
import { ContactForm } from "@/components/contact-form";
import { Logo } from "@/components/ui";

export const dynamic = "force-dynamic";

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 text-3xl sm:text-4xl">{title}</h2>
      <div className="rule-gold mt-3" />
      {sub && <p className="mt-4 text-muted">{sub}</p>}
    </div>
  );
}

export default async function Home() {
  const s = await allSettings();
  const content = await publicContent();
  const school = await getSchool();
  const staff = await sql`
    SELECT u.id, u.first_name, u.last_name, u.photo_file, p.position, p.qualification
    FROM staff_profiles p JOIN users u ON u.id = p.user_id
    WHERE p.school_id = ${school.id} AND p.public = true AND p.employment_status = 'active' AND u.status = 'active'
    ORDER BY p.sort, u.last_name LIMIT 4`;
  const h = s.home, f = s.founder;
  const schemaOrg = {
    "@context": "https://schema.org", "@type": "EducationalOrganization", name: s.brand.school,
    parentOrganization: { "@type": "Organization", name: s.brand.group },
    telephone: s.contact.phone, email: s.contact.email, founder: { "@type": "Person", name: f.name },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold-soft/60 blur-3xl" aria-hidden />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div>
            <p className="eyebrow">{s.brand.group}</p>
            <h1 className="mt-3 text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">{h.heroTitle}</h1>
            <div className="rule-gold mt-5" />
            <p className="mt-5 max-w-xl text-lg text-ink-2">{h.heroSub}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/register" className="btn btn-primary">Student registration</Link>
              <Link href="/login" className="btn btn-ghost">Parent &amp; staff sign in</Link>
            </div>
            <p className="mt-6 font-display text-xl italic text-royal">{s.brand.tagline}</p>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="overflow-hidden rounded-t-[999px] rounded-b-3xl border border-line bg-white p-2 shadow-xl">
              <Image src="/brand/hero.webp" alt="Fodan College students in school uniform on the school lawn" width={1024} height={1024}
                priority sizes="(max-width: 768px) 90vw, 440px" className="aspect-[4/5] w-full rounded-t-[999px] rounded-b-2xl object-cover object-top" />
            </div>
            <div className="absolute -bottom-5 -left-4 rounded-2xl border border-line bg-white p-2 shadow-lg"><Logo size={72} /></div>
          </div>
        </div>
      </section>

      {/* Key facts */}
      <section aria-label="At a glance" className="border-b border-line bg-white">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-line md:grid-cols-4">
          {(h.stats as { label: string; value: string }[]).map((x) => (
            <div key={x.label} className="bg-white px-4 py-5">
              <dt className="text-xs font-bold uppercase tracking-wider text-muted">{x.label}</dt>
              <dd className="mt-1 font-display text-lg text-ink">{x.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* About */}
      <section id="about" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-16">
        <SectionHead eyebrow="About us" title="One group. One standard of excellence." />
        <div className="grid gap-8 md:grid-cols-2">
          <div className="prose-school text-ink-2"><p>{h.about}</p><p>{h.aboutCollege}</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card card-pad"><p className="eyebrow">Vision</p><p className="mt-2 text-sm text-ink-2">{h.vision}</p></div>
            <div className="card card-pad"><p className="eyebrow">Mission</p><p className="mt-2 text-sm text-ink-2">{h.mission}</p></div>
            <div className="card card-pad sm:col-span-2">
              <p className="eyebrow">Core values</p>
              <ul className="mt-3 flex flex-wrap gap-2">{(h.values as string[]).map((v) => <li key={v} className="badge badge-info text-sm">{v}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="border-y border-line bg-ink text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-[260px_1fr]">
          <div className="mx-auto h-60 w-60 overflow-hidden rounded-full border-4 border-gold-2 bg-paper-2">
            {f.photoFile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/files/${f.photoFile}`} alt={f.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-royal font-display text-7xl text-gold-soft" aria-hidden>
                {f.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
              </div>
            )}
          </div>
          <div>
            <p className="eyebrow !text-gold-2">{f.position}</p>
            <h2 className="mt-1 text-3xl text-white sm:text-4xl">{f.name}</h2>
            {f.qualifications && <p className="mt-1 text-sm text-white/70">{f.qualifications}</p>}
            <p className="mt-4 text-white/85">{f.profile}</p>
            <blockquote className="mt-5 border-l-4 border-gold-2 pl-4 font-display text-xl italic leading-snug text-gold-soft">“{f.message}”</blockquote>
          </div>
        </div>
      </section>

      {/* Academics */}
      <section id="academics" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-16">
        <SectionHead eyebrow="Academic structure" title="From Basic 1 to SSS 3" sub="Primary and Secondary education, with Science, Commercial and Arts departments in the Senior Secondary section." />
        <div className="grid gap-5 md:grid-cols-3">
          {(content.programme ?? []).map((p, i) => (
            <article key={p.id} className="card card-pad relative">
              <span className="font-display text-5xl text-gold-soft">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-1 text-xl">{p.title}</h3>
              <p className="mt-2 text-sm text-ink-2">{p.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2" aria-label="Senior Secondary departments">
          {["Science", "Commercial", "Arts"].map((d) => <span key={d} className="badge badge-info text-sm">Department · {d}</span>)}
        </div>
      </section>

      {/* Exam prep */}
      <section id="exams" className="scroll-mt-28 border-y border-line bg-paper-2">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <SectionHead eyebrow="Examination preparation" title="Practise with purpose" sub={h.examPrep} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MOCK_CATEGORIES.map((m) => (
              <div key={m.key} className="card card-pad">
                <h3 className="text-lg">{m.label}</h3>
                <p className="mt-1 text-sm text-muted">{m.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Facilities + activities */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <SectionHead eyebrow="Facilities" title="Tools that support learning" />
            <ul className="space-y-4">
              {(content.facility ?? []).map((x) => (
                <li key={x.id} className="flex gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gold-2" aria-hidden />
                  <div><p className="font-bold">{x.title}</p><p className="text-sm text-ink-2">{x.body}</p></div></li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHead eyebrow="School life" title="Activities and enrichment" />
            <ul className="space-y-4">
              {(content.activity ?? []).map((x) => (
                <li key={x.id} className="flex gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-royal" aria-hidden />
                  <div><p className="font-bold">{x.title}</p><p className="text-sm text-ink-2">{x.body}</p></div></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* News & events */}
      {((content.news?.length ?? 0) + (content.event?.length ?? 0) + (content.announcement?.length ?? 0)) > 0 && (
        <section className="border-t border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHead eyebrow="News, announcements & events" title="What is happening" />
            <div className="grid gap-4 md:grid-cols-3">
              {[...(content.announcement ?? []), ...(content.news ?? []), ...(content.event ?? [])].slice(0, 6).map((n) => (
                <article key={n.id} className="card card-pad">
                  <span className="badge badge-info capitalize">{n.kind}</span>
                  <h3 className="mt-2 text-lg">{n.title}</h3>
                  <p className="mt-1 line-clamp-4 text-sm text-ink-2">{n.body}</p>
                </article>
              ))}
            </div>
            <p className="mt-5"><Link href="/news" className="font-bold text-royal underline-offset-4 hover:underline">All news and events →</Link></p>
          </div>
        </section>
      )}

      {/* Staff */}
      {staff.length > 0 && (
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <SectionHead eyebrow="Our team" title="Teachers who lead by example" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {staff.map((p) => (
                <div key={p.id} className="card overflow-hidden">
                  <div className="aspect-square bg-paper-2">
                    {p.photo_file ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/files/${p.photo_file}`} alt={`${p.first_name} ${p.last_name}`} className="h-full w-full object-cover" loading="lazy" />
                    ) : <div className="grid h-full place-items-center font-display text-5xl text-gold">{p.first_name[0]}{p.last_name[0]}</div>}
                  </div>
                  <div className="p-3"><p className="font-bold leading-tight">{p.first_name} {p.last_name}</p><p className="text-xs text-muted">{p.position}</p></div>
                </div>
              ))}
            </div>
            <p className="mt-5"><Link href="/staff" className="font-bold text-royal hover:underline">Full staff portfolio →</Link></p>
          </div>
        </section>
      )}

      {/* Portals */}
      <section className="border-y border-line bg-paper-2">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <SectionHead eyebrow="Portals" title="One portal for the whole school community" />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { t: "Students", d: "Assignments, CA tests, examinations, mock practice, results and the Study Centre.", href: "/register", cta: "Activate account" },
              { t: "Parents & guardians", d: "Follow every child: attendance, results, report cards and announcements.", href: "/register/parent", cta: "Create parent account" },
              { t: "Teachers & management", d: "Lesson notes, question banks, CBT, results, timetable and analytics.", href: "/login", cta: "Staff sign in" },
            ].map((p) => (
              <div key={p.t} className="card card-pad flex flex-col">
                <h3 className="text-xl">{p.t}</h3>
                <p className="mt-2 flex-1 text-sm text-ink-2">{p.d}</p>
                <Link href={p.href} className="btn btn-primary mt-4 self-start">{p.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <SectionHead eyebrow="Questions" title="Frequently asked" />
        <div className="divide-y divide-line rounded-2xl border border-line bg-white">
          {(content.faq ?? []).map((q) => (
            <details key={q.id} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                {q.title}<span className="text-gold transition group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-2 text-sm text-ink-2">{q.body}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHead eyebrow="Contact" title="We would like to hear from you" />
            <ul className="space-y-2 text-sm text-ink-2">
              <li><b>Phone:</b> {s.contact.phone}</li>
              <li><b>Email:</b> {s.contact.email}</li>
              <li><b>Address:</b> {s.contact.address}</li>
              <li><b>Hours:</b> {s.contact.officeHours}</li>
              <li><b>Emergency:</b> {s.contact.emergency}</li>
            </ul>
          </div>
          <div className="card card-pad"><ContactForm /></div>
        </div>
      </section>
    </>
  );
}
