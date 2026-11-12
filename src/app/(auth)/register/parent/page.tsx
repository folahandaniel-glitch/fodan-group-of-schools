import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { PasswordInput } from "@/components/password-input";
import { Field, Select } from "@/components/ui";
import { registerParent } from "../../actions";
import { AuthArt } from "@/components/auth-art";
import { allSettings } from "@/lib/settings";
import { siteText } from "@/lib/site-text";

export const metadata = { title: "Parent registration" };

export default async function RegisterParent() {
  const pg = siteText(await allSettings()).pages.registerParent;
  return (
    <div>
      <AuthArt slot="register" className="mb-5" />
      <p className="eyebrow">{pg.eyebrow}</p>
      <h1 className="mt-1 text-3xl">{pg.title}</h1>
      <p className="mt-1 text-sm text-muted">{pg.intro}</p>
      <div className="card card-pad mt-5">
        <ActionForm action={registerParent} submit={pg.submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Full name" name="fullName" required autoComplete="name" /></div>
          <div className="sm:col-span-2"><Field label="Functional email address (your username)" name="email" type="email" required autoComplete="email" /></div>
          <Field label="Phone number" name="phone" type="tel" required autoComplete="tel" />
          <Select label="Relationship to student" name="relationship" options={["Father", "Mother", "Guardian", "Sponsor", "Other"].map((v) => ({ value: v, label: v }))} />
          <div className="sm:col-span-2"><Field label="Address" name="address" /></div>
          <Field label="Emergency contact" name="emergency" />
          <div className="hidden sm:block" />
          <fieldset className="grid gap-4 rounded-xl border border-line p-4 sm:col-span-2 sm:grid-cols-3">
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-muted">Add a child now (optional)</legend>
            <Field label="Student access code" name="code" />
            <Field label="Admission number" name="admissionNo" />
            <Field label="Student date of birth" name="dob" type="date" />
          </fieldset>
          <PasswordInput name="password" label="Password" autoComplete="new-password" meter />
          <PasswordInput name="confirm" label="Confirm password" autoComplete="new-password" />
        </ActionForm>
      </div>
      <p className="mt-5 text-sm text-ink-2">Already registered? <Link className="font-bold text-royal hover:underline" href="/login">Sign in</Link></p>
    </div>
  );
}
