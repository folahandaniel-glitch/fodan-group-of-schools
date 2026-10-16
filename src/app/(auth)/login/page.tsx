import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { PasswordInput } from "@/components/password-input";
import { Field, Notice } from "@/components/ui";
import { login } from "../actions";
import { AuthArt } from "@/components/auth-art";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ registered?: string; reset?: string; staff?: string; link?: string }> }) {
  const sp = await searchParams;
  return (
    <div>
      <AuthArt slot="login" className="mb-5 lg:hidden" />
      <p className="eyebrow">{sp.staff ? "Staff & administration" : "Welcome back"}</p>
      <h1 className="mt-1 text-3xl">Sign in to your portal</h1>
      <p className="mt-1 text-sm text-muted">Use the email address you registered with.</p>
      <div className="mt-5 space-y-3">
        {sp.registered && sp.registered !== "staff" && <Notice kind="ok">Account created. You can now sign in.</Notice>}
        {sp.registered === "staff" && <Notice kind="ok">Registration received. School management will review it; you can sign in once it is approved.</Notice>}
        {sp.reset && <Notice kind="ok">Password changed. Sign in with your new password.</Notice>}
        {sp.link === "failed" && <Notice kind="bad">Your account was created, but the child could not be verified. Sign in and use “My children” to try again with the exact admission number and date of birth.</Notice>}
        {sp.link === "pending" && <Notice>Your child&apos;s link is awaiting approval by the school office.</Notice>}
        {sp.link === "active" && <Notice kind="ok">Your child has been linked to your account.</Notice>}
      </div>
      <div className="card card-pad mt-5">
        <ActionForm action={login} submit="Sign in">
          <Field label="Email address" name="email" type="email" required autoComplete="username" />
          <PasswordInput name="password" label="Password" />
          <p className="text-sm"><Link href="/forgot" className="font-semibold text-royal hover:underline">Forgot your password?</Link></p>
        </ActionForm>
      </div>
      <p className="mt-5 text-sm text-ink-2">
        New student? <Link href="/register" className="font-bold text-royal hover:underline">Activate your account</Link> ·{" "}
        New staff? <Link href="/register/staff" className="font-bold text-royal hover:underline">Staff registration</Link> ·{" "}
        Parent? <Link href="/register/parent" className="font-bold text-royal hover:underline">Create a parent account</Link>
      </p>
    </div>
  );
}
