/** Team color helpers (pure, no React Native): card gradients that keep white text readable. */

/** Darken a hex color by a factor. */
export const deepen = (hex: string, f = 0.62) => {
  const n = parseInt(hex.slice(1, 7), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * f).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
};

/** WCAG relative luminance and contrast against white text. */
const channel = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
export const whiteContrast = (hex: string) => 1.05 / (lum(hex) + 0.05);

/**
 * A team's card background: its main color, unless white text wouldn't read on it (silver, white, gold); then
 * its other color; and if both are light, darkened just enough to reach 3:1. The bottom stop is a deeper shade.
 */
export function teamGradient(colors: [string, string]): [string, string] {
  const [a, b] = colors;
  let main = whiteContrast(a) >= 3 ? a : whiteContrast(b) > whiteContrast(a) ? b : a;
  for (let i = 0; whiteContrast(main) < 3 && i < 12; i++) main = deepen(main, 0.9);
  return [main, deepen(main)];
}
