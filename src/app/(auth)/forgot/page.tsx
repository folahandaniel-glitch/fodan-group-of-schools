import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { forgot } from "../actions";

export const metadata = { title: "Reset password" };

export default function Forgot() {
  return (
    <div>
      <p className="eyebrow">Account recovery</p>
      <h1 className="mt-1 text-3xl">Reset your password</h1>
      <p className="mt-1 text-sm text-muted">Passwords are never visible to anyone, including administrators. Enter your email and we will send a one-time reset link. If email is unavailable, ask the school office to issue a link.</p>
      <div className="card card-pad mt-5">
        <ActionForm action={forgot} submit="Send reset link">
          <Field label="Email address" name="email" type="email" required autoComplete="email" />
        </ActionForm>
      </div>
      <p className="mt-5 text-sm"><Link className="font-bold text-royal hover:underline" href="/login">Back to sign in</Link></p>
    </div>
  );
}
