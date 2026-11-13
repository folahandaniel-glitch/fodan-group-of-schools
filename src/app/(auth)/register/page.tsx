import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { PasswordInput } from "@/components/password-input";
import { Field, Select } from "@/components/ui";
import { registerStudent } from "../actions";
import { AuthArt } from "@/components/auth-art";
import { allSettings } from "@/lib/settings";
import { siteText } from "@/lib/site-text";
import { getSchool } from "@/lib/settings";
import { listClasses } from "@/lib/data";

export const metadata = { title: "Student registration" };

export default async function RegisterStudent() {
  const pg = siteText(await allSettings()).pages.register;
  const classes = await listClasses((await getSchool()).id);
  return (
    <div>
      <AuthArt slot="register" className="mb-5 lg:hidden" />
      <p className="eyebrow">{pg.eyebrow}</p>
      <h1 className="mt-1 text-3xl">{pg.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {pg.intro}
      </p>
      <div className="card card-pad mt-5">
        <ActionForm action={registerStudent} submit={pg.submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="School access code" name="code" required placeholder="FDN-XXXXX-XXXXX-XXXXX" hint="Given to you by the school office. It can be used only once." /></div>
          <div className="sm:col-span-2"><Select label="Your class" name="classId" required allowEmpty options={classes.map((c) => ({ value: c.id, label: c.label }))} hint="Pick the class you are joining." /></div>
          <Field label="First name" name="firstName" required autoComplete="given-name" />
          <Field label="Last name" name="lastName" required autoComplete="family-name" />
          <Field label="Middle name" name="middleName" />
          <Field label="Date of birth" name="dob" type="date" />
          <Select label="Gender" name="gender" options={[{ value: "Female", label: "Female" }, { value: "Male", label: "Male" }]} />
          <Field label="Phone number" name="phone" type="tel" autoComplete="tel" />
          <div className="sm:col-span-2"><Field label="Functional email address (your username)" name="email" type="email" required autoComplete="email" /></div>
          <div className="sm:col-span-2"><Field label="Home address" name="address" /></div>
          <Field label="State" name="state" />
          <Field label="Country" name="country" defaultValue="Nigeria" />
          <Field label="Parent / guardian name" name="guardianName" />
          <Field label="Parent / guardian phone" name="guardianPhone" type="tel" />
          <Field label="Emergency contact" name="emergency" />
          <Field label="Previous school" name="previousSchool" />
          <PasswordInput name="password" label="Password" autoComplete="new-password" meter />
          <PasswordInput name="confirm" label="Confirm password" autoComplete="new-password" />
        </ActionForm>
      </div>
      <p className="mt-5 text-sm text-ink-2">Already registered? <Link className="font-bold text-royal hover:underline" href="/login">Sign in</Link></p>
    </div>
  );
}
