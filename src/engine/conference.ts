/**
 * Conferences and divisions. Every 30-team league is laid out like the real one: East and West, three divisions
 * of five each. You choose your division; the 29 AI teams take the real franchises' places, minus one from your
 * division (picked by the seed) so you have a spot.
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

export const DIVISIONS: readonly Division[] = [
  { id: 'atlantic', conf: 0, franchises: ['bos', 'bkn', 'nyk', 'phi', 'tor'] },
  { id: 'central', conf: 0, franchises: ['chi', 'cle', 'det', 'ind', 'mil'] },
  { id: 'southeast', conf: 0, franchises: ['atl', 'cha', 'mia', 'orl', 'was'] },
  { id: 'northwest', conf: 1, franchises: ['den', 'min', 'okc', 'por', 'uta'] },
  { id: 'pacific', conf: 1, franchises: ['gsw', 'lac', 'lal', 'phx', 'sac'] },
  { id: 'southwest', conf: 1, franchises: ['dal', 'hou', 'mem', 'nop', 'sas'] },
];

export const confOfDiv = (div: number): Conf => DIVISIONS[div]?.conf ?? 0;
const DIV_OF = new Map(DIVISIONS.flatMap((d, i) => d.franchises.map((f) => [f, i] as const)));
export const divOfFranchise = (f: string | undefined) => (f ? DIV_OF.get(f) : undefined);

/** A team season's franchise key: history carries it, Current Day encodes it in the id (`atl-2026-27`). */
export const franchiseOf = (t: TeamSeason) => t.franchise ?? t.id.split('-')[0];

/** A default division for someone who hasn't chosen one yet: any of the six, fixed by the seed. */
export const defaultDivision = (seed: string) => createRng(`${seed}:division`).int(0, DIVISIONS.length - 1);

/**
 * Which franchise each AI team represents, for a standard 30-team league: the 29 real franchises other than one
 * left out of your division, in a seeded order. (Doesn't touch the rosters: only names and seeding follow.)
 */
export function leagueFranchises(userDiv: number, seed: string): string[] {
  const rng = createRng(`${seed}:franchises`);
  const dropped = rng.pick(DIVISIONS[userDiv].franchises);
  return shuffle(DIVISIONS.flatMap((d) => d.franchises).filter((f) => f !== dropped), rng);
}

/**
 * Every team's division. Team 0 (you) goes where you chose; each AI team to its franchise's division while it has
 * room, and anyone left over (unknown franchise, or a crowded division in an older save) fills the open spots,
 * same conference first. Works for any even league size.
 */
export function assignDivisions(franchises: readonly (string | undefined)[], userDiv: number): number[] {
  const n = franchises.length;
  const cap = Math.ceil(n / DIVISIONS.length);
  const count = DIVISIONS.map(() => 0);
  const divs: number[] = Array(n).fill(-1);
  divs[0] = userDiv;
  count[userDiv]++;
  const left: number[] = [];
  for (let i = 1; i < n; i++) {
    const d = divOfFranchise(franchises[i]);
    if (d !== undefined && count[d] < cap) {
      divs[i] = d;
      count[d]++;
    } else left.push(i);
  }
  for (const i of left) {
    const home = divOfFranchise(franchises[i]);
    const near = (d: number) => Number(home !== undefined && confOfDiv(d) === confOfDiv(home));
    const open = DIVISIONS.map((_, d) => d).filter((d) => count[d] < cap);
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
