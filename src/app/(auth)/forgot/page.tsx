import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { forgot } from "../actions";
import { allSettings } from "@/lib/settings";
import { siteText } from "@/lib/site-text";

export const metadata = { title: "Reset password" };

export default async function Forgot() {
  const pg = siteText(await allSettings()).pages.forgot;
  return (
    <div>
      <p className="eyebrow">{pg.eyebrow}</p>
      <h1 className="mt-1 text-3xl">{pg.title}</h1>
      <p className="mt-1 text-sm text-muted">{pg.intro}</p>
      <div className="card card-pad mt-5">
        <ActionForm action={forgot} submit={pg.submit}>
          <Field label="Email address" name="email" type="email" required autoComplete="email" />
        </ActionForm>
      </div>
      <p className="mt-5 text-sm"><Link className="font-bold text-royal hover:underline" href="/login">Back to sign in</Link></p>
    </div>
  );
}
