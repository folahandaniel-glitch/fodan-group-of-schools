import { describe, expect, it } from "vitest";
import { parseStudents, ymdOf } from "@/lib/student-import";
import { buildXlsx } from "@/lib/xlsx";
import { addDays, mondayOf } from "@/lib/roster";

describe("student import", () => {
  it("reads a CSV with friendly headings and quoted commas", async () => {
    const csv = 'Admission Number,Surname,First Name,DOB,Class\nFCI/1,"Okoro, Jr",Ada,02/04/2013,JSS 1A\nFCI/2,Bello,Musa,2012-12-30,JSS 1A\n';
    const { rows, error } = await parseStudents("x.csv", Buffer.from(csv));
    expect(error).toBeUndefined();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ admission_no: "FCI/1", last_name: "Okoro, Jr", first_name: "Ada", class: "JSS 1A" });
    expect(ymdOf(rows[0].date_of_birth)).toBe("2013-04-02");
    expect(ymdOf(rows[1].date_of_birth)).toBe("2012-12-30");
  });
  it("round-trips through the Excel files this app writes", async () => {
    const bytes = buildXlsx([{ name: "Students", rows: [{ admission_no: "A1", first_name: "Ife", last_name: "Ojo", class: "SSS 1 Science" }] }]);
    const { rows } = await parseStudents("t.xlsx", Buffer.from(bytes));
    expect(rows[0]).toMatchObject({ admission_no: "A1", first_name: "Ife", last_name: "Ojo", class: "SSS 1 Science" });
  });
  it("rejects files without the required columns", async () => {
    const { error } = await parseStudents("x.csv", Buffer.from("name,age\nA,3\n"));
    expect(error).toMatch(/admission_no/);
  });
  it("rejects bad dates", () => { expect(ymdOf("31st June")).toBe(""); });
});

describe("roster weeks", () => {
  it("finds Monday and steps by days", () => {
    expect(mondayOf("2026-11-11")).toBe("2026-11-09");
    expect(mondayOf("2026-11-15")).toBe("2026-11-09");
    expect(addDays("2026-11-09", 7)).toBe("2026-11-16");
  });
});
