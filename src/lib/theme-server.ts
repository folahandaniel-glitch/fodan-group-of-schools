import { cookies } from "next/headers";
import { allSettings } from "./settings";
import { PRIMARY_THEME, THEME_COOKIE, THEME_SEEDS, isTheme, themeVars } from "./themes";
import type { ThemeChoice } from "@/components/theme-picker";

/** Theme for this request: visitor's cookie, else the school default set in the BackEnd, else the logo theme. */
export async function resolveTheme(): Promise<{ id: string; choices: ThemeChoice[]; picker: boolean }> {
  let def = PRIMARY_THEME, picker = true, hidden: string[] = [];
  try {
    const t = (await allSettings()).theme as { default?: string; picker?: boolean; hidden?: string[] } | undefined;
    if (isTheme(t?.default)) def = t!.default!;
    if (t?.picker === false) picker = false;
    hidden = t?.hidden ?? [];
  } catch { /* database not reachable: fall back to the primary theme */ }
  const c = (await cookies()).get(THEME_COOKIE)?.value;
  const choices = THEME_SEEDS.filter((t) => !hidden.includes(t.id) || t.id === def).map((t) => {
    const v = themeVars(t);
    return { id: t.id, name: t.name, swatch: [v.strong, v["gold-2"], v.paper] as [string, string, string] };
  });
  const id = picker && isTheme(c) && choices.some((x) => x.id === c) ? c : def;
  return { id, choices, picker };
}
