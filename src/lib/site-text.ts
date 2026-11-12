/** Every piece of public-website wording that is not a news item, FAQ or similar record. Edited in Portal → Settings → Website text. */
export const SITE_TEXT_DEFAULT = {
  nav: [
    { href: "/#about", label: "About" }, { href: "/#academics", label: "Academics" }, { href: "/#exams", label: "Exam Preparation" },
    { href: "/staff", label: "Staff" }, { href: "/news", label: "News & Events" }, { href: "/contact", label: "Contact" },
  ],
  signInLabel: "Sign in",
  registerLabel: "Register",
  cbtLabel: "Fodan CBT",
  footerContactTitle: "Contact",
  footerPortalsTitle: "Portals",
  footerLinks: [
    { href: "/login", label: "Student portal" }, { href: "/login", label: "Parent portal" }, { href: "/login", label: "Teacher portal" },
    { href: "/register", label: "Student registration" }, { href: "/register/staff", label: "Staff registration" },
  ],
  backendLabel: "Backend",
  hero: { imageAlt: "Fodan College students in school uniform on the school lawn", badgeValue: "10·30·60", badgeLabel: "Smart assessment" },
  sections: {
    about: { eyebrow: "About us", title: "One group. One standard of excellence.", sub: "" },
    structure: { eyebrow: "Academic structure", title: "From Basic 1 to SSS 3", sub: "Primary and Secondary education, with Science, Commercial and Arts departments in the Senior Secondary section." },
    exams: { eyebrow: "Examination preparation", title: "Practise with purpose", sub: "" },
    facilities: { eyebrow: "Facilities", title: "Tools that support learning", sub: "" },
    life: { eyebrow: "School life", title: "Activities and enrichment", sub: "" },
    news: { eyebrow: "News, announcements & events", title: "What is happening", sub: "" },
    team: { eyebrow: "Our team", title: "Teachers who lead by example", sub: "" },
    portals: { eyebrow: "Portals", title: "One portal for the whole school community", sub: "" },
    faq: { eyebrow: "Questions", title: "Frequently asked", sub: "" },
    contact: { eyebrow: "Contact", title: "We would like to hear from you", sub: "" },
  },
  portalCards: [
    { t: "Students", d: "Assignments, CA tests, examinations, mock practice, results and the Study Centre.", href: "/register", cta: "Activate account" },
    { t: "Parents & guardians", d: "Follow every child: attendance, results, report cards and announcements.", href: "/register/parent", cta: "Create parent account" },
    { t: "Teachers & management", d: "Lesson notes, question banks, CBT, results, timetable and analytics.", href: "/login", cta: "Staff sign in" },
  ],
  pages: {
    contact: { eyebrow: "Contact", title: "Get in touch" },
    news: { eyebrow: "News, announcements & events", title: "What is happening at Fodan" },
    staff: { eyebrow: "Staff portfolio", title: "Our teachers and leaders" },
  },
};
export type SiteText = typeof SITE_TEXT_DEFAULT;

type Link = { href: string; label: string };
type Card = { t: string; d: string; href: string; cta: string };

/** Stored values over defaults, field by field, so a field added later always has wording. Lists are replaced whole; empty single-line text falls back to the default. */
export function siteText(settings: Record<string, unknown>): SiteText {
  const d = SITE_TEXT_DEFAULT;
  const o = ((settings?.siteText ?? {}) as Record<string, any>);
  const str = (v: unknown, f: string) => (typeof v === "string" && v.trim() ? v : f);
  const list = <T,>(v: unknown, f: T[]): T[] => (Array.isArray(v) && v.length ? (v as T[]) : f);
  const group = <F extends Record<string, string>>(v: Record<string, unknown> | undefined, f: F): F =>
    Object.fromEntries(Object.keys(f).map((k) => [k, typeof v?.[k] === "string" ? v[k] : f[k]])) as F;
  const groups = <F extends Record<string, Record<string, string>>>(v: Record<string, any> | undefined, f: F): F =>
    Object.fromEntries(Object.entries(f).map(([k, x]) => [k, group(v?.[k], x)])) as F;
  return {
    nav: list<Link>(o.nav, d.nav), signInLabel: str(o.signInLabel, d.signInLabel), registerLabel: str(o.registerLabel, d.registerLabel), cbtLabel: str(o.cbtLabel, d.cbtLabel),
    footerContactTitle: str(o.footerContactTitle, d.footerContactTitle), footerPortalsTitle: str(o.footerPortalsTitle, d.footerPortalsTitle), footerLinks: list<Link>(o.footerLinks, d.footerLinks),
    backendLabel: str(o.backendLabel, d.backendLabel),
    hero: group(o.hero, d.hero),
    sections: groups(o.sections, d.sections),
    portalCards: list<Card>(o.portalCards, d.portalCards),
    pages: groups(o.pages, d.pages),
  };
}
