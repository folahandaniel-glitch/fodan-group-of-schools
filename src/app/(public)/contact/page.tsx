import { allSettings } from "@/lib/settings";
import { ContactForm } from "@/components/contact-form";

export const metadata = { title: "Contact us" };
export const dynamic = "force-dynamic";

export default async function Contact() {
  const s = await allSettings();
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 md:grid-cols-[0.8fr_1.2fr]">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="mt-1 text-4xl">Get in touch</h1>
        <div className="rule-gold mt-3" />
        <ul className="mt-6 space-y-2 text-ink-2">
          <li><b>Phone:</b> {s.contact.phone}</li>
          <li><b>Email:</b> {s.contact.email}</li>
          <li><b>Address:</b> {s.contact.address}</li>
          <li><b>Office hours:</b> {s.contact.officeHours}</li>
          <li><b>Emergency:</b> {s.contact.emergency}</li>
        </ul>
      </div>
      <div className="card card-pad"><ContactForm /></div>
    </div>
  );
}
