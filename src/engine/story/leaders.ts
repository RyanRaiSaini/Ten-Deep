/** League leaders and end-of-season award races, from the season's running totals. */
import type { SeasonState } from '../season';
import { ALL_SLOTS, BENCH_SLOTS, type Player } from '../types';

export type LeaderStat = 'pts' | 'reb' | 'ast';
export type Award = 'mvp' | 'dpoy' | 'roy' | 'smoy';
export const AWARDS: Award[] = ['mvp', 'dpoy', 'roy', 'smoy'];

export interface Ranked {
  player: Player;
  /** Team index into SeasonState.teams (0 = you). */
  team: number;
  value: number;
  ppg: number;
  rpg: number;
  apg: number;
}

/** A player must have played 60% of the games so far to qualify (like the NBA's 65-game rule). */
const minGames = (s: SeasonState) => Math.max(1, Math.floor(s.round * 0.6));

function qualified(s: SeasonState, filter: (p: Player, slot: string) => boolean = () => true): Omit<Ranked, 'value'>[] {
  const need = minGames(s);
  const out: Omit<Ranked, 'value'>[] = [];
  s.teams.forEach((t, team) => {
    for (const slot of ALL_SLOTS) {
      const p = t.slots[slot];
      const tot = s.totals[p.id];
      if (!tot || tot.gp < need || !filter(p, slot)) continue;
      out.push({ player: p, team, ppg: tot.pts / tot.gp, rpg: tot.reb / tot.gp, apg: tot.ast / tot.gp });
    }
  });
  return out;
}

const top = (xs: Ranked[], n: number) => xs.sort((a, b) => b.value - a.value || a.player.id.localeCompare(b.player.id)).slice(0, n);

export function leaders(s: SeasonState, stat: LeaderStat, n = 5): Ranked[] {
  if (s.round === 0) return [];
  const key = { pts: 'ppg', reb: 'rpg', ast: 'apg' } as const;
  return top(qualified(s).map((x) => ({ ...x, value: x[key[stat]] })), n);
}

const winPct = (s: SeasonState, team: number) => {
  const r = s.records[team];
  return r.w + r.l ? r.w / (r.w + r.l) : 0.5;
};
/** One number for box-score production. */
const production = (x: Omit<Ranked, 'value'>) => x.ppg + 0.45 * x.rpg + 0.65 * x.apg;

/**
 * MVP: production scaled by team success (voters reward winners).
 * DPOY: defensive rating plus rebounding, nudged by team success.
 * ROY: production among this season's rookies (the 2026 class in Current Day; 21 and under for older seasons). Sixth Man: production off the bench.
 */
export function awardRace(s: SeasonState, award: Award, n = 5): Ranked[] {
  if (s.round === 0) return [];
  switch (award) {
    case 'mvp':
      return top(qualified(s).map((x) => ({ ...x, value: production(x) * (0.55 + 0.9 * winPct(s, x.team)) })), n);
    case 'dpoy':
      return top(qualified(s).map((x) => ({ ...x, value: x.player.def + 0.6 * x.rpg + 12 * (winPct(s, x.team) - 0.5) })), n);
    case 'roy': {
      // Current Day marks the real rookie class; older seasons fall back to age (21 and under).
      const flagged = s.teams.some((t) => Object.values(t.slots).some((p) => p?.rookie));
      return top(qualified(s, (p) => (flagged ? !!p.rookie : (p.age ?? 99) <= 21)).map((x) => ({ ...x, value: production(x) })), n);
    }
    case 'smoy':
      return top(qualified(s, (_, slot) => (BENCH_SLOTS as string[]).includes(slot)).map((x) => ({ ...x, value: production(x) })), n);
  }
}
