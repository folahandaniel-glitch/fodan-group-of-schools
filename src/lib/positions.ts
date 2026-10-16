import { getSetting } from "./settings";
import { ROLES } from "./logic/permissions";

export type Position = { title: string; role: string; group: "secondary" | "primary" | "non_teaching" };

/** Parses "Title | role" lines (BackEnd-editable) into positions; unknown roles fall back to support_staff / teacher. */
export async function loadPositions(): Promise<Position[]> {
  const p = (await getSetting<Record<string, string[]>>("positions")) ?? {};
  const out: Position[] = [];
  for (const group of ["secondary", "primary", "non_teaching"] as const) {
    for (const line of p[group] ?? []) {
      const [title, role] = line.split("|").map((s) => s.trim());
      if (!title) continue;
      const fallback = group === "non_teaching" ? "support_staff" : "teacher";
      out.push({ title, role: ROLES.includes(role as never) && role !== "super_admin" ? role : fallback, group });
    }
  }
  return out;
}
