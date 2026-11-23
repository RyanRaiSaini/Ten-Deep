/**
 * Illustrated player portraits (bust, 200×200), built from parts as one SVG string.
 * Original characters only: no real players, no likenesses.
 */
export type Skin = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type HairStyle =
  | 'buzz' | 'fade' | 'hightop' | 'afro' | 'curly' | 'locs' | 'braids' | 'mohawk' | 'bun' | 'ponytail'
  | 'long' | 'bald' | 'slick' | 'twists' | 'waves';
export type Mood = 'smile' | 'grin' | 'fierce' | 'cool' | 'shout' | 'smirk' | 'calm';
export type Facial = 'none' | 'beard' | 'goatee' | 'mustache' | 'stubble';
export type Extra = 'headband' | 'earring' | 'chain' | 'goggles' | 'wrinkles';

export interface PortraitSpec {
  skin: Skin;
  hair: HairStyle;
  hairColor: string;
  mood: Mood;
  facial?: Facial;
  extras?: Extra[];
  jersey: [string, string];
  number: number;
  bg: [string, string];
  rays?: boolean;
  ball?: 'left' | 'right';
  eyes?: string;
  /** Eye shape: open (default), heavy-lidded, or round and wide. */
  lids?: 'open' | 'heavy' | 'round';
  /** Face width: 0.92 narrow … 1.08 wide. */
  width?: number;
}

export const SKINS = ['#F6D2B0', '#EBB98F', '#D9A177', '#C2875C', '#A46A43', '#87522F', '#6A3E22', '#4C2B17'];
const INK = '#21140D';

const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
};

const HEAD = 'M68 90 C66 58 82 48 100 48 C118 48 134 58 132 90 L131 102 C129 120 116 132 100 134 C84 132 71 120 69 102 Z';
const CAP = 'M66 92 C62 54 82 42 100 42 C118 42 138 54 134 92 C130 76 122 66 100 66 C78 66 70 76 66 92 Z';

function hairBack(s: PortraitSpec, c: string): string {
  const o = `fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;
  switch (s.hair) {
    case 'afro': return `<ellipse cx="100" cy="70" rx="48" ry="42" ${o}/>`;
    case 'long': return `<path d="M62 86 C58 46 82 34 100 34 C118 34 142 46 138 86 L146 162 C134 170 122 160 120 146 L80 146 C78 160 66 170 54 162 Z" ${o}/>`;
    case 'ponytail': return `<path d="M120 60 C150 62 160 96 150 140 C146 156 132 160 128 150 C138 120 134 90 116 74 Z" ${o}/>`;
    case 'locs': return [62, 70, 130, 138].map((x, i) =>
      `<path d="M${x} 80 C${x + (i < 2 ? -6 : 6)} 110 ${x + (i < 2 ? -4 : 4)} 140 ${x + (i < 2 ? -2 : 2)} 158" stroke="${INK}" stroke-width="13" stroke-linecap="round" fill="none"/><path d="M${x} 80 C${x + (i < 2 ? -6 : 6)} 110 ${x + (i < 2 ? -4 : 4)} 140 ${x + (i < 2 ? -2 : 2)} 158" stroke="${c}" stroke-width="8" stroke-linecap="round" fill="none"/>`).join('');
    default: return '';
  }
}

function hairFront(s: PortraitSpec, c: string): string {
  const o = `fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;
  const dark = shade(c, 0.7);
  switch (s.hair) {
    case 'bald': return `<ellipse cx="86" cy="62" rx="12" ry="6" fill="#fff" opacity="0.28" transform="rotate(-20 86 62)"/>`;
    case 'buzz': return `<path d="M68 90 C66 58 82 50 100 50 C118 50 134 58 132 90 C126 74 116 68 100 68 C84 68 74 74 68 90 Z" fill="${c}" opacity="0.92"/>`;
    case 'fade': return `<path d="M70 86 C68 50 84 40 100 40 C116 40 132 50 130 86 C126 70 116 64 100 64 C84 64 74 70 70 86 Z" ${o}/><path d="M68 94 C67 84 70 78 72 76 L72 92 Z M132 94 C133 84 130 78 128 76 L128 92 Z" fill="${c}" opacity="0.45"/>`;
    case 'hightop': return `<path d="M70 86 L72 30 C86 24 114 24 128 30 L130 86 C124 70 114 64 100 64 C86 64 76 70 70 86 Z" ${o}/><path d="M76 40 L124 40" stroke="${dark}" stroke-width="2"/>`;
    case 'afro': return `<path d="M66 90 C64 66 80 60 100 62 C120 60 136 66 134 90 C128 76 116 70 100 70 C84 70 72 76 66 90 Z" fill="${c}"/>`;
    case 'curly': return [72, 84, 96, 108, 120, 128, 78, 92, 106, 120].map((x, i) =>
      `<circle cx="${x}" cy="${i < 6 ? 58 - Math.abs(100 - x) * 0.05 : 46}" r="11" ${o}/>`).join('') + `<path d="M68 88 C68 70 80 62 100 62 C120 62 132 70 132 88 C126 76 114 70 100 70 C86 70 74 76 68 88 Z" fill="${c}"/>`;
    case 'locs': return `<path d="${CAP}" ${o}/>` + [76, 88, 100, 112, 124].map((x) =>
      `<path d="M${x} 50 C${x - 2} 60 ${x + 2} 66 ${x} 74" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('');
    case 'braids': return `<path d="M68 90 C66 56 82 46 100 46 C118 46 134 56 132 90 C126 74 116 68 100 68 C84 68 74 74 68 90 Z" ${o}/>` + [80, 92, 108, 120].map((x) =>
      `<path d="M${x} 50 C${x + (x - 100) * 0.3} 62 ${x + (x - 100) * 0.5} 72 ${x + (x - 100) * 0.7} 80" stroke="${dark}" stroke-width="3" fill="none" stroke-dasharray="4 3"/>`).join('');
    case 'mohawk': return `<path d="M68 90 C66 62 80 54 100 54 C120 54 134 62 132 90 C126 76 116 70 100 70 C84 70 74 76 68 90 Z" fill="${c}" opacity="0.35"/><path d="M90 66 L86 24 L96 34 L100 18 L106 34 L116 24 L110 66 Z" ${o}/>`;
    case 'bun': return `<circle cx="100" cy="36" r="15" ${o}/><path d="${CAP}" ${o}/>`;
    case 'ponytail': return `<path d="${CAP}" ${o}/><path d="M104 46 C96 56 90 62 74 70" stroke="${dark}" stroke-width="2.5" fill="none"/>`;
    case 'long': return `<path d="M66 96 C60 56 80 40 100 40 C120 40 140 56 134 96 C128 74 118 64 104 62 C100 70 90 76 74 80 C70 84 68 90 66 96 Z" ${o}/>`;
    case 'slick': return `<path d="M68 88 C64 52 84 40 104 42 C122 44 136 58 132 88 C128 70 116 62 100 62 C86 62 76 70 68 88 Z" ${o}/>` + [70, 80, 90].map((y) =>
      `<path d="M78 ${y - 12} C96 ${y - 22} 116 ${y - 20} 128 ${y - 8}" stroke="${dark}" stroke-width="2" fill="none"/>`).join('');
    case 'twists': return `<path d="M68 90 C66 60 82 52 100 52 C118 52 134 60 132 90 C126 76 116 70 100 70 C84 70 74 76 68 90 Z" fill="${c}"/>` + [72, 82, 92, 102, 112, 122, 128].map((x, i) =>
      `<rect x="${x - 5}" y="${34 + (i % 2) * 6}" width="10" height="26" rx="5" ${o} transform="rotate(${(x - 100) * 0.6} ${x} 60)"/>`).join('');
    case 'waves': return `<path d="M68 90 C66 56 82 48 100 48 C118 48 134 56 132 90 C126 74 116 68 100 68 C84 68 74 74 68 90 Z" fill="${c}"/>` + [56, 62].map((y) =>
      `<path d="M78 ${y + 6} Q100 ${y - 6} 122 ${y + 6}" stroke="${shade(c, 1.6)}" stroke-width="2" fill="none" opacity="0.6"/>`).join('');
  }
}

function face(s: PortraitSpec, skin: string): string {
  const iris = s.eyes ?? '#3B2416';
  const lids = s.lids ?? 'open';
  const top = lids === 'round' ? 84 : lids === 'heavy' ? 92 : 86;
  const eye = (x: number) =>
    `<path d="M${x - 9.5} 96 Q${x} ${top} ${x + 9.5} 96 Q${x} ${lids === 'round' ? 106 : 103} ${x - 9.5} 96 Z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>` +
    `<circle cx="${x}" cy="96" r="${lids === 'heavy' ? 4 : 4.6}" fill="${iris}"/><circle cx="${x}" cy="96" r="2.2" fill="${INK}"/><circle cx="${x + 1.6}" cy="94.5" r="1.3" fill="#fff"/>` +
    `<path d="M${x - 10} 95.5 Q${x} ${top - 1} ${x + 10} 95.5" stroke="${INK}" stroke-width="${lids === 'heavy' ? 3.6 : 3}" fill="none" stroke-linecap="round"/>`;
  const brows: Record<Mood, string> = {
    smile: 'M78 84 Q87 79 95 83 M105 83 Q113 79 122 84',
    grin: 'M78 83 Q87 77 95 81 M105 81 Q113 77 122 83',
    fierce: 'M78 80 L95 86 M105 86 L122 80',
    cool: 'M78 84 L95 83 M105 83 L122 84',
    shout: 'M78 80 Q87 82 95 86 M105 86 Q113 82 122 80',
    smirk: 'M78 84 Q87 81 95 84 M105 81 Q113 77 122 82',
    calm: 'M79 85 Q87 82 95 85 M105 85 Q113 82 121 85',
  };
  const mouths: Record<Mood, string> = {
    smile: `<path d="M86 114 Q100 131 114 114 Q100 120 86 114 Z" fill="#fff" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`,
    grin: `<path d="M86 113 Q100 132 114 113 Z" fill="#7A1F22" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M88 114 L112 114 L110 119 L90 119 Z" fill="#fff"/>`,
    fierce: `<path d="M90 119 Q100 115 110 119" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    cool: `<path d="M91 118 L109 117" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    shout: `<ellipse cx="100" cy="119" rx="9" ry="8" fill="#5E1518" stroke="${INK}" stroke-width="2"/><path d="M92 114 L108 114 L106 117 L94 117 Z" fill="#fff"/>`,
    smirk: `<path d="M90 118 Q102 122 112 113" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    calm: `<path d="M91 117 Q100 121 109 117" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  };
  const nose = `<path d="M100 99 C97 106 94 109 97 111 Q100 112.5 104 110.5" stroke="${shade(skin, 0.62)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  const cheeks = s.mood === 'smile' || s.mood === 'grin' ? `<ellipse cx="80" cy="108" rx="6" ry="3.5" fill="#E05A5A" opacity="0.18"/><ellipse cx="120" cy="108" rx="6" ry="3.5" fill="#E05A5A" opacity="0.18"/>` : '';
  return eye(88) + eye(112) + `<path d="${brows[s.mood]}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>` + nose + cheeks + mouths[s.mood];
}

function facialHair(s: PortraitSpec, c: string): string {
  const o = `fill="${c}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"`;
  const stache = `<path d="M86 112 Q100 104 114 112 Q108 110 100 111 Q92 110 86 112 Z" ${o}/>`;
  switch (s.facial ?? 'none') {
    case 'beard': return `<path d="M69 100 C70 128 88 142 100 142 C112 142 130 128 131 100 C128 114 120 124 112 124 Q100 128 88 124 C80 124 72 114 69 100 Z" ${o}/>${stache}`;
    case 'stubble': return `<path d="M70 104 C72 128 88 138 100 138 C112 138 128 128 130 104 C126 118 116 126 100 127 C84 126 74 118 70 104 Z" fill="${c}" opacity="0.32"/>`;
    case 'goatee': return `<path d="M92 124 Q100 140 108 124 Q100 128 92 124 Z" ${o}/>${stache}`;
    case 'mustache': return stache;
    default: return '';
  }
}

function ballSvg(side: 'left' | 'right'): string {
  const cx = side === 'left' ? 42 : 158;
  return `<circle cx="${cx}" cy="170" r="27" fill="#E8833A" stroke="${INK}" stroke-width="3"/>` +
    `<path d="M${cx - 27} 170 L${cx + 27} 170 M${cx} 143 L${cx} 197 M${cx - 18} 150 Q${cx - 6} 170 ${cx - 18} 190 M${cx + 18} 150 Q${cx + 6} 170 ${cx + 18} 190" stroke="${INK}" stroke-width="2.2" fill="none"/>` +
    `<path d="M${cx - 22} 160 Q${cx - 10} 150 ${cx + 2} 152" stroke="#fff" stroke-opacity="0.35" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

export function portraitSvg(s: PortraitSpec, uid: string): string {
  const skin = SKINS[s.skin];
  const skinDark = shade(skin, 0.82);
  const hc = s.hairColor;
  const [j1, j2] = s.jersey;
  const [b1, b2] = s.bg;
  const id = (k: string) => `${k}-${uid}`;
  const rays = s.rays
    ? Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      const a2 = a + Math.PI / 32;
      return `<path d="M100 100 L${100 + 160 * Math.cos(a)} ${100 + 160 * Math.sin(a)} L${100 + 160 * Math.cos(a2)} ${100 + 160 * Math.sin(a2)} Z" fill="#fff" opacity="0.13"/>`;
    }).join('')
    : '';
  const ex = new Set(s.extras ?? []);
  const neckline = 'M86 146 C90 162 110 162 114 146';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
<defs>
  <radialGradient id="${id('bg')}" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></radialGradient>
  <clipPath id="${id('c')}"><circle cx="100" cy="100" r="100"/></clipPath>
  <clipPath id="${id('h')}"><path d="${HEAD}"/></clipPath>
</defs>
<g clip-path="url(#${id('c')})">
  <rect width="200" height="200" fill="url(#${id('bg')})"/>${rays}
  <g transform="translate(100 108) scale(1.24) translate(-100 -100)">
  ${hairBack(s, hc)}
  <path d="M26 204 C28 170 56 150 86 144 L114 144 C144 150 172 170 174 204 Z" fill="${skin}" stroke="${INK}" stroke-width="3"/>
  <path d="M86 120 L86 148 C94 154 106 154 114 148 L114 120 Z" fill="${skinDark}" stroke="${INK}" stroke-width="3"/>
  <path d="M54 204 L60 170 C62 158 70 150 80 146 L86 146 C90 162 110 162 114 146 L120 146 C130 150 138 158 140 170 L146 204 Z" fill="${j1}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="${neckline}" stroke="${j2}" stroke-width="4" fill="none"/>
  <path d="M60 172 C62 158 70 150 80 146 M140 172 C138 158 130 150 120 146" stroke="${j2}" stroke-width="4" fill="none"/>
  ${ex.has('chain') ? `<path d="M88 150 Q100 168 112 150" stroke="#F5C451" stroke-width="3.5" fill="none"/><circle cx="100" cy="162" r="4" fill="#F5C451" stroke="${INK}" stroke-width="1.2"/>` : ''}
  <g transform="translate(100 0) scale(${s.width ?? 1} 1) translate(-100 0)">
  <ellipse cx="67" cy="100" rx="6.5" ry="10" fill="${skin}" stroke="${INK}" stroke-width="3"/>
  <ellipse cx="133" cy="100" rx="6.5" ry="10" fill="${skin}" stroke="${INK}" stroke-width="3"/>
  ${ex.has('earring') ? `<circle cx="133" cy="111" r="3" fill="#F5C451" stroke="${INK}" stroke-width="1.2"/>` : ''}
  <path d="${HEAD}" fill="${skin}"/>
  <g clip-path="url(#${id('h')})"><path d="M112 40 C134 60 136 110 112 140 L150 140 L150 40 Z" fill="${INK}" opacity="0.1"/></g>
  <path d="${HEAD}" fill="none" stroke="${INK}" stroke-width="3"/>
  ${ex.has('wrinkles') ? `<path d="M86 74 Q100 70 114 74 M88 79 Q100 76 112 79" stroke="${shade(skin, 0.6)}" stroke-width="1.6" fill="none"/>` : ''}
  ${face(s, skin)}
  ${facialHair(s, hc)}
  ${hairFront(s, hc)}
  ${ex.has('headband') ? `<path d="M67 80 C76 70 124 70 133 80 L133 88 C124 78 76 78 67 88 Z" fill="${j2}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` : ''}
  ${ex.has('goggles') ? `<path d="M68 95 L132 95" stroke="${INK}" stroke-width="3"/><circle cx="88" cy="95" r="11" fill="#9FD8FF" fill-opacity="0.35" stroke="${INK}" stroke-width="3"/><circle cx="112" cy="95" r="11" fill="#9FD8FF" fill-opacity="0.35" stroke="${INK}" stroke-width="3"/>` : ''}
  </g>
  </g>
  ${s.ball ? ballSvg(s.ball) : ''}
</g>
<circle cx="100" cy="100" r="98.5" fill="none" stroke="#fff" stroke-opacity="0.75" stroke-width="3"/>
</svg>`;
}
