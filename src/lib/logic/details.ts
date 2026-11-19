/** "HRM Details" / "My Details": the personal record every staff member, student and parent completes. Every field is compulsory (write N/A where something does not apply). */
export type Kind = "text" | "date" | "select" | "textarea" | "tel" | "email";
export type Check = "text" | "nin" | "bvn" | "acct" | "phone" | "email" | "date" | "year";
export type Field = { key: string; label: string; kind?: Kind; check?: Check; options?: string[]; hint?: string; secret?: boolean };
export type Section = { id: string; title: string; blurb?: string; fields: Field[] };
export type Role = "staff" | "student" | "parent";

export const STATES = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "Outside Nigeria"];
export const BANKS = ["Access Bank", "Citibank", "Ecobank", "Fidelity Bank", "First Bank of Nigeria", "First City Monument Bank (FCMB)", "Globus Bank", "Guaranty Trust Bank (GTBank)", "Heritage Bank", "Keystone Bank", "Kuda Microfinance Bank", "Moniepoint Microfinance Bank", "OPay", "PalmPay", "Polaris Bank", "Providus Bank", "Stanbic IBTC Bank", "Standard Chartered Bank", "Sterling Bank", "SunTrust Bank", "Titan Trust Bank", "Union Bank", "United Bank for Africa (UBA)", "Unity Bank", "Wema Bank", "Zenith Bank", "Other"];
const GENDER = ["Female", "Male"], MARITAL = ["Single", "Married", "Divorced", "Widowed", "Separated"], RELIGION = ["Christianity", "Islam", "Traditional", "Other"];
const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Not known"], GENO = ["AA", "AS", "SS", "AC", "SC", "Not known"];
const TITLES = ["Mr", "Mrs", "Miss", "Ms", "Dr", "Prof", "Engr", "Pastor", "Rev", "Alhaji", "Alhaja", "Chief"];

const f = (key: string, label: string, o: Partial<Field> = {}): Field => ({ key, label, ...o });
const NA = "Write N/A if it does not apply.";
const name = [f("surname", "Surname"), f("firstName", "First name"), f("otherNames", "Other names", { hint: NA })];
const origin = [f("nationality", "Nationality"), f("stateOfOrigin", "State of origin", { kind: "select", options: STATES }), f("lga", "Local government area"), f("religion", "Religion", { kind: "select", options: RELIGION })];
const health = (extra: Field[] = []): Section => ({ id: "health", title: "Health details", blurb: "Kept private. Used only in an emergency or for care at school.", fields: [
  f("bloodGroup", "Blood group", { kind: "select", options: BLOOD }), f("genotype", "Genotype", { kind: "select", options: GENO }),
  f("allergies", "Allergies", { kind: "textarea", hint: "Food, drug or other. Write None if there are none." }), f("conditions", "Long-term medical conditions", { kind: "textarea", hint: "For example asthma, sickle cell, diabetes. Write None if there are none." }),
  f("disabilities", "Disabilities or special needs", { kind: "textarea", hint: "Write None if there are none." }), f("medications", "Regular medication", { kind: "textarea", hint: "Write None if there is none." }),
  f("hmo", "Health insurance or HMO and ID number", { hint: NA }), f("hospital", "Family doctor or preferred hospital"), ...extra] });
const bank: Section = { id: "bank", title: "Bank account details", blurb: "Where salary or refunds are paid. A 10-digit account number.", fields: [
  f("bankName", "Bank", { kind: "select", options: BANKS }), f("accountName", "Account name"), f("accountNumber", "Account number", { check: "acct", kind: "tel", secret: true }), f("accountType", "Account type", { kind: "select", options: ["Savings", "Current"] })] };
const emergency = (label = "Emergency contact"): Section => ({ id: "emergency", title: label, fields: [f("emName", "Full name"), f("emRelationship", "Relationship"), f("emPhone", "Phone number", { kind: "tel", check: "phone" }), f("emAddress", "Address")] });

export const SECTIONS: Record<Role, Section[]> = {
  staff: [
    { id: "personal", title: "Personal details", fields: [f("title", "Title", { kind: "select", options: TITLES }), ...name, f("dob", "Date of birth", { kind: "date", check: "date" }), f("gender", "Gender", { kind: "select", options: GENDER }), f("marital", "Marital status", { kind: "select", options: MARITAL }), ...origin] },
    { id: "contact", title: "Contact details", fields: [f("phone", "Phone number", { kind: "tel", check: "phone" }), f("altPhone", "Alternative phone", { kind: "tel", check: "phone" }), f("email", "Email address", { kind: "email", check: "email" }), f("address", "Home address"), f("city", "Town or city"), f("residenceState", "State of residence", { kind: "select", options: STATES })] },
    { id: "identity", title: "Identification", blurb: "Your national and tax identity. Kept private and encrypted.", fields: [f("nin", "National Identification Number (NIN)", { check: "nin", kind: "tel", hint: "11 digits.", secret: true }), f("bvn", "Bank Verification Number (BVN)", { check: "bvn", kind: "tel", hint: "11 digits.", secret: true }), f("tin", "Tax ID (TIN)", { hint: NA, secret: true }), f("pension", "Pension PIN (RSA)", { hint: NA, secret: true })] },
    bank,
    { id: "nok", title: "Next of kin", fields: [f("nokName", "Full name"), f("nokRelationship", "Relationship"), f("nokPhone", "Phone number", { kind: "tel", check: "phone" }), f("nokAddress", "Address")] },
    emergency(),
    health(),
    { id: "education", title: "Education and work history", fields: [f("qualification", "Highest qualification"), f("institution", "Institution attended"), f("gradYear", "Year of graduation", { check: "year", kind: "tel" }), f("previousEmployer", "Previous employer", { hint: NA })] },
  ],
  student: [
    { id: "personal", title: "Personal details", fields: [...name, f("dob", "Date of birth", { kind: "date", check: "date" }), f("gender", "Gender", { kind: "select", options: GENDER }), ...origin] },
    { id: "residence", title: "Home and contact", fields: [f("address", "Home address"), f("city", "Town or city"), f("residenceState", "State of residence", { kind: "select", options: STATES }), f("phone", "Student phone number", { kind: "tel", hint: NA })] },
    { id: "identity", title: "Identification", blurb: "A child's NIN, or the NIN of a parent or guardian if the child has none.", fields: [f("nin", "NIN (child's or guardian's)", { check: "nin", kind: "tel", hint: "11 digits.", secret: true }), f("birthCert", "Birth certificate number", { hint: NA })] },
    { id: "guardian", title: "Parent or guardian", fields: [f("guardianName", "Full name"), f("guardianRelationship", "Relationship to the student"), f("guardianPhone", "Phone number", { kind: "tel", check: "phone" }), f("guardianEmail", "Email address", { kind: "email", check: "email" }), f("guardianOccupation", "Occupation"), f("guardianAddress", "Address")] },
    emergency("Emergency contact (another adult)"),
    health(),
    { id: "school", title: "Previous school", fields: [f("previousSchool", "Last school attended", { hint: NA }), f("lastClass", "Last class completed", { hint: NA })] },
  ],
  parent: [
    { id: "personal", title: "Personal details", fields: [f("title", "Title", { kind: "select", options: TITLES }), ...name, f("dob", "Date of birth", { kind: "date", check: "date" }), f("gender", "Gender", { kind: "select", options: GENDER }), f("marital", "Marital status", { kind: "select", options: MARITAL }), ...origin] },
    { id: "contact", title: "Contact and work", fields: [f("phone", "Phone number", { kind: "tel", check: "phone" }), f("altPhone", "Alternative phone", { kind: "tel", check: "phone" }), f("email", "Email address", { kind: "email", check: "email" }), f("address", "Home address"), f("city", "Town or city"), f("residenceState", "State of residence", { kind: "select", options: STATES }), f("occupation", "Occupation"), f("employer", "Employer or business"), f("workAddress", "Work address")] },
    { id: "identity", title: "Identification", blurb: "Kept private and encrypted.", fields: [f("nin", "National Identification Number (NIN)", { check: "nin", kind: "tel", hint: "11 digits.", secret: true }), f("bvn", "Bank Verification Number (BVN)", { check: "bvn", kind: "tel", hint: "11 digits.", secret: true })] },
    bank,
    emergency(),
    health(),
  ],
};

export const roleOf = (r: string): Role => (r === "student" ? "student" : r === "parent" ? "parent" : "staff");
export const allFields = (role: Role) => SECTIONS[role].flatMap((s) => s.fields);

const digits = (s: string) => s.replace(/\D/g, "");
/** Returns an error message for one value, or "" when it is fine. */
export function checkValue(fld: Field, raw: string): string {
  const v = raw.trim();
  if (!v) return "Required";
  if (fld.options && !fld.options.includes(v)) return "Choose from the list";
  const c = fld.check ?? "text";
  if (c === "nin" || c === "bvn") return digits(v).length === 11 && digits(v) === v.replace(/\s/g, "") ? "" : "Must be exactly 11 digits";
  if (c === "acct") return digits(v).length === 10 && digits(v) === v.replace(/\s/g, "") ? "" : "Must be exactly 10 digits";
  if (c === "phone") return v.toUpperCase() === "N/A" || digits(v).length >= 10 && digits(v).length <= 14 ? "" : "Enter a valid phone number";
  if (c === "email") return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? "" : "Enter a valid email address";
  if (c === "year") return /^(19|20)\d{2}$/.test(v) ? "" : "Enter a 4-digit year";
  if (c === "date") { const d = new Date(v + "T00:00:00Z"); return !Number.isNaN(d.getTime()) && d.getUTCFullYear() > 1920 && d.getTime() < Date.now() ? "" : "Enter a valid date"; }
  return v.length >= 2 || v.toUpperCase() === "N/A" ? "" : "Too short";
}

export type Values = Record<string, string>;
/** Every compulsory field that is missing or wrong, by key. */
export function validate(role: Role, values: Values): Record<string, string> {
  const out: Record<string, string> = {};
  for (const fld of allFields(role)) { const e = checkValue(fld, values[fld.key] ?? ""); if (e) out[fld.key] = e; }
  return out;
}
export function progress(role: Role, values: Values, hasPhoto: boolean) {
  const secs = SECTIONS[role].map((s) => { const ok = s.fields.filter((x) => !checkValue(x, values[x.key] ?? "")).length; return { id: s.id, title: s.title, done: ok, total: s.fields.length }; });
  const done = secs.reduce((a, s) => a + s.done, 0) + (hasPhoto ? 1 : 0), total = secs.reduce((a, s) => a + s.total, 0) + 1;
  return { sections: secs, done, total, complete: done === total, pct: Math.round((done / total) * 100) };
}
export const mask = (v: string) => (v.length <= 4 ? "••••" : "•".repeat(v.length - 4) + v.slice(-4));
