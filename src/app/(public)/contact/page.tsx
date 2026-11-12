import { allSettings } from "@/lib/settings";
import { siteText } from "@/lib/site-text";
import { ContactForm } from "@/components/contact-form";

export const metadata = { title: "Contact us" };
export const dynamic = "force-dynamic";

export default async function Contact() {
  const s = await allSettings();
  const st = siteText(s), pg = st.pages.contact;
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 md:grid-cols-[0.8fr_1.2fr]">
      <div>
        <p className="eyebrow">{pg.eyebrow}</p>
        <h1 className="mt-1 text-4xl">{pg.title}</h1>
        <div className="rule-gold mt-3" />
        <ul className="mt-6 space-y-2 text-ink-2">
          <li><b>{pg.phoneLabel}:</b> {s.contact.phone}</li>
          <li><b>{pg.emailLabel}:</b> {s.contact.email}</li>
          <li><b>{pg.addressLabel}:</b> {s.contact.address}</li>
          <li><b>{pg.hoursLabel}:</b> {s.contact.officeHours}</li>
          <li><b>{pg.emergencyLabel}:</b> {s.contact.emergency}</li>
        </ul>
      </div>
      <div className="card card-pad"><ContactForm text={pg} categories={st.contactCategories} /></div>
    </div>
  );
}
