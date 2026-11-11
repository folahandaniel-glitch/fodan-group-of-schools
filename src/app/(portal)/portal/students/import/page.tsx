import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { listClasses } from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { importStudents } from "./actions";

export const metadata = { title: "Import students" };
export const dynamic = "force-dynamic";

export default async function ImportStudents() {
  const me = await requirePerm("students:create");
  const classes = await listClasses(me.schoolId);
  return (
    <>
      <PageHeader title="Import students" sub="Add a whole class or school from one spreadsheet. Every student gets a unique access code."
        actions={<Link href="/portal/students" className="btn btn-ghost btn-sm">← Students</Link>} />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card><h2 className="text-xl">1. Get the template</h2>
          <p className="mt-1 text-sm text-muted">Fill one student per row. Required: admission_no, first_name, last_name. Class must match a class in the school exactly, for example <b>{classes[0]?.label ?? "JSS 1A"}</b>. Dates as YYYY-MM-DD.</p>
          <a className="btn btn-gold mt-3" href="/portal/students/import/template">Download Excel template</a>
          <h2 className="mt-6 text-xl">2. Upload it</h2>
          <ActionForm action={importStudents} submit="Import students" className="mt-3 grid gap-3" encType="multipart/form-data">
            <div className="field"><label htmlFor="file">Excel (.xlsx) or CSV file, up to 500 students</label><input id="file" name="file" type="file" accept=".xlsx,.csv,text/csv" className="input" required /></div>
          </ActionForm>
          <p className="mt-3 text-xs text-muted">Rows with a duplicate admission number, an unknown class or an invalid date are skipped and listed; all other rows are saved. After importing, download the access codes from Downloads.</p>
        </Card>
        <Card><h2 className="text-xl">Classes in this school</h2>
          <ul className="mt-2 flex flex-wrap gap-2">{classes.map((c) => <li key={c.id} className="badge">{c.label}</li>)}</ul></Card>
      </div>
    </>
  );
}
