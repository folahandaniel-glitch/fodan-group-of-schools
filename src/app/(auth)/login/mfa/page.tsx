import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { verifyMfa } from "../../actions";

export const metadata = { title: "Two-factor verification" };

export default function Mfa() {
  return (
    <div>
      <p className="eyebrow">Two-factor authentication</p>
      <h1 className="mt-1 text-3xl">Enter your verification code</h1>
      <p className="mt-1 text-sm text-muted">Open your authenticator app and enter the 6-digit code, or use one of your recovery codes.</p>
      <div className="card card-pad mt-5">
        <ActionForm action={verifyMfa} submit="Verify">
          <Field label="Verification or recovery code" name="code" required autoComplete="one-time-code" />
        </ActionForm>
      </div>
    </div>
  );
}
