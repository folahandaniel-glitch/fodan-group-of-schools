import Link from "next/link";
import { sql } from "@/lib/db";
import { getSchool } from "@/lib/settings";
import { loadPositions } from "@/lib/positions";
import { AuthArt } from "@/components/auth-art";
import { StaffRegisterForm } from "@/components/staff-register-form";

export const metadata = { title: "Staff registration" };
export const dynamic = "force-dynamic";

export default async function RegisterStaff() {
  const school = await getSchool();
  const [positions, branches] = await Promise.all([
    loadPositions(),
    sql`SELECT id, name FROM branches WHERE school_id = ${school.id} AND active ORDER BY name`,
  ]);
  return (
    <div>
      <AuthArt slot="staff" className="mb-5" />
      <p className="eyebrow">Staff registration</p>
      <h1 className="mt-1 text-3xl">Join the school portal</h1>
      <p className="mt-1 text-sm text-muted">Teaching and non-teaching staff register here. It takes about a minute.</p>
      <div className="card card-pad mt-5">
        <StaffRegisterForm positions={positions.map((p) => ({ title: p.title, group: p.group }))} branches={branches as unknown as { id: string; name: string }[]} />
      </div>
      <p className="mt-5 text-sm text-ink-2">Already registered? <Link className="font-bold text-royal hover:underline" href="/login">Sign in</Link></p>
    </div>
  );
}
