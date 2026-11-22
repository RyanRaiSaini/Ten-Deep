import type { Player, Pos, TeamSeason } from '../engine/types';

export type Archetype =
  | 'scorer' | 'shooter' | 'playmaker' | 'slasher' | 'twoway' | 'defender'
  | 'wing3d' | 'big' | 'rim' | 'stretch' | 'unicorn' | 'point';

/** Sub-rating offsets from overall: [off, def, reb, ast, three]. */
const ARCH: Record<Archetype, [number, number, number, number, number]> = {
  scorer: [4, -6, -12, -2, 1],
  shooter: [2, -5, -14, -8, 10],
  playmaker: [2, -6, -14, 8, 0],
  slasher: [3, -4, -8, -4, -10],
  twoway: [0, 3, -6, -4, -2],
  defender: [-6, 7, -4, -8, -6],
  wing3d: [-2, 4, -6, -8, 4],
  big: [-2, 3, 10, -12, -25],
  rim: [-6, 7, 8, -14, -30],
  stretch: [1, 0, 4, -10, 5],
  unicorn: [2, 4, 6, -6, 2],
  point: [3, -3, 6, 10, -2],
};

const clamp = (n: number) => Math.max(40, Math.min(99, n));
export const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/**
 * One player per line: `Name|POS[/POS2]|ovr|age|archetype[|durability][|?]`
 * `?` flags data the owner should verify. Durability defaults to 80 (68 for age 35+).
 */
export function parseRoster(idSuffix: string, text: string): Player[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((line) => {
      const parts = line.split('|').map((x) => x.trim());
      const verify = parts[parts.length - 1] === '?';
      if (verify) parts.pop();
      const [name, posStr, ovrStr, ageStr, arch, durStr] = parts;
      const ovr = Number(ovrStr);
      if (!(ovr >= 64 && ovr <= 99)) throw new Error(`${name}: overall ${ovrStr} outside 64–99`);
      const a = ARCH[arch as Archetype];
      if (!a) throw new Error(`${name}: unknown archetype ${arch}`);
      const [pos, pos2] = posStr.split('/') as [Pos, Pos | undefined];
      const age = Number(ageStr);
      const dur = durStr ? Number(durStr) : age >= 35 ? 68 : 80;
      const p: Player = {
        id: `${slug(name)}-${idSuffix}`,
        name, pos, ovr, age, tag: arch, dur,
        off: clamp(ovr + a[0]), def: clamp(ovr + a[1]), reb: clamp(ovr + a[2]),
        ast: clamp(ovr + a[3]), three: clamp(ovr + a[4]),
      };
      if (pos2) p.pos2 = pos2;
      if (verify) p.verify = true;
      return p;
    });
}

export function team(
  id: string, city: string, name: string, season: string, colors: [string, string], roster: string,
): TeamSeason {
  return {
    id: `${id}-${season}`, label: `${season} ${name}`, city, name, season, colors,
    players: parseRoster(season, roster),
  };
}
