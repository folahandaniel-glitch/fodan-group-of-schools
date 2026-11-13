import { FAMILY_COLOURS, TIERS } from "@/lib/logic/loyalty";

/** The reward logo for a loyalty tier: a shield whose metal, stars and crown grow with the tier. */
export function TierLogo({ index, size = 64, locked = false }: { index: number; size?: number; locked?: boolean }) {
  const t = TIERS[Math.max(0, Math.min(TIERS.length - 1, index))];
  const [a, b, c] = FAMILY_COLOURS[t.family];
  const id = `tl${index}`;
  const stars = t.rank + 1;
  const crown = t.family === "emeritus" || t.name.endsWith("Ultra");
  const initial = t.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${t.name} badge`} style={locked ? { filter: "grayscale(1)", opacity: 0.4 } : undefined}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      {crown && <path d="M20 12l6 6 6-9 6 9 6-6-2 9H22z" fill={a} stroke={b} strokeWidth="1.5" strokeLinejoin="round" />}
      <path d="M32 18c7 4 13 4 18 3v14c0 11-8 18-18 22C22 53 14 46 14 35V21c5 1 11 1 18-3z" fill={`url(#${id})`} stroke={b} strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 23c5 2.600 9 3 12 2.600v9.400c0 7.600-5 12.400-12 15.400-7-3-12-7.800-12-15.400v-9.400c3 .4 7 0 12-2.600z" fill={c} opacity=".35" />
      <text x="32" y="40" textAnchor="middle" fontSize="15" fontWeight="800" fill={b} fontFamily="system-ui,sans-serif">{initial}</text>
      <g fill={c} stroke={b} strokeWidth=".8">{Array.from({ length: stars }, (_, i) => { const x = 32 + (i - (stars - 1) / 2) * 9; return <path key={i} d={`M${x} 44l1.500 3 3.300.500-2.400 2.300.600 3.300L${x} 51.500l-3 1.600.600-3.300-2.400-2.300 3.300-.500z`} transform="translate(0 -3)" />; })}</g>
    </svg>
  );
}
