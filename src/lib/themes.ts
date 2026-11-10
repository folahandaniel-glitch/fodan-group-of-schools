// Theme engine. Every colour in the UI is a CSS variable, so a theme is just a set of values on <html data-theme>.
// The primary theme uses the school logo's navy and gold. Visitors pick a theme (stored in a cookie); Super Admin sets the default.

export type ThemeSeed = { id: string; name: string; strong: string; accent: string; link: string; paper: string; dark?: boolean; ink?: string };

export const PRIMARY_THEME = "fodan-classic";

export const THEME_SEEDS: ThemeSeed[] = [
  { id: "fodan-classic", name: "Fodan Classic (logo)", strong: "#0a1b3f", accent: "#c9a227", link: "#1f3fa6", paper: "#faf7f0", ink: "#0a1b3f" },
  { id: "royal-blue", name: "Royal Blue", strong: "#14307a", accent: "#e0b43a", link: "#2447c0", paper: "#f6f8fd" },
  { id: "emerald", name: "Emerald", strong: "#0b4a36", accent: "#d9a520", link: "#12805c", paper: "#f3faf6" },
  { id: "crimson", name: "Crimson", strong: "#5e1521", accent: "#d4a73a", link: "#a3243b", paper: "#fbf5f4" },
  { id: "royal-purple", name: "Royal Purple", strong: "#3d1d70", accent: "#e8b04b", link: "#6a3bc2", paper: "#f9f6fe" },
  { id: "ocean-teal", name: "Ocean Teal", strong: "#0a4651", accent: "#f0b429", link: "#0f7d8f", paper: "#f2fafb" },
  { id: "sunrise-orange", name: "Sunrise Orange", strong: "#7a2e0b", accent: "#f08a24", link: "#c4500f", paper: "#fff8f1" },
  { id: "forest", name: "Forest", strong: "#1c3d22", accent: "#c8a83c", link: "#2f7a3d", paper: "#f5f8f1" },
  { id: "slate", name: "Slate", strong: "#1f2a3a", accent: "#d6a93b", link: "#3a5f9e", paper: "#f5f6f8" },
  { id: "rose", name: "Rose", strong: "#5a1a3a", accent: "#e59bb4", link: "#b02a63", paper: "#fdf6f9" },
  { id: "sky", name: "Sky", strong: "#0d3b66", accent: "#f4b942", link: "#1479c9", paper: "#f4f9fe" },
  { id: "caritas-wine", name: "Wine & Gold", strong: "#4a1424", accent: "#e1b94a", link: "#8f1d3f", paper: "#fbf6ee" },
  { id: "sandstone", name: "Sandstone", strong: "#4a3a22", accent: "#c98a2b", link: "#8a5d12", paper: "#faf5ea" },
  { id: "lagoon", name: "Lagoon", strong: "#073b4c", accent: "#06d6a0", link: "#118ab2", paper: "#f1faf9" },
  { id: "amethyst", name: "Amethyst", strong: "#2d1b4e", accent: "#d8a7f0", link: "#7b4bd1", paper: "#f8f5fd" },
  { id: "terracotta", name: "Terracotta", strong: "#59271a", accent: "#e3a15a", link: "#b3472d", paper: "#fcf6f2" },
  { id: "mint", name: "Mint", strong: "#134e43", accent: "#f2c14e", link: "#1d9a82", paper: "#f2fbf8" },
  { id: "graphite", name: "Graphite", strong: "#262a31", accent: "#e2b53f", link: "#4b6a9b", paper: "#f6f6f4" },
  { id: "midnight", name: "Midnight (dark)", strong: "#16254f", accent: "#e3b83e", link: "#8ea8ff", paper: "#0d1424", dark: true },
  { id: "charcoal", name: "Charcoal (dark)", strong: "#2a2f3a", accent: "#e6b94a", link: "#8fb4ff", paper: "#16181d", dark: true },
  { id: "forest-night", name: "Forest Night (dark)", strong: "#14452c", accent: "#d4b04a", link: "#7fd6a0", paper: "#0e1a13", dark: true },
  { id: "plum-night", name: "Plum Night (dark)", strong: "#3c1f57", accent: "#e6b45f", link: "#c6a2ff", paper: "#17101f", dark: true },
  { id: "ocean-night", name: "Ocean Night (dark)", strong: "#0d4155", accent: "#f0b84a", link: "#7ad0e8", paper: "#0a171d", dark: true },
  { id: "high-contrast", name: "High Contrast", strong: "#000000", accent: "#ffd400", link: "#0033cc", paper: "#ffffff", ink: "#000000" },
];

type RGB = [number, number, number];
const rgb = (h: string): RGB => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const hex = ([r, g, b]: RGB) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
/** Mixes a toward b; p is how much of b (0..1). */
export function mix(a: string, b: string, p: number): string {
  const x = rgb(a), y = rgb(b);
  return hex([x[0] + (y[0] - x[0]) * p, x[1] + (y[1] - x[1]) * p, x[2] + (y[2] - x[2]) * p]);
}

export type ThemeVars = Record<string, string>;

export function themeVars(t: ThemeSeed): ThemeVars {
  if (t.dark) {
    const ink = mix(t.paper, "#ffffff", 0.93);
    return {
      paper: t.paper, "paper-2": mix(t.paper, "#ffffff", 0.05), card: mix(t.paper, "#ffffff", 0.08),
      ink, "ink-2": mix(t.paper, "#ffffff", 0.78), muted: mix(t.paper, "#ffffff", 0.62), line: mix(t.paper, "#ffffff", 0.17),
      royal: t.link, "royal-2": mix(t.link, "#ffffff", 0.18), gold: mix(t.accent, "#ffffff", 0.1), "gold-2": t.accent,
      "gold-soft": mix(t.accent, t.paper, 0.78), strong: t.strong, "strong-2": mix(t.strong, t.link, 0.35),
    };
  }
  const ink = t.ink ?? mix(t.strong, "#000000", 0.18);
  return {
    paper: t.paper, "paper-2": mix(t.paper, t.accent, 0.09), card: "#ffffff",
    ink, "ink-2": mix(ink, t.paper, 0.24), muted: mix(ink, t.paper, 0.42), line: mix(t.paper, ink, 0.15),
    royal: t.link, "royal-2": mix(t.link, "#ffffff", 0.14), gold: mix(t.accent, "#000000", 0.36), "gold-2": t.accent,
    "gold-soft": mix(t.accent, t.paper, 0.76), strong: t.strong, "strong-2": mix(t.strong, t.link, 0.45),
  };
}

/** One <style> block holding every theme; the browser switches with [data-theme]. */
export function themeCss(): string {
  return THEME_SEEDS.map((t) => {
    const v = themeVars(t);
    const body = Object.entries(v).map(([k, val]) => `--color-${k}:${val}`).join(";");
    return `:root[data-theme="${t.id}"]{${body};color-scheme:${t.dark ? "dark" : "light"}}`;
  }).join("\n");
}

export const THEME_COOKIE = "fodan_theme";
export const isTheme = (id: string | undefined | null): id is string => !!id && THEME_SEEDS.some((t) => t.id === id);
