import { ActionForm } from "@/components/action-form";
import { PasswordInput } from "@/components/password-input";
import { Card, Notice, PageHeader } from "@/components/ui";
import { changePassword } from "../actions";

export const metadata = { title: "Change password" };

export default async function PasswordPage({ searchParams }: { searchParams: Promise<{ forced?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Change password" sub="Use at least 8 characters with letters, numbers and symbols." />
      {sp.forced && <div className="mb-4"><Notice>You must choose a new password before continuing.</Notice></div>}
      <Card>
        <ActionForm action={changePassword} submit="Update password">
          <PasswordInput name="current" label="Current password" />
          <PasswordInput name="password" label="New password" autoComplete="new-password" meter />
          <PasswordInput name="confirm" label="Confirm new password" autoComplete="new-password" />
        </ActionForm>
      </Card>
    </>
  );
}
