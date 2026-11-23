/**
 * Illustrated player portraits: glossy 3D-cartoon busts (200×200), built from parts as one SVG string.
 * Original characters only: they evoke basketball archetypes, never a real player, name, team or logo.
 *
 * Rendered through react-native-svg's SvgXml, so only portable primitives are used: path / circle /
 * ellipse / rect / g, linear + radial gradients, clipPath, opacity and transforms. No filters, text,
 * images or CSS. Soft light is faked with layered gradients; the bust keeps a thick ink outline so it
 * sits in the app's sticker style.
 */
export type Skin = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type HairStyle =
  | 'buzz' | 'fade' | 'hightop' | 'afro' | 'curly' | 'locs' | 'braids' | 'mohawk' | 'bun' | 'ponytail'
  | 'long' | 'bald' | 'slick' | 'twists' | 'waves' | 'cornrows' | 'manbun' | 'boxbraids' | 'puffs';
export type Mood = 'smile' | 'grin' | 'fierce' | 'cool' | 'shout' | 'smirk' | 'calm';
export type Facial = 'none' | 'beard' | 'goatee' | 'mustache' | 'stubble';
export type Extra = 'headband' | 'earring' | 'stud' | 'chain' | 'goggles' | 'wrinkles' | 'freckles';

export interface PortraitSpec {
  skin: Skin;
  hair: HairStyle;
  hairColor: string;
  mood: Mood;
  facial?: Facial;
  /** Beard colour when it differs from the hair (greying veterans). */
  beardColor?: string;
  extras?: Extra[];
  /** [jersey body, trim + number]. */
  jersey: [string, string];
  number: number;
  /** [centre, edge] of the round backdrop. */
  bg: [string, string];
  rays?: boolean;
  ball?: 'left' | 'right';
  /** Iris colour. */
  eyes?: string;
  /** Eye shape: open (default), heavy-lidded, or round and wide. */
  lids?: 'open' | 'heavy' | 'round';
  /** Face width: 0.92 narrow … 1.08 wide. */
  width?: number;
  /** Softer jaw, lashes, finer brows, tinted lips. */
  fem?: boolean;
  /** Nose width: 0.85 fine … 1.3 broad. */
  nose?: number;
  /** Horizontal gaze, -2 … 2. */
  gaze?: number;
  /** Colour of the tips of locs / twists / mohawk. */
  tips?: string;
  /** Headband colour (defaults to the jersey trim). */
  band?: string;
  /** Shaved part line in a fade. */
  part?: boolean;
  /** Jaw width: 0.9 tapered … 1.15 square. */
  jaw?: number;
}

interface Tone { base: string; light: string; shadow: string; deep: string; lip: string; blush: string }

const TONES: Tone[] = [
  { base: '#F7D2B2', light: '#FFEAD8', shadow: '#E1A283', deep: '#B66B52', lip: '#D97C76', blush: '#FF7F78' },
  { base: '#EDBA92', light: '#FCD8B9', shadow: '#CF8C66', deep: '#A2573C', lip: '#C66B5B', blush: '#F2705F' },
  { base: '#DBA277', light: '#EFC29A', shadow: '#BA7C53', deep: '#8B4C30', lip: '#B0604B', blush: '#E26550' },
  { base: '#C4885B', light: '#DEA97D', shadow: '#A3663D', deep: '#723D22', lip: '#99513D', blush: '#D35C45' },
  { base: '#A76B43', light: '#C78C60', shadow: '#87512E', deep: '#5A3019', lip: '#7E412E', blush: '#BA5238' },
  { base: '#8A5533', light: '#AA7249', shadow: '#6C3E22', deep: '#472411', lip: '#693527', blush: '#A0452E' },
  { base: '#6D4027', light: '#8D5B39', shadow: '#542F1A', deep: '#33180B', lip: '#54291D', blush: '#8C3C28' },
  { base: '#4E2C19', light: '#6F462B', shadow: '#3A1F11', deep: '#200F06', lip: '#3F1F19', blush: '#6E2F20' },
];
export const SKINS = TONES.map((t) => t.base);
const INK = '#17121E';
const OUT = 3.6; // silhouette outline width

// ---------- colour + number helpers ----------
const rgb = (h: string) => {
  const n = parseInt(h.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (c: number[]) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: string, b: string, t: number) => {
  const A = rgb(a), B = rgb(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
};
const shade = (h: string, f: number) => mix(h, '#000000', 1 - f);
const lum = (h: string) => {
  const [r, g, b] = rgb(h);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};
const n = (v: number) => Math.round(v * 10) / 10;

function rng(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Pt = [number, number];
/** Point on a cubic Bézier. */
const bez = (p: Pt[], t: number): Pt => {
  const m = 1 - t;
  return [0, 1].map((k) => m * m * m * p[0][k] + 3 * m * m * t * p[1][k] + 3 * m * t * t * p[2][k] + t * t * t * p[3][k]) as Pt;
};
/** The part of a cubic Bézier from t to 1, as path data. */
const tail = (p: Pt[], t: number) => {
  const lerp = (a: Pt, b: Pt): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const a = lerp(p[0], p[1]), b = lerp(p[1], p[2]), c = lerp(p[2], p[3]);
  const d = lerp(a, b), e = lerp(b, c), f = lerp(d, e);
  return `M${n(f[0])} ${n(f[1])}C${n(e[0])} ${n(e[1])} ${n(c[0])} ${n(c[1])} ${n(p[3][0])} ${n(p[3][1])}`;
};
const cub = (p: Pt[]) => `M${n(p[0][0])} ${n(p[0][1])}C${p.slice(1).map((q) => `${n(q[0])} ${n(q[1])}`).join(' ')}`;

// ---------- geometry ----------
interface Geo { w: number; jaw: number; chin: number; top: number }
const L = (g: Geo) => 100 - g.w;
const R = (g: Geo) => 100 + g.w;

/** Head outline (cranium → cheeks → jaw → chin), optionally offset. */
function headD(g: Geo, dx = 0, dy = 0): string {
  const X = (x: number) => n(x + dx), Y = (y: number) => n(y + dy);
  const l = L(g), r = R(g), t = g.top, c = g.chin, j = g.jaw;
  return `M${X(100)} ${Y(t)}C${X(100 + g.w * 0.62)} ${Y(t)} ${X(r)} ${Y(t + 17)} ${X(r)} ${Y(88)}` +
    `C${X(r)} ${Y(106)} ${X(r - 1.5)} ${Y(121)} ${X(100 + j + 3)} ${Y(135)}` +
    `C${X(100 + j - 5)} ${Y(c - 6)} ${X(113)} ${Y(c)} ${X(100)} ${Y(c)}` +
    `C${X(87)} ${Y(c)} ${X(100 - j + 5)} ${Y(c - 6)} ${X(100 - j - 3)} ${Y(135)}` +
    `C${X(l + 1.5)} ${Y(121)} ${X(l)} ${Y(106)} ${X(l)} ${Y(88)}` +
    `C${X(l)} ${Y(t + 17)} ${X(100 - g.w * 0.62)} ${Y(t)} ${X(100)} ${Y(t)}Z`;
}
/** The head grown outwards: a hair mass hugging the skull. */
const volD = (g: Geo, kx: number, ky: number) => headD({ ...g, w: g.w + kx, top: g.top - ky });
/** Everything above the hairline (sideburns down to `sb`). Used as a clip. */
function capD(g: Geo, hy = 61, sb = 112): string {
  const l = L(g), r = R(g), st = Math.min(sb, 93);
  return `M4 ${sb}L${n(l + 6)} ${sb}L${n(l + 7)} ${st}C${n(l + 8)} ${st - 8} ${n(l + 10)} 80 ${n(l + 14)} 77` +
    `C${n(l + 24)} ${hy + 4} 88 ${hy} 100 ${hy}C112 ${hy} ${n(r - 24)} ${hy + 4} ${n(r - 14)} 77` +
    `C${n(r - 10)} 80 ${n(r - 8)} ${st - 8} ${n(r - 7)} ${st}L${n(r - 6)} ${sb}L196 ${sb}L196 -30L4 -30Z`;
}
/** A scalloped, cloud-like ellipse (afros, puffs, buns). */
function fluffD(cx: number, cy: number, rx: number, ry: number, bumps: number, amp: number, rnd: () => number): string {
  const pts: Pt[] = [];
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2 + 0.2;
    const k = 1 + (rnd() - 0.5) * 0.04;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 0; i < bumps; i++) {
    const a = ((i + 0.5) / bumps) * Math.PI * 2 + 0.2;
    const q = pts[(i + 1) % bumps];
    d += `Q${n(cx + Math.cos(a) * rx * (1 + amp))} ${n(cy + Math.sin(a) * ry * (1 + amp))} ${n(q[0])} ${n(q[1])}`;
  }
  return d + 'Z';
}

// ---------- context ----------
interface Ctx {
  s: PortraitSpec;
  g: Geo;
  T: Tone;
  id: (k: string) => string;
  u: (k: string) => string;
  defs: string[];
  rnd: () => number;
  hc: string; hl: string; hd: string; sheen: string;
  rim: string;
}

const stroke = (c: string, w: number, extra = '') =>
  `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra ? ' ' + extra : ''}`;
/** Many dots as one path (round caps on tiny segments): far fewer native views than one circle each. */
const dots = (pts: Pt[], r: number, col: string, op: number) =>
  pts.length ? `<path d="${pts.map(([x, y]) => `M${n(x)} ${n(y)}h0.3`).join('')}" ${stroke(col, n(r * 2), `opacity="${op}"`)}/>` : '';
/** Rotated ellipse as path data, so a whole chain of them can share one element. */
const ellD = (x: number, y: number, rx: number, ry: number, deg: number) => {
  const a = (deg * Math.PI) / 180, cx = Math.cos(a) * rx, sy = Math.sin(a) * rx;
  return `M${n(x - cx)} ${n(y - sy)}A${rx} ${ry} ${deg} 1 0 ${n(x + cx)} ${n(y + sy)}A${rx} ${ry} ${deg} 1 0 ${n(x - cx)} ${n(y - sy)}Z`;
};
const lin = (id: string, stops: [number, string, number?][], a = '0 0 0 1', extra = '') => {
  const [x1, y1, x2, y2] = a.split(' ');
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${extra ? ' ' + extra : ''}>${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${op}"` : ''}/>`).join('')}</linearGradient>`;
};
const rad = (id: string, stops: [number, string, number?][], extra = '') =>
  `<radialGradient id="${id}"${extra ? ' ' + extra : ''}>${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${op}"` : ''}/>`).join('')}</radialGradient>`;
/** A soft glow blob: radial gradient that fades to nothing. */
const glow = (c: Ctx, k: string, color: string, op: number) => {
  c.defs.push(rad(c.id(k), [[0, color, op], [1, color, 0]]));
  return c.u(k);
};

// ---------- background ----------
function background(c: Ctx): string {
  const [b1, b2] = c.s.bg;
  c.defs.push(rad(c.id('bg'), [[0, mix(b1, '#FFFFFF', 0.28)], [0.45, b1], [1, b2]], 'cx="0.5" cy="0.34" r="0.74"'));
  const halo = glow(c, 'halo', '#FFFFFF', 0.5);
  let rays = '';
  if (c.s.rays) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.13, a2 = a + 0.17;
      rays += `M100 86L${n(100 + 170 * Math.cos(a))} ${n(86 + 170 * Math.sin(a))}L${n(100 + 170 * Math.cos(a2))} ${n(86 + 170 * Math.sin(a2))}Z`;
    }
    rays = `<path d="${rays}" fill="#FFFFFF" opacity="0.1"/>`;
  }
  return `<rect width="200" height="200" fill="${c.u('bg')}"/>${rays}` +
    `<circle cx="100" cy="218" r="122" ${stroke('#FFFFFF', 5, 'stroke-opacity="0.14"')}/>` +
    `<circle cx="100" cy="218" r="64" ${stroke('#FFFFFF', 4, 'stroke-opacity="0.1"')}/>` +
    `<ellipse cx="100" cy="88" rx="88" ry="84" fill="${halo}"/>`;
}

// ---------- digits (jersey number, no fonts) ----------
const DIGITS = [
  'M5 0C1 0 0 4 0 8C0 12 1 16 5 16C9 16 10 12 10 8C10 4 9 0 5 0Z',
  'M2 3.5L6 0L6 16',
  'M0.5 4C0.5 1 3 0 5 0C8 0 10 2 10 4.5C10 9 1 11 0 16L10 16',
  'M0.5 1L9.5 1L4 6.5C8 6.5 10 8.5 10 11C10 14.5 7 16 4.5 16C2.5 16 0.8 15 0 13.8',
  'M7.5 16L7.5 0L0 11L10 11',
  'M9.5 0.5L1.5 0.5L0.5 7C2 6 3.5 5.8 5 5.8C8 5.8 10 8 10 11C10 14 7.5 16 4.8 16C2.6 16 1 15 0 13.8',
  'M9 1C4 0.5 0 4 0 10.5C0 14 2 16 5 16C8 16 10 14 10 11C10 8 8 6 5 6C2.5 6 0.5 7.5 0 10',
  'M0 0.5L10 0.5L4 16',
  'M5 7.2C2 7.2 0.8 5.6 0.8 3.8C0.8 1.6 2.6 0 5 0C7.4 0 9.2 1.6 9.2 3.8C9.2 5.6 8 7.2 5 7.2C2 7.2 0 9 0 11.6C0 14.2 2.2 16 5 16C7.8 16 10 14.2 10 11.6C10 9 8 7.2 5 7.2Z',
  'M1 15C6 15.5 10 12 10 5.5C10 2 8 0 5 0C2 0 0 2 0 5C0 8 2 10 5 10C7.5 10 9.5 8.5 10 6',
];
function numberSvg(num: number, color: string, cx: number, cy: number, h: number): string {
  const ds = String(Math.max(0, Math.min(99, Math.round(num)))).split('').map(Number);
  const sc = h / 16, gap = 3.2;
  const total = ds.length * 10 + (ds.length - 1) * gap;
  const x0 = cx - (total * sc) / 2, y0 = cy - h / 2;
  const glyph = (w: number, col: string) => ds.map((d, i) =>
    `<path d="${DIGITS[d]}" transform="translate(${n(x0 + i * (10 + gap) * sc)} ${n(y0)}) scale(${n(sc * 100) / 100})" ${stroke(col, w)}/>`).join('');
  return lum(color) < 0.2 ? glyph(4, color) : glyph(6.4, INK) + glyph(3.4, color);
}

// ---------- torso: shoulders, neck, tank-top jersey ----------
function torso(c: Ctx): string {
  const { T, s } = c;
  const [j1, j2] = s.jersey;
  c.defs.push(rad(c.id('sh'), [[0, T.light], [0.45, T.base], [1, T.shadow]], 'cx="0.3" cy="0.15" r="0.95"'));
  c.defs.push(lin(c.id('nk'), [[0, T.deep], [0.42, T.shadow], [1, T.base]], '0 0 0.25 1'));
  c.defs.push(lin(c.id('jg'), [[0, mix(j1, '#FFFFFF', 0.26)], [0.5, j1], [1, shade(j1, 0.7)]], '0 0 1 0.9'));
  const neckD = 'M81 124L81 170Q100 184 119 170L119 124Z';
  const shD = 'M82 157C70 164 50 165 36 171C22 177 13 190 9 208L191 208C187 190 178 177 164 171C150 165 130 164 118 157Z';
  const jD = 'M78 162C82 183 118 183 122 162L138 165C140 178 144 193 151 208L49 208C56 193 60 178 62 165Z';
  const trim = 'M78 162C82 183 118 183 122 162M138 165C140 178 144 193 151 208M62 165C60 178 56 193 49 208';
  c.defs.push(`<clipPath id="${c.id('nc')}"><path d="${neckD}"/></clipPath><clipPath id="${c.id('jc')}"><path d="${jD}"/></clipPath><clipPath id="${c.id('sc')}"><path d="${shD}"/></clipPath>`);
  const jSheen = glow(c, 'js', '#FFFFFF', 0.34);
  const shShadow = glow(c, 'ss', T.deep, 0.55);
  const trimDark = lum(j2) > 0.6 ? shade(j1, 0.55) : shade(j2, 0.55);
  return `<path d="${shD}" fill="${c.u('sh')}" stroke="${INK}" stroke-width="${OUT}" stroke-linejoin="round"/>` +
    `<g clip-path="${c.u('sc')}">` +
    `<ellipse cx="100" cy="170" rx="34" ry="14" fill="${shShadow}"/>` +
    `<path d="M150 167C166 171 180 180 188 198" ${stroke(c.rim, 4, 'opacity="0.55"')}/>` +
    `<ellipse cx="40" cy="182" rx="18" ry="10" fill="${glow(c, 'sg', '#FFFFFF', 0.3)}" transform="rotate(-25 40 182)"/>` +
    `<path d="M42 186C46 194 47 201 47 208M158 186C154 194 153 201 153 208" ${stroke(T.deep, 2, 'opacity="0.35"')}/>` +
    `</g>` +
    `<path d="${neckD}" fill="${c.u('nk')}" stroke="${INK}" stroke-width="${OUT}" stroke-linejoin="round"/>` +
    `<g clip-path="${c.u('nc')}"><path d="${headD(c.g, 2, 8)}" fill="${T.deep}" opacity="0.5"/>` +
    `<path d="M88 150Q93 164 98 172M112 150Q107 164 102 172" ${stroke(T.deep, 2, 'opacity="0.3"')}/>` +
    `<path d="M119.5 134L119.5 172" ${stroke(c.rim, 5, 'opacity="0.5"')}/></g>` +
    `<path d="${jD}" fill="${c.u('jg')}"/>` +
    `<g clip-path="${c.u('jc')}">` +
    `<ellipse cx="100" cy="172" rx="30" ry="9" fill="#000000" opacity="0.18"/>` +
    `<ellipse cx="76" cy="196" rx="22" ry="14" fill="${jSheen}"/>` +
    `<path d="${trim}" ${stroke(trimDark, 12)}/><path d="${trim}" ${stroke(j2, 8.6)}/>` +
    `<path d="M84 165C88 181 112 181 116 165" ${stroke('#FFFFFF', 1.6, 'opacity="0.35"')}/>` +
    numberSvg(s.number, j2, 100, 193.5, 15) +
    `</g>` +
    `<path d="${jD}" fill="none" stroke="${INK}" stroke-width="${OUT}" stroke-linejoin="round"/>` +
    (s.extras?.includes('chain')
      ? `<path d="M80 163C83 186 117 186 120 163" ${stroke(INK, 5.6)}/><path d="M80 163C83 186 117 186 120 163" ${stroke('#E9B93F', 3.4)}/>` +
        `<path d="M80 163C83 186 117 186 120 163" ${stroke('#FFF3B8', 1.3, 'stroke-dasharray="1.6 3.2"')}/>`
      : '');
}

// ---------- ears ----------
function ears(c: Ctx): string {
  const { g, T } = c;
  c.defs.push(rad(c.id('er'), [[0, mix(T.base, T.blush, 0.12)], [0.7, T.shadow], [1, T.deep]], 'cx="0.45" cy="0.45" r="0.6"'));
  let out = '';
  for (const side of [-1, 1]) {
    const cx = 100 + side * (g.w + 0.5);
    const X = (dx: number) => n(cx + side * dx);
    out += `<path d="M${X(-4)} 98C${X(6)} 93 ${X(12)} 101 ${X(11)} 111C${X(10)} 121 ${X(5)} 128 ${X(-3)} 126Z" fill="${c.u('er')}" stroke="${INK}" stroke-width="${OUT * 0.9}" stroke-linejoin="round"/>` +
      `<path d="M${X(0)} 103C${X(6)} 102 ${X(7)} 112 ${X(2)} 119" ${stroke(T.deep, 2.2, 'opacity="0.6"')}/>` +
      (side === 1 ? `<path d="M${X(5)} 100C${X(9)} 104 ${X(10)} 112 ${X(7)} 120" ${stroke(c.rim, 2, 'opacity="0.6"')}/>` : '');
  }
  const ex = c.s.extras ?? [];
  const lx = n(L(g) - 5);
  if (ex.includes('earring')) {
    out += `<circle cx="${lx}" cy="128.5" r="4.6" ${stroke(INK, 4.2)}/><circle cx="${lx}" cy="128.5" r="4.6" ${stroke('#F2C14E', 2.2)}/>` +
      `<path d="M${n(L(g) - 8.6)} 127C${n(L(g) - 8)} 125.5 ${n(L(g) - 6.8)} 124.6 ${n(L(g) - 5.6)} 124.3" ${stroke('#FFF6CF', 1.1)}/>`;
  }
  if (ex.includes('stud')) {
    out += `<circle cx="${n(L(g) - 3.5)}" cy="122.5" r="3.4" fill="#DDF6FF" stroke="${INK}" stroke-width="1.6"/>` +
      `<path d="M${n(L(g) - 3.5)} 116.5L${n(L(g) - 2.8)} 121.8L${n(L(g) + 2.5)} 122.5L${n(L(g) - 2.8)} 123.2L${n(L(g) - 3.5)} 128.5L${n(L(g) - 4.2)} 123.2L${n(L(g) - 9.5)} 122.5L${n(L(g) - 4.2)} 121.8Z" fill="#FFFFFF"/>`;
  }
  return out;
}

// ---------- head skin + shading ----------
function headSkin(c: Ctx, inner: string): string {
  const { g, T } = c;
  c.defs.push(`<clipPath id="${c.id('h')}"><path d="${headD(g)}"/></clipPath>`);
  c.defs.push(rad(c.id('hs'), [[0, T.light], [0.42, T.base], [0.82, T.shadow], [1, T.shadow]], 'gradientUnits="userSpaceOnUse" cx="86" cy="92" r="78" fx="80" fy="80"'));
  c.defs.push(lin(c.id('fs'), [[0, T.deep, 0], [1, T.deep, 0.58]], '0 0 1 0'));
  const fh = glow(c, 'fh', '#FFFFFF', 0.5);
  const ck = glow(c, 'ck', '#FFFFFF', 0.32);
  const bl = glow(c, 'bl', T.blush, c.s.fem ? 0.42 : 0.3);
  const so = glow(c, 'so', T.deep, 0.38);
  const big = 'M-20 -20H220V220H-20Z';
  return `<path d="${headD(g)}" fill="${c.u('hs')}"/>` +
    `<g clip-path="${c.u('h')}">` +
    `<rect x="104" y="30" width="${n(g.w)}" height="130" fill="${c.u('fs')}"/>` +
    `<path d="${big}${headD(g, 0, -9)}" fill-rule="evenodd" fill="${T.deep}" opacity="0.28"/>` +
    `<ellipse cx="85" cy="62" rx="24" ry="14" fill="${fh}"/>` +
    `<ellipse cx="78" cy="97" rx="17" ry="11" fill="${so}"/><ellipse cx="122" cy="97" rx="17" ry="11" fill="${so}"/>` +
    `<ellipse cx="75" cy="123" rx="14" ry="10" fill="${bl}"/><ellipse cx="125" cy="123" rx="13" ry="9" fill="${bl}"/>` +
    `<ellipse cx="74" cy="117" rx="9" ry="6" fill="${ck}"/><ellipse cx="97" cy="147" rx="8" ry="3.4" fill="${ck}"/>` +
    `<ellipse cx="80" cy="58" rx="9" ry="4.2" fill="#FFFFFF" opacity="0.32" transform="rotate(-24 80 58)"/>` +
    `<ellipse cx="71.5" cy="114" rx="4.4" ry="2.4" fill="#FFFFFF" opacity="0.26" transform="rotate(-20 71.5 114)"/>` +
    `<ellipse cx="97.6" cy="110" rx="1.3" ry="4.2" fill="#FFFFFF" opacity="0.32"/>` +
    inner +
    `<path d="${big}${headD(g, -4.5, 1.5)}" fill-rule="evenodd" fill="${c.rim}" opacity="0.45"/>` +
    `<path d="${big}${headD(g, -2, 0.6)}" fill-rule="evenodd" fill="${mix(c.rim, '#FFFFFF', 0.4)}" opacity="0.55"/>` +
    `</g>` +
    `<path d="${headD(g)}" fill="none" stroke="${INK}" stroke-width="${OUT}" stroke-linejoin="round"/>`;
}

// ---------- face ----------
interface EyeP { top: number; bot: number; inTop: number; tilt: number }
function eyeParams(s: PortraitSpec): EyeP {
  const lids = s.lids ?? 'open';
  const base: Record<Mood, EyeP> = {
    smile: { top: 10.5, bot: 4.5, inTop: 1, tilt: -0.5 },
    grin: { top: 9.5, bot: 1.5, inTop: 1, tilt: -0.5 },
    fierce: { top: 8.5, bot: 6, inTop: 0.45, tilt: -1.5 },
    cool: { top: 6.2, bot: 5.5, inTop: 0.95, tilt: 0 },
    shout: { top: 12, bot: 7.5, inTop: 0.7, tilt: -1 },
    smirk: { top: 8.5, bot: 5, inTop: 1, tilt: -0.5 },
    calm: { top: 8, bot: 5.5, inTop: 1, tilt: 0 },
  };
  const p = { ...base[s.mood] };
  if (lids === 'heavy') p.top -= 1.6;
  if (lids === 'round') { p.top += 1.4; p.bot += 0.8; }
  return p;
}

function eye(c: Ctx, side: -1 | 1, p: EyeP, k: string): string {
  const { s, T } = c;
  const cx = 100 + side * 21, cy = 104;
  const E = 1.08;
  const P = (u: number, v: number) => `${n(cx + side * u * E)} ${n(cy + v * E)}`;
  const upper = `M${P(-10.5, 0.5)}C${P(-7, -p.top * p.inTop)} ${P(5, -p.top * 1.05)} ${P(11.5, p.tilt)}`;
  const shape = `${upper}C${P(7, p.bot)} ${P(-5, p.bot * 1.05)} ${P(-10.5, 0.5)}Z`;
  const lower = `M${P(9, p.tilt + p.bot * 0.55)}C${P(5, p.bot * 1.15)} ${P(-4, p.bot * 1.1)} ${P(-8, 1.6)}`;
  const iris = s.eyes ?? '#5A3420';
  const ix = n(cx + (s.gaze ?? 0)), iy = n(cy + 0.8);
  c.defs.push(`<clipPath id="${c.id(k)}"><path d="${shape}"/></clipPath>`);
  const crease = `M${P(-8, -p.top * p.inTop - 3.2)}C${P(-3, -p.top - 5.5)} ${P(5, -p.top - 5.5)} ${P(10.5, p.tilt - 4.5)}`;
  const lashes = s.fem
    ? `<path d="M${P(8, p.tilt - p.top * 0.55)}Q${P(12.5, p.tilt - 1)} ${P(15.6, p.tilt - 3.8)}Q${P(12.8, p.tilt + 0.6)} ${P(11, p.tilt + 0.4)}Z" fill="${INK}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>` +
      `<path d="M${P(7, -p.top * 0.82)}L${P(9, -p.top * 0.82 - 3)}" ${stroke(INK, 1.5)}/>`
    : `<path d="M${P(11.5, p.tilt)}L${P(13, p.tilt - 1.1)}" ${stroke(INK, 2.4)}/>`;
  return `<path d="${crease}" ${stroke(T.deep, 1.5, 'opacity="0.55"')}/>` +
    `<path d="${shape}" fill="${c.u('ew')}"/>` +
    `<g clip-path="${c.u(k)}">` +
    `<circle cx="${ix}" cy="${iy}" r="8.8" fill="${c.u('ir')}"/>` +
    `<circle cx="${ix}" cy="${iy}" r="8.8" ${stroke(shade(iris, 0.35), 1.2)}/>` +
    `<circle cx="${ix}" cy="${iy}" r="4.2" fill="#0B0710"/>` +
    `<ellipse cx="${n(+ix - 2.9)}" cy="${n(+iy - 3)}" rx="2.7" ry="2.4" fill="#FFFFFF"/>` +
    `<circle cx="${n(+ix + 3)}" cy="${n(+iy + 2.8)}" r="1.2" fill="#FFFFFF" opacity="0.85"/>` +
    `<path d="${upper}" ${stroke('#2A1A20', 6, 'opacity="0.28"')}/>` +
    `</g>` +
    `<path d="${lower}" ${stroke(T.deep, 1.3, 'opacity="0.7"')}/>` +
    `<path d="${upper}" ${stroke(INK, s.fem ? 3.3 : 2.9)}/>` + lashes;
}

function brows(c: Ctx): string {
  const { s } = c;
  type B = [number, number, number]; // inner, arch, outer (y offsets)
  const m: Record<Mood, [B, B]> = {
    smile: [[0, -4, 0], [0, -4, 0]],
    grin: [[-2, -6.5, -1], [-2, -6.5, -1]],
    fierce: [[5.5, 0.5, -2.5], [5.5, 0.5, -2.5]],
    cool: [[1.5, -0.5, 1], [-0.5, -3.5, -1]],
    shout: [[6, 1, -4], [6, 1, -4]],
    smirk: [[0.5, -2, 0.5], [-3, -8, -3.5]],
    calm: [[0.5, -2.5, 1], [0.5, -2.5, 1]],
  };
  const hcol = s.hair === 'bald' ? shade(c.T.deep, 0.6) : c.hc;
  const col = lum(hcol) > 0.45 ? shade(hcol, 0.62) : lum(hcol) > 0.2 ? shade(hcol, 0.8) : hcol;
  const th = s.fem ? 3.4 : 5.2, to = s.fem ? 1.4 : 2.2;
  let out = '';
  ([-1, 1] as const).forEach((side, i) => {
    const [bi, ba, bo] = m[s.mood][i === 0 ? 0 : 1];
    const cx = 100 + side * 21, y = 88.5;
    const P = (u: number, v: number) => `${n(cx + side * u)} ${n(y + v)}`;
    const d = `M${P(-10, bi - th / 2)}Q${P(3, ba - th * 0.75 - 2)} ${P(14, bo - to / 2)}` +
      `Q${P(15, bo + to / 2)} ${P(13, bo + to / 2)}Q${P(3, ba + th * 0.35 - 1)} ${P(-10, bi + th / 2)}Q${P(-11.5, bi)} ${P(-10, bi - th / 2)}Z`;
    out += `<path d="${d}" fill="${col}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>` +
      `<path d="M${P(-6, bi - th * 0.2)}Q${P(3, ba - th * 0.4 - 1.5)} ${P(10, bo - 0.4)}" ${stroke(mix(col, '#FFFFFF', 0.35), 1, 'opacity="0.55"')}/>`;
  });
  return out;
}

function nose(c: Ctx): string {
  const { T, s } = c;
  const w = (s.nose ?? 1) * (s.fem ? 0.88 : 1);
  const X = (dx: number) => n(100 + dx * w);
  const tip = glow(c, 'nt', '#FFFFFF', 0.55);
  const ball = glow(c, 'nb', T.shadow, 0.55);
  const line = mix(T.deep, INK, 0.25);
  return `<path d="M104 103C106 109 107 114 107.5 119" ${stroke(T.shadow, 3.4, 'opacity="0.55"')}/>` +
    `<path d="M96.5 104C95.5 110 95.5 114 96 117" ${stroke(T.light, 2.2, 'opacity="0.55"')}/>` +
    `<ellipse cx="102" cy="122" rx="${n(9 * w)}" ry="6.5" fill="${ball}"/>` +
    `<ellipse cx="100.5" cy="130.6" rx="${n(8 * w)}" ry="2.4" fill="${T.deep}" opacity="0.28"/>` +
    `<path d="M${X(-8.5)} 120.5C${X(-11)} 124.5 ${X(-7.5)} 128.6 ${X(-4)} 127C${X(-2)} 129.4 ${X(2)} 129.4 ${X(4)} 127C${X(7.5)} 128.6 ${X(11)} 124.5 ${X(8.5)} 120.5" ${stroke(line, 2.1)}/>` +
    `<ellipse cx="${X(-4.4)}" cy="125.6" rx="${n(2.1 * w)}" ry="1.2" fill="${T.deep}" transform="rotate(18 ${X(-4.4)} 125.6)"/>` +
    `<ellipse cx="${X(4.4)}" cy="125.6" rx="${n(2.1 * w)}" ry="1.2" fill="${T.deep}" transform="rotate(-18 ${X(4.4)} 125.6)"/>` +
    `<ellipse cx="98.6" cy="120.6" rx="4.2" ry="3.2" fill="${tip}"/>`;
}

function mouth(c: Ctx): string {
  const { s, T } = c;
  c.defs.push(lin(c.id('lp'), [[0, mix(T.lip, '#FFFFFF', 0.12)], [1, shade(T.lip, 0.8)]]));
  const lipC = s.fem ? mix(T.lip, '#D0405A', 0.22) : T.lip;
  const lipUp = shade(lipC, 0.82), lipLo = mix(lipC, '#FFFFFF', 0.1);
  const line = '#2A1214', inside = '#3A0F14', teeth = '#FFFBF3', tongue = '#D8606C';
  const hiLip = (x: number, y: number) => `<ellipse cx="${x}" cy="${y}" rx="3.6" ry="1.2" fill="#FFFFFF" opacity="0.42"/>`;
  const open = (d: string, body: string) => {
    c.defs.push(`<clipPath id="${c.id('mo')}"><path d="${d}"/></clipPath>`);
    return `<path d="${d}" fill="${inside}"/><g clip-path="${c.u('mo')}">${body}</g><path d="${d}" fill="none" stroke="${line}" stroke-width="2.2" stroke-linejoin="round"/>`;
  };
  const closed = (lineD: string, up: string, lo: string, hx: number, hy: number) =>
    `<path d="${up}" fill="${lipUp}"/><path d="${lo}" fill="${lipLo}"/>${hiLip(hx, hy)}<path d="${lineD}" ${stroke(line, 2.3)}/>`;
  switch (s.mood) {
    case 'smile': {
      const d = 'M85.5 133.5C92 137 108 137 114.5 133.5C111.5 146 88.5 146 85.5 133.5Z';
      return `<path d="M90 144.5C95 149.6 105 149.6 110 144.5C105 146.6 95 146.6 90 144.5Z" fill="${lipLo}"/>${hiLip(100, 147.2)}` +
        open(d, `<ellipse cx="100" cy="146" rx="10" ry="5" fill="${tongue}"/><path d="M84 132C92 136.6 108 136.6 116 132L115 138.6C107 140.6 93 140.6 85 138.6Z" fill="${teeth}"/><path d="M86 139C93 140.6 107 140.6 114 139" ${stroke('#D9CBB8', 1.2)}/>`) +
        `<path d="M83.5 131.4Q85 133.6 84.8 135.8M116.5 131.4Q115 133.6 115.2 135.8" ${stroke(line, 1.6, 'opacity="0.7"')}/>`;
    }
    case 'grin': {
      const d = 'M81 131.5C91 135.5 109 135.5 119 131.5C116 151 84 151 81 131.5Z';
      return `<path d="M88 148C95 153.4 105 153.4 112 148C105 150.4 95 150.4 88 148Z" fill="${lipLo}"/>` +
        open(d, `<ellipse cx="100" cy="148" rx="13" ry="6" fill="${tongue}"/><path d="M80 130C91 135 109 135 120 130L118.6 138.4C109 140.4 91 140.4 81.4 138.4Z" fill="${teeth}"/><path d="M86 146.5C93 143.6 107 143.6 114 146.5L114 152L86 152Z" fill="${teeth}"/>` +
          `<path d="M100 134.8L100 139.6M92 134.6L92.4 139.2M108 134.6L107.6 139.2" ${stroke('#D9CBB8', 0.9)}/>`) +
        `<path d="M78.5 129.4Q81 132 80.6 134.6M121.5 129.4Q119 132 119.4 134.6" ${stroke(line, 1.7, 'opacity="0.75"')}/>` +
        (s.fem ? '' : `<path d="M87 121Q81.5 126.5 81 132M113 121Q118.5 126.5 119 132" ${stroke(T.deep, 1.4, 'opacity="0.25"')}/>`);
    }
    case 'fierce': {
      if (s.fem) {
        return closed('M89.5 138.6C95 136.4 105 136.4 110.5 138.6',
          'M89.5 138.6C93 135.2 97 135 100 136.2C103 135 107 135.2 110.5 138.6C105 137.4 95 137.4 89.5 138.6Z',
          'M90.6 139C95 143.4 105 143.4 109.4 139C104 140.2 96 140.2 90.6 139Z', 100, 141.2) +
          `<path d="M87.6 140.2L89.6 138.6M112.4 140.2L110.4 138.6" ${stroke(line, 1.5)}/>`;
      }
      const d = 'M86 139C91 134.2 109 134.2 114 139C108 143.4 92 143.4 86 139Z';
      return `<path d="M90.5 143C95 146.2 105 146.2 109.5 143C105 144.2 95 144.2 90.5 143Z" fill="${lipLo}"/>` +
        open(d, `<rect x="84" y="130" width="32" height="20" fill="${teeth}"/><path d="M86 139.2C92 138 108 138 114 139.2" ${stroke('#8E7B70', 1.2)}/><path d="M94 135.5L94 142.5M100 135L100 143M106 135.5L106 142.5" ${stroke('#CDBFAE', 0.9)}/>`) +
        `<path d="M84 140.6L86.6 139M116 140.6L113.4 139" ${stroke(line, 1.6)}/>` +
        (s.fem ? '' : `<path d="M91 121Q86.5 125.5 86 131M109 121Q113.5 125.5 114 131" ${stroke(T.deep, 1.3, 'opacity="0.22"')}/>`);
    }
    case 'cool':
      return closed('M89.5 137.4C95 138.6 104 138.6 111 136.2',
        'M89.5 137.4C93 134.4 97 134.2 100 135.6C103 134.2 107 134 111 136.2C104 137.8 95 138 89.5 137.4Z',
        'M90.5 138C95 143.4 106 143.4 110.5 137C104 138.8 96 139 90.5 138Z', 100, 140.4) +
        `<path d="M111 136.2L112.8 135.4" ${stroke(line, 1.5)}/>`;
    case 'shout': {
      const d = 'M87.5 133C87.5 128.6 112.5 128.6 112.5 133C113.6 145 108.4 152.6 100 152.6C91.6 152.6 86.4 145 87.5 133Z';
      return open(d, `<ellipse cx="100" cy="151" rx="11" ry="6.5" fill="${tongue}"/><path d="M86 128L114 128L113 134.6C106 136 94 136 87 134.6Z" fill="${teeth}"/>`) +
        `<path d="M91 152.8C96 155.6 104 155.6 109 152.8" ${stroke(lipLo, 2.4)}/>` +
        (s.fem ? '' : `<path d="M90 120Q85 125.5 84.6 132M110 120Q115 125.5 115.4 132" ${stroke(T.deep, 1.4, 'opacity="0.25"')}/>`);
    }
    case 'smirk':
      return closed('M89 138.6C96 140.2 104 139.4 112.4 133.6',
        'M89 138.6C93 135.6 97 135.4 100 136.8C103 135 107 134 112.4 133.6C105 137.8 96 139 89 138.6Z',
        'M90 139.2C95 144 105 143.4 110.5 136.4C104 139.6 96 140.2 90 139.2Z', 99, 141.4) +
        `<path d="M113.4 131.6Q115.6 133.4 114.4 136.2" ${stroke(line, 1.5, 'opacity="0.7"')}/>`;
    case 'calm':
      return closed('M89 136.4C95 140.2 105 140.2 111 136.4',
        'M89 136.4C93 134 97 134 100 135.4C103 134 107 134 111 136.4C105 138.4 95 138.4 89 136.4Z',
        'M90.6 138.2C95 143.6 105 143.6 109.4 138.2C104 140 96 140 90.6 138.2Z', 100, 141) +
        `<path d="M87.8 135.4L89.4 136.6M112.2 135.4L110.6 136.6" ${stroke(line, 1.5)}/>`;
  }
}

function facialHair(c: Ctx): { under: string; over: string } {
  const { s, g } = c;
  const f = s.facial ?? 'none';
  if (f === 'none') return { under: '', over: '' };
  const col = s.beardColor ?? c.hc;
  const hl = mix(col, '#FFFFFF', lum(col) < 0.15 ? 0.3 : 0.35), dk = shade(col, 0.6);
  c.defs.push(lin(c.id('bd'), [[0, hl], [0.5, col], [1, dk]], '0 0 0.3 1'));
  const l = L(g), r = R(g), j = g.jaw, ch = g.chin;
  const outer = `M${n(l - 0.5)} 98C${n(l - 1)} 116 ${n(l + 3)} 130 ${n(100 - j - 4)} 139C${n(100 - j + 2)} 153 86 ${ch + 7} 100 ${ch + 8}C114 ${ch + 7} ${n(100 + j - 2)} 153 ${n(100 + j + 4)} 139C${n(r - 3)} 130 ${n(r + 1)} 116 ${n(r + 0.5)} 98`;
  const beard = `${outer}L${n(r - 6)} 106C${n(r - 7)} 114 ${n(r - 11)} 122 116 129C112 134 109 147 100 147.5C91 147 88 134 84 129C${n(l + 11)} 122 ${n(l + 7)} 114 ${n(l + 6)} 106Z`;
  const stache = 'M83 134C85.5 126.5 95 125 100 128.4C105 125 114.5 126.5 117 134C112.5 131.4 106 131 100 132.4C94 131 87.5 131.4 83 134Z';
  const stacheSvg = (op = 1) => `<path d="${stache}" fill="${c.u('bd')}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" opacity="${op}"/>` +
    `<path d="M88 129.6C92 128.2 96 128.6 99 130.4" ${stroke(hl, 1.1, `opacity="${0.6 * op}"`)}/>`;
  const strands = (n0: number) => {
    let t = '';
    for (let i = 0; i < n0; i++) {
      const x = 74 + c.rnd() * 52, y = 132 + c.rnd() * 22;
      t += `M${n(x)} ${n(y)}l${n((x - 100) * 0.05)} ${n(3 + c.rnd() * 2)}`;
    }
    return t;
  };
  switch (f) {
    case 'beard':
      return {
        under: `<path d="${beard}" fill="${c.u('bd')}"/><path d="${strands(26)}" ${stroke(hl, 1.1, 'opacity="0.55"')}/>` +
          `<path d="${outer}" ${stroke(INK, OUT)}/>`,
        over: stacheSvg(),
      };
    case 'stubble':
    {
      c.defs.push(`<clipPath id="${c.id('stb')}"><path d="${beard}"/><path d="${stache}"/></clipPath>`);
      const pts: Pt[] = [];
      for (let i = 0; i < 170; i++) pts.push([l + 2 + c.rnd() * (2 * g.w - 4), 97 + c.rnd() * 64]);
      return { under: `<path d="${beard}" fill="${col}" opacity="0.2"/><path d="${stache}" fill="${col}" opacity="0.18"/><g clip-path="${c.u('stb')}">${dots(pts, 0.5, col, 0.4)}</g>`, over: '' };
    }
    case 'goatee': {
      const gt = 'M86 145C88 159 112 159 114 145C109 149.6 91 149.6 86 145Z';
      return {
        under: `<path d="M84.5 132C83 138 84.6 143 87 146M115.5 132C117 138 115.4 143 113 146" ${stroke(INK, 5)}/><path d="M84.5 132C83 138 84.6 143 87 146M115.5 132C117 138 115.4 143 113 146" ${stroke(col, 3)}/>` +
          `<path d="${gt}" fill="${c.u('bd')}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
        over: stacheSvg(),
      };
    }
    case 'mustache':
      return { under: '', over: stacheSvg() };
  }
}

function aging(c: Ctx): string {
  const ex = c.s.extras ?? [];
  let out = '';
  const col = c.T.deep;
  if (ex.includes('wrinkles')) {
    out += `<path d="M84 71Q100 67 116 71M87 77Q100 74 113 77" ${stroke(col, 1.5, 'opacity="0.5"')}/>` +
      `<path d="M66.5 101L62.5 99.5M66.5 105L62.6 106M133.5 101L137.5 99.5M133.5 105L137.4 106" ${stroke(col, 1.3, 'opacity="0.55"')}/>` +
      `<path d="M71 112Q79 116 87 112.5M113 112.5Q121 116 129 112" ${stroke(col, 1.2, 'opacity="0.45"')}/>` +
      `<path d="M90 121Q84.5 127 84 135M110 121Q115.5 127 116 135" ${stroke(col, 1.7, 'opacity="0.45"')}/>`;
  }
  if (ex.includes('freckles')) {
    const pts: Pt[] = [];
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1;
      pts.push([100 + side * (8 + c.rnd() * 22), 110 + c.rnd() * 12]);
    }
    out += dots(pts, 1, c.T.deep, 0.55);
  }
  return out;
}

// ---------- hair ----------
interface HairParts { back: string; mid: string; shadow: string; front: string; fit: number }

function hair(c: Ctx): HairParts {
  const { s, g, rnd } = c;
  const l = L(g), r = R(g);
  const out: HairParts = { back: '', mid: '', shadow: '', front: '', fit: 1 };
  const hg = c.u('hg');
  const capClip = (k: string, hy: number, sb: number) => {
    c.defs.push(`<clipPath id="${c.id(k)}"><path d="${capD(g, hy, sb)}"/></clipPath>`);
    return c.u(k);
  };
  const volClip = (k: string, kx: number, ky: number) => {
    c.defs.push(`<clipPath id="${c.id(k)}"><path d="${volD(g, kx, ky)}"/></clipPath>`);
    return c.u(k);
  };
  /** Close-cropped hair on the skull: hair mass clipped to the hairline, with texture inside. */
  const cap = (hy: number, sb: number, kx: number, ky: number, fill: string, texture = '', strokeIt = true) => {
    const cc = capClip('cap', hy, sb);
    const vc = volClip('vol', kx, ky);
    out.shadow += `<g transform="translate(1 4.5)"><path d="${capD(g, hy, sb)}" fill="${c.T.deep}" opacity="0.42"/></g>`;
    return `<g clip-path="${cc}"><path d="${volD(g, kx, ky)}" fill="${fill}"/>` +
      (texture ? `<g clip-path="${vc}">${texture}</g>` : '') +
      (strokeIt ? `<path d="${volD(g, kx, ky)}" fill="none" stroke="${INK}" stroke-width="${OUT}" stroke-linejoin="round"/>` : '') +
      `</g>`;
  };
  const sheenArc = (d: string, w = 4.5, op = 0.55) => `<path d="${d}" ${stroke(c.sheen, w, `opacity="${op}"`)}/>`;
  /** Soft faded sides (fades, mohawks, undercuts): hair darkening the skin, thinning toward the ears. */
  const fadeSides = (hy: number, strength: number) => {
    c.defs.push(lin(c.id('fd'), [[0, c.hc, 0.95 * strength], [0.45, c.hc, 0.75 * strength], [1, c.hc, 0.12 * strength]], '0 62 0 112', 'gradientUnits="userSpaceOnUse"'));
    out.shadow += `<path d="${capD(g, hy, 112)}" fill="${c.u('fd')}"/>`;
    c.defs.push(`<clipPath id="${c.id('fdc')}"><path d="${capD(g, hy, 112)}"/></clipPath>`);
    // speckle so it reads as hair, not paint
    const pts: Pt[] = [];
    for (let i = 0; i < 26; i++) pts.push([100 + (i % 2 ? 1 : -1) * (g.w - 1 - rnd() * 8), 76 + rnd() * 34]);
    out.shadow += `<g clip-path="${c.u('fdc')}">${dots(pts, 0.7, c.hd, n(0.6 * strength))}</g>`;
  };
  const fluffTexture = (cx: number, cy: number, rx: number, ry: number, count: number) => {
    let lt = '', dk = '';
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd());
      const x = cx + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * rr;
      const d = `M${n(x - 3)} ${n(y)}q3 -3.5 6 0`;
      if (y < cy - ry * 0.2 && x < cx + rx * 0.2) lt += d; else dk += d;
    }
    return (dk ? `<path d="${dk}" ${stroke(c.hd, 1.5, 'opacity="0.55"')}/>` : '') + (lt ? `<path d="${lt}" ${stroke(c.hl, 1.5, 'opacity="0.7"')}/>` : '');
  };
  /** Blobs that merge into one outlined mass: one ink silhouette underneath, then each blob shaded on top. */
  const unionCircles = (cs: [number, number, number][], fill: string, w = OUT) =>
    `<path d="${cs.map(([x, y, rr]) => `M${n(x - rr)} ${n(y)}a${rr} ${rr} 0 1 0 ${n(rr * 2)} 0a${rr} ${rr} 0 1 0 ${n(-rr * 2)} 0Z`).join('')}" fill="${INK}" stroke="${INK}" stroke-width="${w * 2}" stroke-linejoin="round"/>` +
    cs.map(([x, y, rr]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rr)}" fill="${fill}"/>`).join('');
  const rope = (d: string, w: number, col: string, tex = true) =>
    `<path d="${d}" ${stroke(INK, w + 3.4)}/><path d="${d}" ${stroke(col, w)}/>` +
    (tex ? `<path d="${d}" ${stroke(c.hd, w, 'stroke-dasharray="1.3 3" opacity="0.55"')}/>` : '') +
    `<path d="${d}" ${stroke(c.sheen, w * 0.22, 'opacity="0.45" transform="translate(-1 0)"')}/>`;

  switch (s.hair) {
    case 'bald': {
      const sh = glow(c, 'bh', '#FFFFFF', 0.6);
      out.shadow += `<ellipse cx="84" cy="58" rx="22" ry="12" fill="${sh}" transform="rotate(-18 84 58)"/>` +
        `<ellipse cx="80" cy="54" rx="7" ry="3.4" fill="#FFFFFF" opacity="0.5" transform="rotate(-22 80 54)"/>`;
      break;
    }
    case 'buzz': {
      const pts: Pt[] = [];
      for (let i = 0; i < 40; i++) pts.push([60 + rnd() * 80, 38 + rnd() * 50]);
      out.front += cap(61, 108, 1.6, 2, hg, dots(pts, 0.8, c.hl, 0.45) + sheenArc(`M${n(l + 10)} 72C70 52 86 44 104 44`, 5, 0.4));
      break;
    }
    case 'fade': {
      fadeSides(60, 1);
      const cc = capClip('ftop', 60, 80), vc = volClip('fvol', 0.8, 7);
      let cd = '', cl = '';
      for (let i = 0; i < 34; i++) {
        const x = 62 + rnd() * 76, y = 34 + rnd() * 34;
        if (i % 3) cd += `M${n(x - 2.5)} ${n(y)}q2.5 -3 5 0`; else cl += `M${n(x - 2.5)} ${n(y)}q2.5 -3 5 0`;
      }
      const curls = `<path d="${cd}" ${stroke(c.hd, 1.3, 'opacity="0.6"')}/><path d="${cl}" ${stroke(c.hl, 1.3, 'opacity="0.6"')}/>`;
      out.front += `<g clip-path="${cc}"><path d="${volD(g, 0.8, 7)}" fill="${hg}"/><g clip-path="${vc}">${curls}${sheenArc(`M${n(l + 12)} 66C72 46 88 38 106 38`, 5, 0.45)}</g>` +
        `<path d="${volD(g, 0.8, 7)}" fill="none" stroke="${INK}" stroke-width="${OUT}"/></g>`;
      if (s.part) out.front += `<path d="M${n(l + 14)} 70C74 56 80 48 87 42" ${stroke(mix(c.T.base, '#FFFFFF', 0.25), 1.8)}/>`;
      break;
    }
    case 'waves': {
      let ad = '', al = '';
      for (let i = 0; i < 10; i++) {
        const rr = 14 + i * 7.5;
        const d = `M${n(100 - rr)} ${n(24 + rr * 0.15)}Q100 ${n(24 + rr * 1.25)} ${n(100 + rr)} ${n(24 + rr * 0.15)}`;
        if (i % 2) ad += d; else al += d;
      }
      const arcs = `<path d="${ad}" ${stroke(c.hd, 2.4, 'opacity="0.6"')}/><path d="${al}" ${stroke(c.sheen, 2.4, 'opacity="0.5"')}/>`;
      out.front += cap(60, 110, 1.8, 2.5, hg, arcs);
      break;
    }
    case 'cornrows':
    case 'braids': {
      let d = '';
      for (const dx of [-34, -22, -11, 0, 11, 22, 34]) {
        const x0 = 100 + dx * (g.w / 46), y0 = 64 + Math.abs(dx) * 0.22;
        d += `M${n(x0)} ${n(y0)}C${n(100 + dx * 0.95)} 46 ${n(100 + dx * 0.7)} 34 ${n(100 + dx * 0.45)} 20`;
      }
      const rows = `<path d="${d}" ${stroke(mix(c.T.base, c.T.light, 0.5), 9.2)}/><path d="${d}" ${stroke(c.hc, 7.4)}/>` +
        `<path d="${d}" ${stroke(c.hd, 7.4, 'stroke-dasharray="1.6 2.4" opacity="0.7"')}/>` +
        `<path d="${d}" ${stroke(c.sheen, 1.6, 'opacity="0.5" transform="translate(-1.2 0)"')}/>`;
      out.front += cap(61, 106, 1.6, 2.4, c.hd, rows);
      if (s.hair === 'braids') {
        let inks = '', beads = '', shine = '';
        for (const side of [-1, 1]) {
          for (let k = 0; k < 3; k++) {
            const x0 = 100 + side * (g.w - 6 - k * 6);
            const pts: Pt[] = [[x0, 70], [100 + side * (g.w + 8 + k * 3), 100], [100 + side * (g.w + 4 + k * 5), 140], [100 + side * (g.w - 2 + k * 6), 182 - k * 4]];
            for (let t = 0.32; t <= 1.001; t += 0.085) {
              const [x, y] = bez(pts, t);
              const rot = side * (Math.round(t * 12) % 2 ? 28 : -28);
              inks += ellD(x, y, 7, 5.4, rot + 90);
              beads += ellD(x, y, 5.2, 3.6, rot + 90);
              shine += `M${n(x - 1.6)} ${n(y - 2.4)}l1.4 -1`;
            }
          }
        }
        out.mid += `<path d="${inks}" fill="${INK}"/><path d="${beads}" fill="${hg}"/><path d="${shine}" ${stroke(c.sheen, 1.4, 'opacity="0.6"')}/>`;
      }
      break;
    }
    case 'hightop': {
      out.fit = 0.87;
      fadeSides(61, 0.85);
      c.defs.push(lin(c.id('ht'), [[0, c.hl], [0.25, c.hc], [1, c.hd]], '0 0 0 1'));
      const box = `M${n(l + 4)} 84C${n(l + 1)} 62 ${n(l + 2)} 30 ${n(l + 6)} 6L${n(r - 6)} 6C${n(r - 2)} 30 ${n(r - 1)} 62 ${n(r - 4)} 84Z`;
      const cc = capClip('htc', 61, 84);
      let ld = '';
      for (let x = l + 12; x < r - 8; x += 7) ld += `M${n(x)} 12L${n(x + 1)} 70`;
      const lines = `<path d="${ld}" ${stroke(c.hd, 1.4, 'opacity="0.35"')}/>`;
      out.front += `<g clip-path="${cc}"><path d="${box}" fill="${c.u('ht')}"/>${lines}` +
        `<path d="M${n(l + 7)} 7.5L${n(r - 7)} 7.5L${n(r - 9)} 14L${n(l + 9)} 14Z" fill="${c.sheen}" opacity="0.45"/>` +
        sheenArc(`M${n(l + 10)} 22L${n(l + 11)} 56`, 5, 0.4) +
        `<path d="${box}" fill="none" stroke="${INK}" stroke-width="${OUT}" stroke-linejoin="round"/></g>`;
      break;
    }
    case 'afro': {
      out.fit = 0.82;
      c.defs.push(rad(c.id('af'), [[0, c.hl], [0.5, c.hc], [1, c.hd]], 'gradientUnits="userSpaceOnUse" cx="82" cy="40" r="86"'));
      const cx = 100, cy = 70, rx = g.w + 28, ry = 64;
      const shape = fluffD(cx, cy, rx, ry, 22, 0.09, rnd);
      out.back += `<path d="${shape}" fill="${c.u('af')}" stroke="${INK}" stroke-width="${OUT}" stroke-linejoin="round"/>` +
        fluffTexture(cx, cy - 10, rx - 8, ry - 12, 46);
      const cc = capClip('afc', 60, 104);
      out.shadow += `<g transform="translate(1 4)"><path d="${capD(g, 60, 104)}" fill="${c.T.deep}" opacity="0.42"/></g>`;
      let edge = '';
      for (let i = 0; i <= 8; i++) {
        const t = i / 8, x = l + 12 + t * (2 * g.w - 24), y = 62 + Math.pow(Math.abs(t - 0.5) * 2, 2) * 13;
        edge += `<circle cx="${n(x)}" cy="${n(y)}" r="4.6" fill="${c.u('af')}"/>`;
      }
      out.front += `<g clip-path="${cc}"><path d="${volD(g, 3, 3)}" fill="${c.u('af')}"/></g>${edge}` +
        `<g clip-path="${c.u('h')}">${fluffTexture(100, 52, 34, 10, 10)}</g>`;
      break;
    }
    case 'puffs': {
      out.fit = 0.9;
      c.defs.push(rad(c.id('pf'), [[0, c.hl], [0.55, c.hc], [1, c.hd]], 'cx="0.38" cy="0.32" r="0.7"'));
      for (const side of [-1, 1]) {
        const cx = 100 + side * (g.w + 2), cy = 38;
        out.back += `<path d="${fluffD(cx, cy, 25, 24, 14, 0.12, rnd)}" fill="${c.u('pf')}" stroke="${INK}" stroke-width="${OUT}" stroke-linejoin="round"/>` +
          fluffTexture(cx, cy, 17, 16, 12);
      }
      let lines = '';
      for (const side of [-1, 1]) for (let k = 0; k < 4; k++) {
        lines += `<path d="M${n(100 + side * 2)} ${n(44 + k * 6)}Q${n(100 + side * 22)} ${n(42 + k * 4)} ${n(100 + side * (g.w - 2))} ${n(40 + k * 2)}" ${stroke(k % 2 ? c.hd : c.sheen, 1.6, 'opacity="0.5"')}/>`;
      }
      out.front += cap(61, 106, 1.8, 2.5, hg, lines + `<path d="M100 40L100 62" ${stroke(mix(c.T.base, c.T.light, 0.5), 1.8)}/>`);
      for (const side of [-1, 1]) {
        const tx = n(100 + side * (g.w - 4));
        out.front += `<ellipse cx="${tx}" cy="50" rx="7.5" ry="3.2" fill="${s.band ?? s.jersey[1]}" stroke="${INK}" stroke-width="2" transform="rotate(${side * 40} ${tx} 50)"/>`;
      }
      break;
    }
    case 'curly': {
      out.fit = 0.95;
      c.defs.push(rad(c.id('cu'), [[0, c.hl], [0.55, c.hc], [1, c.hd]], 'cx="0.36" cy="0.3" r="0.75"'));
      const circles: [number, number, number][] = [];
      const ring = (cy0: number, rr: number, a0: number, a1: number, k: number, rad0: number) => {
        for (let i = 0; i < k; i++) {
          const a = (a0 + ((a1 - a0) * i) / (k - 1)) * (Math.PI / 180);
          circles.push([100 + Math.cos(a) * rr * (g.w / 46), cy0 + Math.sin(a) * rr * 0.92, rad0 + (rnd() - 0.5) * 2]);
        }
      };
      ring(86, 50, 186, 354, 11, 12.5);
      ring(84, 36, 205, 335, 7, 12);
      for (let i = 0; i < 6; i++) circles.push([l + 15 + i * ((2 * g.w - 30) / 5), 66 + (i % 2) * 2, 9 + rnd() * 1.5]);
      const cc = capClip('cuc', 66, 100);
      out.shadow += `<g transform="translate(1 5)"><path d="${capD(g, 66, 100)}" fill="${c.T.deep}" opacity="0.4"/></g>`;
      out.front += `<g clip-path="${cc}"><path d="${volD(g, 1, 1)}" fill="${c.hd}"/></g>` + unionCircles(circles, c.u('cu'));
      let spirals = '';
      for (let i = 0; i < 14; i++) {
        const [x, y] = circles[(i * 5) % circles.length];
        spirals += `M${n(x - 3)} ${n(y + 1)}q1 -4 4.5 -2.6q2.6 1.4 0.6 4`;
      }
      out.front += `<path d="${spirals}" ${stroke(c.hd, 1.3, 'opacity="0.65"')}/>`;
      break;
    }
    case 'locs':
    case 'twists': {
      const tipCol = s.tips;
      if (s.hair === 'twists') {
        out.fit = 0.93;
        out.front += cap(62, 106, 1.5, 2, c.hd);
        const twist = (ang: number, dist: number, len: number, bend: number, w: number) => {
          const a = ang * (Math.PI / 180);
          const bx = 100 + Math.sin(a) * dist * (g.w / 46), by = 84 - Math.cos(a) * dist * 0.95;
          const dx = Math.sin(a), dy = -Math.cos(a);
          const pts: Pt[] = [[bx, by], [bx + dx * len * 0.4, by + dy * len * 0.4], [bx + dx * len * 0.8 - dy * bend, by + dy * len * 0.8 + dx * bend], [bx + dx * len - dy * bend * 1.6, by + dy * len + dx * bend * 1.6]];
          return [cub(pts), tail(pts, 0.86)];
        };
        const row = (list: string[][], w: number) =>
          rope(list.map((x) => x[0]).join(''), w, c.hc) + (tipCol ? `<path d="${list.map((x) => x[1]).join('')}" ${stroke(mix(tipCol, c.hc, 0.25), w * 0.8)}/>` : '');
        out.front += row([-36, -18, 0, 18, 36].map((a, i) => twist(a, 26, 26, i % 2 ? 2 : -2, 8)), 8) +
          row([-72, -54, -27, -9, 9, 27, 54, 72].map((a) => twist(a, 38, 22 - Math.abs(a) / 12, a < 0 ? -3 : 3, 8)), 8) +
          row([-48, -16, 16, 48].map((a) => twist(a, 44, 12, a < 0 ? -5 : 5, 7.4)), 7.4);
      } else {
        out.front += cap(60, 106, 2, 3, hg,
          [-30, -18, -6, 6, 18, 30].map((dx) => `<path d="M${100 + dx} 62C${n(100 + dx * 0.9)} 50 ${n(100 + dx * 0.6)} 40 ${n(100 + dx * 0.3)} 32" ${stroke(c.hd, 1.6, 'opacity="0.6"')}/>`).join(''));
        const tipRope = (list: Pt[][], w: number) => rope(list.map(cub).join(''), w, c.hc) +
          (tipCol ? `<path d="${list.map((pts) => tail(pts, 0.84)).join('')}" ${stroke(tipCol, w * 0.8)}/>` : '');
        const back: Pt[][] = [], front: Pt[][] = [];
        for (const side of [-1, 1]) {
          for (let k = 0; k < 4; k++) {
            back.push([[100 + side * (g.w - 14 + k * 3), 60], [100 + side * (g.w + 6 + k * 3), 86], [100 + side * (g.w + 2 + k * 5), 130], [100 + side * (g.w - 6 + k * 9), 178 - k * 7]]);
          }
          for (let k = 0; k < 3; k++) {
            const x0 = 100 + side * (6 + k * 10);
            front.push([[x0, 44 + k * 3], [100 + side * (g.w - 4 + k * 2), 40 + k * 4], [100 + side * (g.w + 9 + k * 2), 92 + k * 6], [100 + side * (g.w + 6 + k * 3), 150 + k * 6]]);
          }
        }
        out.mid += tipRope(back, 7);
        out.front += tipRope(front.filter((_, i) => i % 3 !== 0), 6.8) + tipRope(front.filter((_, i) => i % 3 === 0), 6.8);
      }
      break;
    }
    case 'mohawk': {
      out.fit = 0.88;
      fadeSides(60, 0.55);
      const fin = 'M87 74C85 54 84 32 89 10L95.5 20L100 2L104.5 20L111 10C116 32 115 54 113 74Z';
      const cc = capClip('mhc', 60, 84);
      out.front += `<g clip-path="${cc}"><path d="${fin}" fill="${hg}"/>` +
        `<path d="M93 70C92 52 92 36 94 24M100 70L100 18M107 70C108 52 108 36 106 24" ${stroke(c.hd, 1.5, 'opacity="0.5"')}/>` +
        (s.tips ? `<path d="M89 10L95.5 20L100 2L104.5 20L111 10C112 16 113 22 113.4 28L86.6 28C87 22 88 16 89 10Z" fill="${s.tips}"/>` : '') +
        sheenArc('M92 64C90 50 90 36 92 26', 3.5, 0.6) +
        `<path d="${fin}" fill="none" stroke="${INK}" stroke-width="${OUT}" stroke-linejoin="round"/></g>`;
      break;
    }
    case 'bun':
    case 'manbun': {
      const big = s.hair === 'bun';
      out.fit = big ? 0.92 : 0.96;
      const br = big ? 17 : 12.5, by = big ? 28 : 34;
      c.defs.push(rad(c.id('bn'), [[0, c.hl], [0.55, c.hc], [1, c.hd]], 'cx="0.38" cy="0.3" r="0.75"'));
      out.back += `<circle cx="100" cy="${by}" r="${br}" fill="${c.u('bn')}" stroke="${INK}" stroke-width="${OUT}"/>` +
        `<path d="M${100 - br * 0.6} ${by - br * 0.1}Q100 ${by - br * 0.9} ${100 + br * 0.6} ${by - br * 0.2}M${100 - br * 0.7} ${by + br * 0.35}Q100 ${by - br * 0.3} ${100 + br * 0.75} ${by + br * 0.3}" ${stroke(c.hd, 1.5, 'opacity="0.6"')}/>` +
        `<path d="M${n(100 - br * 0.5)} ${n(by - br * 0.55)}Q${100 - br * 0.1} ${n(by - br * 0.85)} ${n(100 + br * 0.25)} ${n(by - br * 0.75)}" ${stroke(c.sheen, 2.6, 'opacity="0.6"')}/>`;
      let lines = '';
      for (let i = -3; i <= 3; i++) {
        lines += `<path d="M${n(100 + i * 12 * (g.w / 46))} ${n(66 + Math.abs(i) * 2.5)}Q${n(100 + i * 9)} 48 ${n(100 + i * 2.2)} ${by + 10}" ${stroke(i % 2 ? c.hd : c.sheen, i % 2 ? 1.4 : 2, `opacity="${i % 2 ? 0.55 : 0.5}"`)}/>`;
      }
      if (big) out.front += cap(61, 108, 1.4, 2, hg, lines);
      else {
        fadeSides(61, 0.85);
        const cc = capClip('mbc', 61, 84);
        const vc = volClip('mbv', 2, 4);
        out.front += `<g clip-path="${cc}"><path d="${volD(g, 2, 4)}" fill="${hg}"/><g clip-path="${vc}">${lines}</g>` +
          `<path d="${volD(g, 2, 4)}" fill="none" stroke="${INK}" stroke-width="${OUT}"/></g>`;
      }
      out.front += `<ellipse cx="100" cy="${by + br - 1}" rx="${n(br * 0.55)}" ry="2.6" fill="${s.band ?? s.jersey[1]}" stroke="${INK}" stroke-width="1.6"/>`;
      break;
    }
    case 'ponytail': {
      const tie = s.band ?? (lum(s.jersey[0]) > 0.15 ? s.jersey[0] : s.jersey[1]);
      const tail = `M${n(r - 12)} 46C${n(r + 22)} 44 ${n(r + 34)} 92 ${n(r + 22)} 140C${n(r + 17)} 158 ${n(r + 8)} 170 ${n(r + 2)} 178C${n(r + 9)} 150 ${n(r + 10)} 110 ${n(r - 6)} 70Z`;
      out.back += `<path d="${tail}" fill="${hg}" stroke="${INK}" stroke-width="${OUT}" stroke-linejoin="round"/>` +
        `<path d="M${n(r + 2)} 58C${n(r + 20)} 72 ${n(r + 24)} 106 ${n(r + 16)} 140" ${stroke(c.sheen, 3, 'opacity="0.55"')}/>` +
        `<path d="M${n(r + 8)} 62C${n(r + 24)} 86 ${n(r + 26)} 118 ${n(r + 12)} 160" ${stroke(c.hd, 1.5, 'opacity="0.55"')}/>` +
        `<ellipse cx="${n(r + 2)}" cy="54" rx="3.6" ry="8.5" fill="${tie}" stroke="${INK}" stroke-width="2.2" transform="rotate(-38 ${n(r + 2)} 54)"/>`;
      let lines = '';
      for (let i = 0; i < 6; i++) {
        lines += `<path d="M${n(l + 8 + i * 4)} ${n(80 - i * 3)}Q${n(84 + i * 6)} ${n(54 - i * 2)} ${n(r - 8)} 46" ${stroke(i % 2 ? c.hd : c.sheen, 1.6, 'opacity="0.5"')}/>`;
      }
      out.front += cap(61, 106, 1.6, 2.4, hg, lines);

      break;
    }
    case 'long': {
      const panel = (side: number) => {
        const X = (dx: number) => n(100 + side * dx);
        return `M${X(g.w - 18)} 60C${X(g.w + 10)} 64 ${X(g.w + 12)} 110 ${X(g.w + 14)} 150C${X(g.w + 15)} 170 ${X(g.w + 10)} 186 ${X(g.w + 6)} 196C${X(g.w - 4)} 186 ${X(g.w - 10)} 176 ${X(g.w - 14)} 166L${X(g.w - 16)} 110Z`;
      };
      out.back += `<path d="M${n(l - 6)} 80C${n(l - 10)} 130 ${n(l - 6)} 170 ${n(l - 2)} 196L${n(r + 2)} 196C${n(r + 6)} 170 ${n(r + 10)} 130 ${n(r + 6)} 80Z" fill="${c.hd}" stroke="${INK}" stroke-width="${OUT}"/>`;
      for (const side of [-1, 1]) {
        out.mid += `<path d="${panel(side)}" fill="${hg}" stroke="${INK}" stroke-width="${OUT}" stroke-linejoin="round"/>` +
          `<path d="M${n(100 + side * (g.w + 2))} 84C${n(100 + side * (g.w + 6))} 116 ${n(100 + side * (g.w + 8))} 150 ${n(100 + side * (g.w + 4))} 180" ${stroke(c.sheen, 3, 'opacity="0.5"')}/>` +
          `<path d="M${n(100 + side * (g.w + 8))} 96C${n(100 + side * (g.w + 11))} 130 ${n(100 + side * (g.w + 11))} 160 ${n(100 + side * (g.w + 8))} 186" ${stroke(c.hd, 1.5, 'opacity="0.6"')}/>`;
      }
      let lines = '';
      for (let i = 0; i < 7; i++) lines += `<path d="M${n(108 - i)} 42Q${n(80 - i * 2)} ${n(50 + i * 3)} ${n(l + 4)} ${n(84 + i * 3)}" ${stroke(i % 2 ? c.hd : c.sheen, 1.6, 'opacity="0.5"')}/>`;
      for (let i = 0; i < 4; i++) lines += `<path d="M${n(110 + i)} 42Q${n(124 + i * 3)} ${n(50 + i * 3)} ${n(r - 3)} ${n(80 + i * 3)}" ${stroke(i % 2 ? c.hd : c.sheen, 1.6, 'opacity="0.5"')}/>`;
      out.front += cap(58, 108, 3, 4, hg, lines);
      const swoop = `M110 40C94 46 78 58 ${n(l + 4)} 96C${n(l + 2)} 84 ${n(l + 4)} 72 ${n(l + 12)} 62C82 50 96 44 110 40Z`;
      out.front += `<path d="${swoop}" fill="${hg}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>` +
        `<path d="M104 44C90 50 78 60 ${n(l + 8)} 80" ${stroke(c.sheen, 2.6, 'opacity="0.6"')}/>`;
      break;
    }
    case 'boxbraids': {
      let parts = '';
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          parts += `<path d="M${n(100 + side * 1.5)} ${44 + i * 2}Q${n(100 + side * (14 + i * 6))} ${n(46 + i * 4)} ${n(100 + side * (g.w - 2))} ${n(60 + i * 9)}" ${stroke(c.hd, 1.4, 'opacity="0.7"')}/>`;
        }
      }
      out.front += cap(61, 106, 2, 3, hg, parts + `<path d="M100 38L100 62" ${stroke(mix(c.T.base, c.T.light, 0.4), 2)}/>`);
      // alternate braids go in two passes so neighbours keep an outline between them
      const mid: string[] = ['', ''], front: string[] = ['', ''];
      for (const side of [-1, 1]) {
        for (let k = 0; k < 5; k++) {
          mid[k % 2] += cub([[100 + side * (g.w - 18 + k * 3), 58], [100 + side * (g.w + 4 + k * 3), 80], [100 + side * (g.w + 6 + k * 3), 130], [100 + side * (g.w + 2 + k * 5), 196]]);
        }
        for (let k = 0; k < 3; k++) {
          front[k % 2] += cub([[100 + side * (g.w - 10 + k * 3), 62 + k * 4], [100 + side * (g.w + 4 + k * 2), 74 + k * 4], [100 + side * (g.w + 2 + k * 2), 124], [100 + side * (g.w - 6 + k * 4), 190]]);
        }
      }
      out.mid += rope(mid[0], 5.2, c.hc) + rope(mid[1], 5.2, c.hc);
      out.front += rope(front[0], 5.2, c.hc) + rope(front[1], 5.2, c.hc);
      break;
    }
    case 'slick': {
      // side part on the left, a combed quiff sweeping up and over to the right
      const hl = `M4 108L${n(l + 6)} 108L${n(l + 7)} 92C${n(l + 8)} 85 ${n(l + 10)} 80 ${n(l + 14)} 77C${n(l + 18)} 68 73 61 79 59` +
        `C92 55 ${n(r - 26)} 58 ${n(r - 14)} 76C${n(r - 10)} 80 ${n(r - 8)} 85 ${n(r - 7)} 92L${n(r - 6)} 108L196 108L196 -30L4 -30Z`;
      c.defs.push(`<clipPath id="${c.id('slc')}"><path d="${hl}"/></clipPath>`);
      const vc = volClip('slv', 2.6, 8);
      out.shadow += `<g transform="translate(1 4.5)"><path d="${hl}" fill="${c.T.deep}" opacity="0.42"/></g>`;
      let lines = `<path d="M${n(l + 10)} 70C70 46 100 36 ${n(r - 4)} 54" ${stroke(c.sheen, 8, 'opacity="0.28"')}/>`;
      for (let i = 0; i < 5; i++) {
        lines += `<path d="M${n(82 + i * 3)} ${n(58 - i * 4.5)}C${n(98 + i * 2)} ${n(46 - i * 3)} ${n(r - 18)} ${n(44 - i * 2)} ${n(r + 2)} ${n(62 - i * 4)}" ${stroke(c.hd, 1.3, 'opacity="0.55"')}/>`;
      }
      for (let i = 0; i < 3; i++) lines += `<path d="M${n(77 - i * 1.5)} ${n(56 - i * 5)}C${n(70 - i * 3)} ${n(60 - i * 3)} ${n(l + 6)} ${n(70 - i * 2)} ${n(l - 2)} ${n(84 - i * 4)}" ${stroke(c.hd, 1.3, 'opacity="0.5"')}/>`;
      out.front += `<g clip-path="${c.u('slc')}"><path d="${volD(g, 2.6, 8)}" fill="${hg}"/><g clip-path="${vc}">${lines}</g>` +
        `<path d="${volD(g, 2.6, 8)}" fill="none" stroke="${INK}" stroke-width="${OUT}" stroke-linejoin="round"/></g>`;
      const lock = `M79 60C86 46 104 38 ${n(r - 10)} 44C${n(r - 2)} 48 ${n(r + 1)} 56 ${n(r - 1)} 64C${n(r - 6)} 56 ${n(r - 16)} 52 100 53C92 54 85 57 79 60Z`;
      out.front += `<path d="${lock}" fill="${hg}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>` +
        `<path d="M86 52C96 44 110 42 ${n(r - 10)} 48" ${stroke(c.sheen, 2.6, 'opacity="0.65"')}/>` +
        `<path d="M79.5 59C78 52 78.5 46 80.5 40" ${stroke(mix(c.T.base, c.T.light, 0.4), 1.5, 'opacity="0.85"')}/>`;
      break;
    }
  }
  return out;
}

// ---------- extras over the face ----------
function headwear(c: Ctx): string {
  const { s, g } = c;
  const ex = s.extras ?? [];
  const l = L(g), r = R(g);
  let out = '';
  if (ex.includes('headband')) {
    const col = s.band ?? (lum(s.jersey[1]) < 0.25 ? '#FFFFFF' : s.jersey[1]);
    c.defs.push(lin(c.id('hb'), [[0, mix(col, '#FFFFFF', 0.45)], [0.5, col], [1, shade(col, 0.72)]]));
    const band = `M${n(l - 3.5)} 79C${n(l + 8)} 56 ${n(r - 8)} 56 ${n(r + 3.5)} 79L${n(r + 3)} 93C${n(r - 8)} 71 ${n(l + 8)} 71 ${n(l - 3)} 93Z`;
    out += `<path d="${band}" fill="${c.u('hb')}" stroke="${INK}" stroke-width="${OUT * 0.85}" stroke-linejoin="round"/>` +
      `<path d="M${n(l + 2)} 76C${n(l + 12)} 61 ${n(r - 12)} 61 ${n(r - 2)} 76" ${stroke('#FFFFFF', 2.2, 'opacity="0.55"')}/>` +
      `<path d="M${n(l + 1)} 85.5C${n(l + 10)} 68 ${n(r - 10)} 68 ${n(r - 1)} 85.5" ${stroke(shade(col, 0.6), 1.2, 'stroke-dasharray="2 2.4" opacity="0.6"')}/>`;
  }
  if (ex.includes('goggles')) {
    c.defs.push(lin(c.id('gl'), [[0, '#CFF3FF', 0.5], [1, '#5FB4E8', 0.32]], '0 0 1 1'));
    const lens = (cx: number) => `M${cx - 14} 95C${cx - 14} 91 ${cx - 11} 89.5 ${cx - 6} 89.5L${cx + 6} 89.5C${cx + 11} 89.5 ${cx + 14} 91 ${cx + 14} 95L${cx + 14} 110C${cx + 14} 115 ${cx + 10} 117 ${cx + 5} 117L${cx - 5} 117C${cx - 10} 117 ${cx - 14} 115 ${cx - 14} 110Z`;
    out += `<path d="M${n(l - 3)} 99L${n(l + 8)} 100M${n(r + 3)} 99L${n(r - 8)} 100" ${stroke(INK, 9)}/><path d="M${n(l - 3)} 99L${n(l + 8)} 100M${n(r + 3)} 99L${n(r - 8)} 100" ${stroke('#2C2F3A', 5.5)}/>`;
    for (const cx of [79, 121]) {
      out += `<path d="${lens(cx)}" fill="${c.u('gl')}"/><path d="${lens(cx)}" ${stroke(INK, 7)}/><path d="${lens(cx)}" ${stroke('#3A3E4C', 3.6)}/>` +
        `<path d="M${cx - 9} 108L${cx + 2} 93M${cx - 4} 111L${cx + 7} 96" ${stroke('#FFFFFF', 2.2, 'opacity="0.6"')}/>`;
    }
    out += `<path d="M93 99Q100 95 107 99" ${stroke(INK, 6)}/><path d="M93 99Q100 95 107 99" ${stroke('#3A3E4C', 3)}/>`;
  }
  return out;
}

function ballSvg(c: Ctx, side: 'left' | 'right'): string {
  const cx = side === 'left' ? 34 : 166, cy = 174, r = 27;
  c.defs.push(rad(c.id('ba'), [[0, '#FFB070'], [0.55, '#EE7A2E'], [1, '#B04716']], 'cx="0.36" cy="0.3" r="0.8"'));
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.u('ba')}" stroke="${INK}" stroke-width="${OUT}"/>` +
    `<path d="M${cx - r} ${cy}L${cx + r} ${cy}M${cx} ${cy - r}L${cx} ${cy + r}M${cx - 18} ${cy - 20}Q${cx - 5} ${cy} ${cx - 18} ${cy + 20}M${cx + 18} ${cy - 20}Q${cx + 5} ${cy} ${cx + 18} ${cy + 20}" ${stroke(INK, 2.2)}/>` +
    `<ellipse cx="${cx - 9}" cy="${cy - 12}" rx="8" ry="4.5" fill="#FFFFFF" opacity="0.45" transform="rotate(-30 ${cx - 9} ${cy - 12})"/>`;
}

/** `uid` seeds the art (same avatar, same face everywhere); `instance` keeps SVG ids unique on the page. */
export function portraitSvg(s: PortraitSpec, uid: string, instance = ''): string {
  const id = (k: string) => `${k}-${uid}${instance}`;
  const hc = s.hairColor;
  const dark = lum(hc) < 0.12;
  const c: Ctx = {
    s,
    g: { w: 46 * (s.width ?? 1), jaw: (s.fem ? 30 : 34) * (s.jaw ?? 1) * Math.min(1.04, s.width ?? 1), chin: s.fem ? 150 : 152, top: 40 },
    T: TONES[s.skin],
    id,
    u: (k) => `url(#${id(k)})`,
    defs: [],
    rnd: rng(uid),
    hc,
    hl: dark ? mix(hc, '#7C8AA6', 0.42) : mix(hc, '#FFFFFF', 0.32),
    hd: dark ? mix(hc, '#000000', 0.4) : shade(hc, 0.58),
    sheen: dark ? '#8C9AB8' : mix(hc, '#FFFFFF', 0.62),
    rim: mix(s.bg[0], '#FFFFFF', 0.55),
  };
  c.defs.push(lin(id('hg'), [[0, c.hl], [0.42, hc], [1, c.hd]], '0.2 0 0.6 1'));
  const iris = s.eyes ?? '#5A3420';
  c.defs.push(rad(id('ir'), [[0, mix(iris, '#FFFFFF', 0.35)], [0.55, iris], [0.85, shade(iris, 0.55)], [1, shade(iris, 0.35)]], 'cx="0.5" cy="0.62" r="0.55"'));
  c.defs.push(rad(id('ew'), [[0, '#FFFFFF'], [0.7, '#F4F1F0'], [1, '#CFC6CC']], 'cx="0.45" cy="0.6" r="0.6"'));

  const bg = background(c);
  const hp = hair(c);
  const body = torso(c);
  const earSvg = ears(c);
  const fh = facialHair(c);
  const p = eyeParams(s);
  const face = aging(c) + nose(c) + fh.under + mouth(c) + fh.over + eye(c, -1, p, 'el') + eye(c, 1, p, 'eR') + brows(c);
  const skin = headSkin(c, hp.shadow);
  const wear = headwear(c);
  const ball = s.ball ? ballSvg(c, s.ball) : '';
  const fit = `translate(100 166) scale(0.86) translate(-100 -166)` + (hp.fit === 1 ? '' : ` translate(100 200) scale(${hp.fit}) translate(-100 -200)`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">` +
    `<defs>${c.defs.join('')}<clipPath id="${id('c')}"><circle cx="100" cy="100" r="100"/></clipPath></defs>` +
    `<g clip-path="${c.u('c')}">${bg}` +
    `<g transform="${fit}">${hp.back}${body}${hp.mid}${earSvg}${skin}${face}${hp.front}${wear}</g>` +
    `${ball}</g>` +
    `<circle cx="100" cy="100" r="98.3" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="3.4"/>` +
    `</svg>`;
}
