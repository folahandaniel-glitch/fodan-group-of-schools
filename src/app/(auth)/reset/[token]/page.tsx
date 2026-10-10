import { ActionForm } from "@/components/action-form";
import { PasswordInput } from "@/components/password-input";
import { resetPassword } from "../../actions";

export const metadata = { title: "Choose a new password" };

export default async function Reset({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div>
      <p className="eyebrow">Account recovery</p>
      <h1 className="mt-1 text-3xl">Choose a new password</h1>
      <div className="card card-pad mt-5">
        <ActionForm action={resetPassword} submit="Save new password">
          <input type="hidden" name="token" value={token} />
          <PasswordInput name="password" label="New password" autoComplete="new-password" meter />
          <PasswordInput name="confirm" label="Confirm new password" autoComplete="new-password" />
        </ActionForm>
      </div>
    </div>
  );
}
