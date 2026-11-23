/**
 * The Ten Deep mark: a hardwood ball with a bold "10" — one SVG source for the
 * in-app logo (SvgXml) and the generated app icons (scripts/make-icons.ts).
 * Shapes only, no fonts, so it renders identically everywhere.
 */
export interface LogoOptions {
  /** Draw the dark rounded-square tile behind the ball (app icon). */
  tile?: boolean;
  /** Fraction of the 1024 canvas the ball occupies (Android adaptive icons need ~0.6). */
  scale?: number;
  /** Single-color alpha silhouette (Android themed icon). */
  mono?: boolean;
}

const BG = '#0B1020';
const ONE = 'M300 405 L385 350 L440 350 L440 672 L355 672 L355 452 L300 476 Z';
const SEAMS = 'M512 212 L512 812 M212 512 L812 512 M318 262 Q462 512 318 762 M706 262 Q562 512 706 762';

export function logoSvg({ tile = false, scale = 0.62, mono = false }: LogoOptions = {}): string {
  const k = scale / 0.62;
  const t = `translate(${512 - 512 * k} ${512 - 512 * k}) scale(${k})`;
  const digits = (fill: string, outline: string) => `
    <path d="${ONE}" fill="${outline}" stroke="${outline}" stroke-width="30" stroke-linejoin="round"/>
    <rect x="510" y="392" width="176" height="238" rx="88" fill="none" stroke="${outline}" stroke-width="112"/>
    <path d="${ONE}" fill="${fill}"/>
    <rect x="510" y="392" width="176" height="238" rx="88" fill="none" stroke="${fill}" stroke-width="82"/>`;

  if (mono) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs><mask id="m"><rect width="1024" height="1024" fill="#fff"/>
    <path d="${SEAMS}" stroke="#000" stroke-width="22" fill="none"/>${digits('#000', '#000')}</mask></defs>
  <g transform="${t}"><circle cx="512" cy="512" r="300" fill="#fff" mask="url(#m)"/></g>
</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <clipPath id="clip"><circle cx="512" cy="512" r="300"/></clipPath>
    <radialGradient id="ball" cx="38%" cy="32%" r="75%">
      <stop offset="0" stop-color="#FFB36B"/><stop offset="0.55" stop-color="#E8833A"/><stop offset="1" stop-color="#A9501A"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="60%">
      <stop offset="0" stop-color="#E8833A" stop-opacity="0.35"/><stop offset="1" stop-color="${BG}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="digit" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#DCE3F5"/>
    </linearGradient>
  </defs>
  ${tile ? `<rect width="1024" height="1024" fill="${BG}"/><rect width="1024" height="1024" fill="url(#glow)"/>` : ''}
  <g transform="${t}">
    <circle cx="512" cy="512" r="300" fill="url(#ball)"/>
    <path d="${SEAMS}" stroke="${BG}" stroke-width="20" fill="none" opacity="0.85" clip-path="url(#clip)"/>
    <circle cx="512" cy="512" r="300" fill="none" stroke="${BG}" stroke-width="14" opacity="0.5"/>
    ${digits('url(#digit)', BG)}
    <rect x="300" y="752" width="424" height="26" rx="13" fill="#3DF2C2"/>
  </g>
</svg>`;
}
