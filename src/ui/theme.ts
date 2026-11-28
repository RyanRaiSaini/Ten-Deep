/**
 * "Arena Night" design tokens: a dark arena background with a faint glow at the top, raised dark panels with a
 * chunky bottom edge, amber for the one main action on a screen, and the game's orange kept for art (the ball,
 * the logo, the court banners). Text is light; `ink` is the dark color for outlines, dark tiles and text on amber.
 * Every text/surface pair here clears 4.5:1 (muted on surface2 is the lowest at 6.2:1).
 */
export const C = {
  bg: '#0B0F17',
  surface: '#151B26',
  surface2: '#1E2633',
  line: '#2A3444',
  /** The darker bottom edge that makes panels and buttons look 3D. */
  edge: '#070A10',
  /** The dark color: outlines, dark tiles, and text on amber or orange. */
  ink: '#070A10',
  text: '#F2F4F8',
  muted: '#9AA6B8',
  /** Game orange: art, the ball, the logo, court banners (not text on dark). */
  hardwood: '#FF7417',
  /** The one main action on a screen (ink text on it). */
  accent: '#FFB547',
  accentEdge: '#C98A1E',
  onAccent: '#0B0F17',
  neon: '#3DDC97',
  danger: '#FF6B5E',
  gold: '#FFB547',
  blue: '#6AA8FF',
  purple: '#A78BFA',
  pink: '#FF7AB6',
  teal: '#4FD1C5',
  /** Text on top of a strong color. */
  onColor: '#FFFFFF',
} as const;

export const R = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 } as const;

/**
 * Font families (loaded in the root layout). The Text wrapper maps fontWeight onto the Barlow family.
 *   display: Lilita One, the chunky sticker face for the logo, card ratings and hero titles.
 *   condensed: Barlow Condensed, the scoreboard face for screen titles, big numbers and button labels.
 */
export const FONT = {
  display: 'LilitaOne_400Regular',
  condensed: 'BarlowCondensed_800ExtraBold',
  condensedBold: 'BarlowCondensed_700Bold',
  body: 'Barlow_600SemiBold',
} as const;

export const F = {
  /** Chunky display type for hero titles and big numbers. */
  display: { fontFamily: FONT.display, letterSpacing: 0.2 },
  /** Scoreboard type: condensed caps for titles and figures. */
  condensed: { fontFamily: FONT.condensed, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  /** Small caps label over a section or a stat. Never below 11 pt. */
  label: { fontSize: 12, fontWeight: '800' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
};

/** Hard drop shadow under raised elements. */
export const lift = (color: string = C.edge, depth = 5) => ({ borderBottomWidth: depth, borderBottomColor: color });

/** Rating color: elite amber, great green, good blue, role text, bench muted. */
export function ovrColor(ovr: number): string {
  if (ovr >= 95) return C.gold;
  if (ovr >= 88) return C.neon;
  if (ovr >= 80) return C.blue;
  if (ovr >= 72) return C.text;
  return C.muted;
}

/**
 * Game dollars as text. `scale` shows them in an era's own dollars (see moneyScaleFor in data/modes): small
 * figures get more precision ($1.85M) and under a million show as thousands ($750K).
 */
export const money = (m: number, scale = 1) => {
  if (scale === 1) return `$${m % 1 === 0 ? m : m.toFixed(1)}M`;
  const v = m * scale;
  if (v < 1) return `$${Math.round(v * 1000)}K`;
  return `$${Number(v.toFixed(v < 10 ? 2 : 1))}M`;
};

/** "#E8833A" + 0.4 → "#E8833A66" */
export function alpha(hex: string, a: number): string {
  const h = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex.slice(0, 7);
  return h + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
}
