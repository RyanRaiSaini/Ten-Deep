/**
 * The app icon (1024×1024): a hot orange-to-magenta tile with a sunburst, speed lines, a tilted basketball and
 * a fat outlined "10" with a 3D extrusion. Rendered to PNG by scripts/make-icons.mts (the font is embedded there).
 */
const INK = '#17121E';

export function iconSvg({ tile = true, scale = 1, mono = false }: { tile?: boolean; scale?: number; mono?: boolean } = {}): string {
  const rays = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const b = a + Math.PI / 30;
    return `<path d="M512 470 L${512 + 1200 * Math.cos(a)} ${470 + 1200 * Math.sin(a)} L${512 + 1200 * Math.cos(b)} ${470 + 1200 * Math.sin(b)} Z" fill="#FFFFFF" opacity="0.13"/>`;
  }).join('');
  const t = `translate(${512 - 512 * scale} ${512 - 512 * scale}) scale(${scale})`;
  const ten = (fill: string, dy: number, stroke = 'none', sw = 0) =>
    `<text x="540" y="${690 + dy}" text-anchor="middle" font-family="Lilita One" font-size="420" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" paint-order="stroke" transform="rotate(-8 540 560)">10</text>`;
  if (mono) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><g transform="${t}">
      <circle cx="600" cy="440" r="250" fill="#fff"/>
      <g stroke="#fff" stroke-width="34" stroke-linecap="round"><path d="M110 330 H300 M160 450 H290 M90 570 H270"/></g>
    </g></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB13B"/><stop offset="0.45" stop-color="#FF6A1A"/><stop offset="1" stop-color="#D6285A"/></linearGradient>
    <radialGradient id="ball" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#FFB36B"/><stop offset="0.6" stop-color="#F07A2A"/><stop offset="1" stop-color="#A9461A"/></radialGradient>
    <clipPath id="bc"><circle cx="600" cy="440" r="250"/></clipPath>
  </defs>
  ${tile ? `<rect width="1024" height="1024" fill="url(#tile)"/>${rays}` : ''}
  <g transform="${t}">
    <g stroke="${INK}" stroke-width="58" stroke-linecap="round"><path d="M110 330 H300 M160 450 H290 M90 570 H270"/></g>
    <g stroke="#FFFFFF" stroke-width="30" stroke-linecap="round"><path d="M110 330 H300 M160 450 H290 M90 570 H270"/></g>
    <g transform="rotate(-18 600 440)">
      <circle cx="600" cy="440" r="250" fill="url(#ball)" stroke="${INK}" stroke-width="26"/>
      <g clip-path="url(#bc)" stroke="${INK}" stroke-width="20" fill="none">
        <path d="M350 440 H850 M600 190 V690 M430 250 C520 340 520 540 430 630 M770 250 C680 340 680 540 770 630"/>
      </g>
      <path d="M470 300 C510 260 560 240 610 238" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round" fill="none" opacity="0.55"/>
    </g>
    ${ten(INK, 64, INK, 60)}
    ${[48, 36, 24, 12].map((dy) => ten('#FF7417', dy, '#FF7417', 44)).join('')}
    ${ten('#FFFFFF', 0, INK, 44)}
  </g>
</svg>`;
}
