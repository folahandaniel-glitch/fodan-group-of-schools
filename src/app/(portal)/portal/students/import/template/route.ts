import { NextResponse } from "next/server";
import { getMe, can } from "@/lib/auth";
import { listClasses } from "@/lib/data";
import { buildXlsx, XLSX_MIME } from "@/lib/xlsx";
import { COLUMNS } from "@/lib/student-import";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getMe();
  if (!me || !me.mfaPassed || !can(me, "students:create")) return new NextResponse("Not permitted", { status: 403 });
  const classes = await listClasses(me.schoolId);
  const example = Object.fromEntries(COLUMNS.map((c) => [c, ""])) as Record<string, string>;
  Object.assign(example, { admission_no: "FCI/2026/001", first_name: "Ada", last_name: "Okoro", gender: "Female", date_of_birth: "2014-05-21", class: classes[0]?.label ?? "JSS 1A", guardian_name: "Mr Okoro", guardian_phone: "08030000000", guardian_email: "okoro@example.com" });
  const bytes = buildXlsx([
    { name: "Students", rows: [example], columns: [...COLUMNS] },
    { name: "Classes", rows: classes.map((c) => ({ class: c.label })), columns: ["class"] },
  ]);
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": XLSX_MIME, "Content-Disposition": 'attachment; filename="fodan-student-import-template.xlsx"', "Cache-Control": "no-store" } });
}
