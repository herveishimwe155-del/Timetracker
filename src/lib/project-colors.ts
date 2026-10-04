/**
 * Project colours: eight hues stepped for the dark Monolith surface, in an order
 * validated for colour-blind separation between neighbours (dataviz palette check:
 * CVD ΔE ≥ 8.4, normal-vision ΔE ≥ 19.3, ≥ 3:1 contrast on #09090B and #18181B).
 * The order is the safety mechanism: new projects take them in this order.
 * Colour only marks identity; names are always shown as text beside it.
 */
export const PROJECT_COLORS = [
  { name: "Blue", hex: "#3987E5" },
  { name: "Orange", hex: "#D95926" },
  { name: "Aqua", hex: "#199E70" },
  { name: "Yellow", hex: "#C98500" },
  { name: "Magenta", hex: "#D55181" },
  { name: "Green", hex: "#008300" },
  { name: "Violet", hex: "#9085E9" },
  { name: "Red", hex: "#E66767" },
] as const;

/** The least-used palette colour (earliest first), so new projects are easy to tell apart. */
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

const CSS_VARS = new Map<string, string>(
  PROJECT_COLORS.map((c) => [c.hex.toLowerCase(), `var(--project-${c.name.toLowerCase()})`]),
);

/**
 * The colour to paint for a stored project colour. Palette colours become CSS
 * variables, so light mode swaps in steps validated for a white background;
 * any other value (e.g. a custom hex or another var) is used as is.
 */
export function displayColor(color: string): string {
  return CSS_VARS.get(color.toLowerCase()) ?? color;
}
