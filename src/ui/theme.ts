/**
 * "Hardwood pop" design tokens: a warm court-paint background, white sticker cards with ink outlines
 * and a chunky 3D bottom edge, and loud accent colors.
 */
export const C = {
  bg: '#FFF4E6',
  surface: '#FFFFFF',
  surface2: '#F5EEE3',
  line: '#E8DECF',
  /** The darker bottom edge that makes cards and buttons look 3D. */
  edge: '#D9CCB8',
  ink: '#17121E',
  text: '#17121E',
  muted: '#7D7488',
  hardwood: '#FF7417',
  neon: '#0B8F64',
  danger: '#EE3B4F',
  gold: '#B37400',
  blue: '#2F6BFF',
  purple: '#7A4DFF',
  pink: '#FF4F9E',
  teal: '#12B5C2',
  /** Text on top of a strong color. */
  onColor: '#FFFFFF',
} as const;

export const R = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 } as const;

/** Font families (loaded in the root layout). The Text wrapper maps fontWeight onto the League Spartan family. */
export const FONT = {
  display: 'LilitaOne_400Regular',
  body: 'LeagueSpartan_600SemiBold',
} as const;

export const F = {
  /** Chunky display type for titles and big numbers. */
  display: { fontFamily: FONT.display, letterSpacing: 0.2 },
  label: { fontSize: 12, fontWeight: '900' as const, letterSpacing: 1.4, textTransform: 'uppercase' as const },
};

/** Hard drop shadow under raised elements. */
export const lift = (color: string = C.edge, depth = 5) => ({ borderBottomWidth: depth, borderBottomColor: color });

/** Rating color: elite gold, great neon, good text, role muted. */
export function ovrColor(ovr: number): string {
  if (ovr >= 95) return '#E08A00';
  if (ovr >= 88) return C.neon;
  if (ovr >= 80) return C.blue;
  if (ovr >= 72) return C.text;
  return C.muted;
}

export const money = (m: number) => `$${m % 1 === 0 ? m : m.toFixed(1)}M`;

/** "#E8833A" + 0.4 → "#E8833A66" */
export function alpha(hex: string, a: number): string {
  const h = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex.slice(0, 7);
  return h + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
}
