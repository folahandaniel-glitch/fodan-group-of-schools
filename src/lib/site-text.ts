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
  contactCategories: ["General", "Admissions", "Academics", "Parents", "Results", "Technical", "Complaint", "Other"],
  pages: {
    contact: {
      eyebrow: "Contact", title: "Get in touch",
      phoneLabel: "Phone", emailLabel: "Email", addressLabel: "Address", hoursLabel: "Office hours", emergencyLabel: "Emergency",
      formName: "Full name", formEmail: "Email", formPhone: "Phone", formCategory: "Category", formSubject: "Subject", formMessage: "Message",
      sendButton: "Send message", sendingLabel: "Sending…", thanksTitle: "Thank you — your message has been received.", thanksBody: "The school office will respond using the email address you provided.",
    },
    news: { eyebrow: "News, announcements & events", title: "What is happening at Fodan", empty: "No public news has been published yet." },
    staff: {
      eyebrow: "Staff portfolio", title: "Our teachers and leaders", empty: "Staff profiles will appear here once they are published by the school.",
      qualification: "Qualification", experience: "Experience", specialisation: "Specialisation", subjects: "Subjects",
    },
    verify: {
      eyebrow: "Certificate verification", validTitle: "Valid certificate", revokedTitle: "This certificate has been revoked", notFoundTitle: "Certificate not found",
      awardedTo: "Awarded to", certificate: "Certificate", issued: "Issued", number: "Number",
    },
    login: { eyebrow: "Welcome back", eyebrowStaff: "Staff & administration", title: "Sign in to your portal", intro: "Use the email address you registered with.", submit: "Sign in" },
    register: { eyebrow: "Student registration", title: "Activate your student account", intro: "The school gives every student a personal access code. Your email address becomes your username.", submit: "Create my account" },
    registerParent: { eyebrow: "Parent / guardian registration", title: "Create your parent account", intro: "You can add your children now or later from your dashboard.", submit: "Create parent account" },
    registerStaff: { eyebrow: "Staff registration", title: "Join the school portal", intro: "Teaching and non-teaching staff register here. It takes about a minute." },
    forgot: { eyebrow: "Account recovery", title: "Reset your password", intro: "Passwords are never visible to anyone, including administrators. Enter your email and we will send a one-time reset link. If email is unavailable, ask the school office to issue a link.", submit: "Send reset link" },
    authSide: { brandName: "Fodan Group of Schools", kicker: "Fodan College International", headline1: "Learn. Practise.", headline2: "Test. Improve.", caption: "Smart assessment. Secure examination. Better learning." },
    notFound: { eyebrow: "Error 404", title: "We could not find that page", body: "It may have moved, or you may not have access to it.", homeButton: "Home", portalButton: "My portal" },
    forbidden: { title: "Unauthorized action", body: "Your account does not have permission to open that page. If you believe this is a mistake, contact the school administrator.", button: "Back to your portal" },
    offline: { title: "You are offline", body: "Check your connection and try again. Your in-progress examination answers are saved on the server as you go.", button: "Try again" },
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
  /** Blank text falls back to the original wording, except a section sub-heading, which may be emptied on purpose. */
  const group = <F extends Record<string, string>>(v: Record<string, unknown> | undefined, f: F, sub = false): F =>
    Object.fromEntries(Object.keys(f).map((k) => {
      const x = v?.[k];
      return [k, typeof x === "string" && (x.trim() || (sub && k === "sub")) ? x : f[k]];
    })) as F;
  const groups = <F extends Record<string, Record<string, string>>>(v: Record<string, any> | undefined, f: F, sub = false): F =>
    Object.fromEntries(Object.entries(f).map(([k, x]) => [k, group(v?.[k], x, sub)])) as F;
  return {
    nav: list<Link>(o.nav, d.nav), signInLabel: str(o.signInLabel, d.signInLabel), registerLabel: str(o.registerLabel, d.registerLabel), cbtLabel: str(o.cbtLabel, d.cbtLabel),
    footerContactTitle: str(o.footerContactTitle, d.footerContactTitle), footerPortalsTitle: str(o.footerPortalsTitle, d.footerPortalsTitle), footerLinks: list<Link>(o.footerLinks, d.footerLinks),
    backendLabel: str(o.backendLabel, d.backendLabel),
    hero: group(o.hero, d.hero),
    sections: groups(o.sections, d.sections, true),
    contactCategories: list<string>(o.contactCategories, d.contactCategories),
    portalCards: list<Card>(o.portalCards, d.portalCards),
    pages: groups(o.pages, d.pages),
  };
}
