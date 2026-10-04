/**
 * Project colours: twelve hues that stay readable as dots and labels on the
 * Monolith dark background. Emerald is first, matching the brand accent.
 */
export const PROJECT_COLORS = [
  { name: "Emerald", hex: "#10B981" },
  { name: "Cyan", hex: "#22D3EE" },
  { name: "Sky", hex: "#38BDF8" },
  { name: "Blue", hex: "#60A5FA" },
  { name: "Violet", hex: "#A78BFA" },
  { name: "Fuchsia", hex: "#E879F9" },
  { name: "Rose", hex: "#FB7185" },
  { name: "Orange", hex: "#FB923C" },
  { name: "Amber", hex: "#FBBF24" },
  { name: "Lime", hex: "#A3E635" },
  { name: "Teal", hex: "#2DD4BF" },
  { name: "Zinc", hex: "#A1A1AA" },
] as const;

/** The least-used palette colour, so new projects are easy to tell apart. */
export function nextProjectColor(used: string[]): string {
  const counts = new Map(PROJECT_COLORS.map((c) => [c.hex.toLowerCase(), 0]));
  for (const hex of used) {
    const key = hex.toLowerCase();
    if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
  }
  let best: string = PROJECT_COLORS[0].hex;
  let bestCount = Infinity;
  for (const c of PROJECT_COLORS) {
    const n = counts.get(c.hex.toLowerCase())!;
    if (n < bestCount) {
      best = c.hex;
      bestCount = n;
    }
  }
  return best;
}
