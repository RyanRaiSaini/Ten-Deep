/** "Arena night" design tokens. */
export const C = {
  bg: '#0B1020',
  surface: '#141B2E',
  surface2: '#1C2540',
  line: '#26304D',
  text: '#F4F6FB',
  muted: '#8C97B5',
  hardwood: '#E8833A',
  neon: '#3DF2C2',
  danger: '#FF5C6C',
  gold: '#F5C451',
} as const;

export const R = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 } as const;

export const F = {
  /** Big condensed numbers & headings. */
  display: { fontWeight: '900' as const, letterSpacing: -0.5 },
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
};

/** Rating color: elite gold, great neon, good text, role muted. */
export function ovrColor(ovr: number): string {
  if (ovr >= 95) return C.gold;
  if (ovr >= 88) return C.neon;
  if (ovr >= 80) return C.text;
  if (ovr >= 72) return '#B9C2DB';
  return C.muted;
}

export const money = (m: number) => `$${m % 1 === 0 ? m : m.toFixed(1)}M`;
