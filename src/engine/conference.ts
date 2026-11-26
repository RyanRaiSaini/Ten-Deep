/**
 * Conferences and divisions, laid out like the real league of the run's era: today's 30 teams in six divisions,
 * or an older league (1987-88: 23 teams; 1996-97: 29) in its four (Atlantic, Central, Midwest, Pacific). You choose
 * your division; the AI teams are that league's real franchises. With an even number of them, one from your
 * division (picked by the seed) makes room for you; with an odd number, you join as an extra team.
 *
 * Divisions don't change the schedule (everyone still plays the same seeded 82); they decide who you're seeded
 * against. Playoff seeding is by record inside each conference, with a play-in for seeds 7 to 10.
 */
import { createRng, shuffle } from './rng';
import type { Roster, TeamSeason } from './types';

export interface Division {
  id: string;
  conf: Conf;
  /** Franchise keys, as used in the data (`atl-2026-27` → `atl`, history's `franchise`). */
  franchises: readonly string[];
}
export type Conf = 0 | 1;
export const CONFERENCES = ['east', 'west'] as const;

/** Every division of every layout; a team's division is an index into this list (0–5 are today's). */
export const DIVISIONS: readonly Division[] = [
  // Today's league (2004-05 on).
  { id: 'atlantic', conf: 0, franchises: ['bos', 'bkn', 'nyk', 'phi', 'tor'] },
  { id: 'central', conf: 0, franchises: ['chi', 'cle', 'det', 'ind', 'mil'] },
  { id: 'southeast', conf: 0, franchises: ['atl', 'cha', 'mia', 'orl', 'was'] },
  { id: 'northwest', conf: 1, franchises: ['den', 'min', 'okc', 'por', 'uta'] },
  { id: 'pacific', conf: 1, franchises: ['gsw', 'lac', 'lal', 'phx', 'sac'] },
  { id: 'southwest', conf: 1, franchises: ['dal', 'hou', 'mem', 'nop', 'sas'] },
  // 1987-88: 23 teams (the Bullets were in the Atlantic; the Kings, Rockets and Spurs in the Midwest).
  { id: 'atlantic', conf: 0, franchises: ['bos', 'bkn', 'nyk', 'phi', 'was'] },
  { id: 'central', conf: 0, franchises: ['atl', 'chi', 'cle', 'det', 'ind', 'mil'] },
  { id: 'midwest', conf: 1, franchises: ['dal', 'den', 'hou', 'sac', 'sas', 'uta'] },
  { id: 'pacific', conf: 1, franchises: ['gsw', 'lac', 'lal', 'phx', 'por', 'okc'] },
  // 1996-97: 29 teams (Heat and Magic in the Atlantic; Hornets, Hawks and Raptors in the Central; Grizzlies in Vancouver).
  { id: 'atlantic', conf: 0, franchises: ['bos', 'mia', 'bkn', 'nyk', 'orl', 'phi', 'was'] },
  { id: 'central', conf: 0, franchises: ['atl', 'cha', 'chi', 'cle', 'det', 'ind', 'mil', 'tor'] },
  { id: 'midwest', conf: 1, franchises: ['dal', 'den', 'hou', 'min', 'sas', 'uta', 'mem'] },
  { id: 'pacific', conf: 1, franchises: ['gsw', 'lac', 'lal', 'phx', 'por', 'sac', 'okc'] },
];

/** A league's layout: which of the divisions above it uses. */
export type LayoutId = 'modern' | 'y1988' | 'y1997';
export const LAYOUTS: Record<LayoutId, readonly number[]> = { modern: [0, 1, 2, 3, 4, 5], y1988: [6, 7, 8, 9], y1997: [10, 11, 12, 13] };
/** The layout a division belongs to (so a run's division also tells which league it plays in). */
export const layoutOf = (div: number): LayoutId => (LAYOUTS.y1988.includes(div) ? 'y1988' : LAYOUTS.y1997.includes(div) ? 'y1997' : 'modern');

export const confOfDiv = (div: number): Conf => DIVISIONS[div]?.conf ?? 0;
const divMaps = new Map<LayoutId, Map<string, number>>();
const divMap = (layout: LayoutId) => {
  let m = divMaps.get(layout);
  if (!m) { m = new Map(LAYOUTS[layout].flatMap((i) => DIVISIONS[i].franchises.map((f) => [f, i] as const))); divMaps.set(layout, m); }
  return m;
};
export const divOfFranchise = (f: string | undefined, layout: LayoutId = 'modern') => (f ? divMap(layout).get(f) : undefined);

/** A team season's franchise key: history carries it, Current Day encodes it in the id (`atl-2026-27`). */
export const franchiseOf = (t: TeamSeason) => t.franchise ?? t.id.split('-')[0];

/** A default division for someone who hasn't chosen one yet (and for shared runs): one of the layout's, fixed by the seed. */
export const defaultDivision = (seed: string, layout: LayoutId = 'modern') => {
  const divs = LAYOUTS[layout];
  return divs[createRng(`${seed}:division`).int(0, divs.length - 1)];
};

/**
 * Which franchise each AI team represents, in a seeded order: the league's real franchises (your division's
 * layout), minus one from your division when that leaves an even league with you in it (30 → 29 + you), or all of
 * them when there's an odd number (1987-88: 23 + you = 24).
 */
export function leagueFranchises(userDiv: number, seed: string): string[] {
  const rng = createRng(`${seed}:franchises`);
  const all = LAYOUTS[layoutOf(userDiv)].flatMap((i) => DIVISIONS[i].franchises);
  const dropped = all.length % 2 === 0 ? rng.pick(DIVISIONS[userDiv].franchises) : null;
  return shuffle(all.filter((f) => f !== dropped), rng);
}

/**
 * Every team's division. Team 0 (you) goes where you chose; each AI team to its franchise's division while it has
 * room, and anyone left over (unknown franchise, or a crowded division in an older save) fills the open spots,
 * same conference first. Works for any even league size.
 */
export function assignDivisions(franchises: readonly (string | undefined)[], userDiv: number): number[] {
  const layout = layoutOf(userDiv);
  const own = LAYOUTS[layout];
  const n = franchises.length;
  // Today's league splits evenly (five a division); an older one keeps its real, uneven divisions, plus you.
  const even = Math.ceil(n / own.length);
  const capOf = (d: number) => (layout === 'modern' ? even : Math.max(even, DIVISIONS[d].franchises.length + 1));
  const count = DIVISIONS.map((_, d) => (own.includes(d) ? 0 : Infinity));
  const divs: number[] = Array(n).fill(-1);
  divs[0] = userDiv;
  count[userDiv]++;
  const left: number[] = [];
  for (let i = 1; i < n; i++) {
    const d = divOfFranchise(franchises[i], layout);
    if (d !== undefined && count[d] < capOf(d)) {
      divs[i] = d;
      count[d]++;
    } else left.push(i);
  }
  for (const i of left) {
    const home = divOfFranchise(franchises[i], layout) ?? divOfFranchise(franchises[i]);
    const near = (d: number) => Number(home !== undefined && confOfDiv(d) === confOfDiv(home));
    const open = own.filter((d) => count[d] < capOf(d));
    const pick = open.sort((a, b) => near(b) - near(a) || count[a] - count[b] || a - b)[0];
    divs[i] = pick;
    count[pick]++;
  }
  return divs;
}

/**
 * Name the AI teams after their franchises and lay out the divisions. A team's look comes from the run's own pool
 * when it has that franchise (so an all-time league can field the 1996 Bulls' name), else from `canonical`.
 */
export function alignLeague(teams: Roster[], userDiv: number, seed: string, pool: readonly TeamSeason[], canonical: readonly TeamSeason[]): { teams: Roster[]; divs: number[] } {
  if (teams.length !== 30) {
    return { teams, divs: assignDivisions(teams.map((t) => t.franchise), userDiv) };
  }
  const franchises = leagueFranchises(userDiv, seed);
  const rng = createRng(`${seed}:team-names`);
  const out = teams.map((t, i) => {
    if (i === 0) return t;
    const f = franchises[i - 1];
    const own = pool.filter((x) => franchiseOf(x) === f);
    const look = own.length ? rng.pick(own) : canonical.find((x) => franchiseOf(x) === f);
    return look ? { ...t, franchise: f, name: `${look.city} ${look.name}`, colors: look.colors } : { ...t, franchise: f };
  });
  return { teams: out, divs: assignDivisions([undefined, ...franchises], userDiv) };
}
