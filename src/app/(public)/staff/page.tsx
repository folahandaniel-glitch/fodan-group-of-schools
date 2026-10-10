import { sql } from "@/lib/db";
import { getSchool } from "@/lib/settings";

export const metadata = { title: "Staff portfolio" };
export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const school = await getSchool();
  const staff = await sql`
    SELECT u.id, u.first_name, u.last_name, u.photo_file, p.position, p.qualification, p.years_experience,
           p.specialization, p.bio, p.subjects_text, d.name AS dept
    FROM staff_profiles p JOIN users u ON u.id = p.user_id LEFT JOIN departments d ON d.id = p.department_id
    WHERE p.school_id = ${school.id} AND p.public = true AND p.employment_status = 'active' AND u.status = 'active'
    ORDER BY p.sort, u.last_name`;
  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="eyebrow">Staff portfolio</p>
      <h1 className="mt-1 text-4xl">Our teachers and leaders</h1>
      <div className="rule-gold mt-3" />
      {staff.length === 0 && <p className="mt-8 text-muted">Staff profiles will appear here once they are published by the school.</p>}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((p) => (
          <article key={p.id} className="card overflow-hidden">
            <div className="flex gap-4 p-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-paper-2">
                {p.photo_file ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${p.photo_file}`} alt={`${p.first_name} ${p.last_name}`} className="h-full w-full object-cover" loading="lazy" />
                ) : <div className="grid h-full place-items-center font-display text-3xl text-gold">{p.first_name[0]}{p.last_name[0]}</div>}
              </div>
              <div>
                <h2 className="text-lg leading-tight">{p.first_name} {p.last_name}</h2>
                <p className="text-sm font-semibold text-royal">{p.position}</p>
                {p.dept && <p className="text-xs text-muted">{p.dept}</p>}
              </div>
            </div>
            <dl className="space-y-1 border-t border-line px-4 py-3 text-sm">
              {p.qualification && <div><dt className="inline font-bold">Qualification: </dt><dd className="inline">{p.qualification}</dd></div>}
              {p.years_experience > 0 && <div><dt className="inline font-bold">Experience: </dt><dd className="inline">{p.years_experience} years</dd></div>}
              {p.specialization && <div><dt className="inline font-bold">Specialisation: </dt><dd className="inline">{p.specialization}</dd></div>}
              {p.subjects_text && <div><dt className="inline font-bold">Subjects: </dt><dd className="inline">{p.subjects_text}</dd></div>}
              {p.bio && <p className="pt-1 text-ink-2">{p.bio}</p>}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
