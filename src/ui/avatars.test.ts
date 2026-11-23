import { describe, expect, it } from 'vitest';
import { AVATARS, avatarById } from './avatars';
import { SKINS, portraitSvg } from './portraits';

/** Ids that shipped before the 3D redesign: they live in saves and friend codes, so they must never go away. */
const SHIPPED_IDS = [
  'captain', 'golden-boy', 'pony-power', 'ice-cold', 'loc-star', 'red-beard', 'enforcer', 'bun-runner', 'afro-flair',
  'high-top', 'frost-twist', 'old-coach', 'sunset-curls', 'glass-cleaner', 'braid-queen', 'mohawk-mike', 'cornrow-kid',
  'long-range', 'dad-strength', 'neon-dream', 'spin-move', 'maestro', 'veteran', 'fire-starter', 'summer-league',
  'hard-hat', 'rookie-star', 'sky-walker', 'lockdown', 'bench-mob', 'ice-queen', 'legend', 'pink-flash', 'hustle',
  'quiet-assassin', 'baby-face', 'night-shift', 'green-machine', 'point-god', 'franchise',
];

/** Minimal well-formedness check: balanced tags, no duplicate attributes, every url(#id) defined. */
function checkSvg(svg: string): string[] {
  const errors: string[] = [];
  const stack: string[] = [];
  const ids = new Set<string>();
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, close, name, attrs, self] = m;
    if (close) {
      if (stack.pop() !== name) errors.push(`unbalanced </${name}>`);
      continue;
    }
    const names = [...attrs.matchAll(/\s([a-zA-Z:-]+)="[^"]*"/g)].map((a) => a[1]);
    const dup = names.find((x, i) => names.indexOf(x) !== i);
    if (dup) errors.push(`<${name}> repeats ${dup}`);
    const id = attrs.match(/\sid="([^"]+)"/);
    if (id) ids.add(id[1]);
    if (!self) stack.push(name);
  }
  if (stack.length) errors.push(`unclosed ${stack.join(',')}`);
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) if (!ids.has(m[1])) errors.push(`missing #${m[1]}`);
  return errors;
}

describe('avatars', () => {
  it('ships 48 unique portraits covering every skin tone, mood and a wide range of hairstyles', () => {
    expect(AVATARS).toHaveLength(48);
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(48);
    expect(new Set(AVATARS.map((a) => a.skin)).size).toBe(SKINS.length);
    expect(new Set(AVATARS.map((a) => a.hair)).size).toBeGreaterThanOrEqual(18);
    expect(new Set(AVATARS.map((a) => a.mood)).size).toBe(7);
    expect(AVATARS.filter((a) => a.fem).length).toBeGreaterThanOrEqual(10);
  });

  it('keeps every id that ever shipped, in its original slot', () => {
    expect(AVATARS.slice(0, SHIPPED_IDS.length).map((a) => a.id)).toEqual(SHIPPED_IDS);
  });

  it('every portrait is well-formed SVG using only primitives react-native-svg renders natively', () => {
    for (const a of AVATARS) {
      const svg = portraitSvg(a, a.id);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(checkSvg(svg), a.id).toEqual([]);
      expect(svg, a.id).not.toMatch(/<(filter|text|image|style|mask|foreignObject)\b/);
      expect(svg, a.id).not.toMatch(/NaN|undefined/);
    }
  });

  it('each portrait is a self-contained SVG with ids unique to it (many render on one screen)', () => {
    const a = portraitSvg(AVATARS[0], AVATARS[0].id);
    const b = portraitSvg(AVATARS[1], AVATARS[1].id);
    const ids = (svg: string) => [...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids(a).length).toBeGreaterThan(0);
    expect(new Set(ids(a)).size).toBe(ids(a).length);
    expect(ids(a).filter((x) => ids(b).includes(x))).toEqual([]);
  });

  it('is deterministic', () => {
    expect(portraitSvg(AVATARS[5], 'x')).toBe(portraitSvg(AVATARS[5], 'x'));
  });

  it('old saved ids map to a stable portrait instead of all becoming the first one', () => {
    expect(avatarById('floor-general-hardwood')).toBe(avatarById('floor-general-hardwood'));
    const olds = ['floor-general-hardwood', 'legend-gold', 'rookie-neon', 'dunker-royal', 'big-man-crimson'];
    expect(new Set(olds.map((o) => avatarById(o).id)).size).toBeGreaterThan(1);
    expect(avatarById(AVATARS[7].id)).toBe(AVATARS[7]);
    // Unknown ids land on one of the original 40, exactly as before more portraits were added.
    for (const o of olds) expect(AVATARS.indexOf(avatarById(o))).toBeLessThan(40);
    expect(avatarById('floor-general-hardwood').id).toBe(SHIPPED_IDS[hash('floor-general-hardwood') % 40]);
  });
});

function hash(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}
