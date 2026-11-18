import Link from "next/link";

export const HR_TABS: [string, string][] = [["/portal/hrm", "Rules & cases"], ["/portal/hrm/leave", "Leave"], ["/portal/hrm/appraisals", "Appraisals"], ["/portal/hrm/recruitment", "Recruitment"], ["/portal/hrm/directory", "Staff directory"]];

export function HrNav({ current }: { current: string }) {
  return <nav className="mb-5 flex flex-wrap gap-2" aria-label="HR sections">{HR_TABS.map(([h, l]) => <Link key={h} href={h} className={`badge text-sm ${current === h ? "badge-info" : ""}`}>{l}</Link>)}</nav>;
}
