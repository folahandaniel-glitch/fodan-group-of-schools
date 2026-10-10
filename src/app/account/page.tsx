import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ActionForm } from "@/components/action-form";
import { Field, PageHeader, Card, Badge } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/logic/permissions";
import { updateProfile } from "./actions";

export const metadata = { title: "My profile" };

export default async function Profile() {
  const me = await requireMe();
  const [u] = await sql`SELECT phone FROM users WHERE id = ${me.id}`;
  return (
    <>
      <PageHeader title="My profile" sub={me.email} actions={<Badge tone="info">{ROLE_LABEL[me.role] ?? me.role}</Badge>} />
      <Card>
        <ActionForm action={updateProfile} submit="Save profile" className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="firstName" defaultValue={me.firstName} required />
          <Field label="Last name" name="lastName" defaultValue={me.lastName} required />
          <Field label="Phone" name="phone" defaultValue={u?.phone} type="tel" />
        </ActionForm>
      </Card>
      <p className="mt-4 text-sm text-muted">Your email address is your username and can only be changed by the school office.</p>
    </>
  );
}
