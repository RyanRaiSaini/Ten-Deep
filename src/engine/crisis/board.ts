/** The board: sets a season objective from your roster's strength, then grades you at the end. */
import { champion, seriesFor, type PlayoffState } from '../playoffs';
import { lineupMinutes, teamStrength } from '../rotation';
import { standings, type SeasonState } from '../season';

export type ObjectiveTier = 'title' | 'semis' | 'playoffs' | 'wins30';
export interface Objective {
  tier: ObjectiveTier;
  /** Your preseason strength rank among all teams (1 = best). */
  rank: number;
}
export type Verdict = 'legend' | 'extended' | 'survived' | 'fired';

export function boardObjective(s: SeasonState): Objective {
  const net = s.teams.map((t) => teamStrength(lineupMinutes(t, new Set())).net);
  const rank = 1 + net.filter((n) => n > net[0]).length;
  const tier: ObjectiveTier = rank <= 4 ? 'title' : rank <= 10 ? 'semis' : rank <= 18 ? 'playoffs' : 'wins30';
  return { tier, rank };
}

export function verdict(o: Objective, s: SeasonState, ps: PlayoffState): Verdict {
  if (champion(ps) === 0) return 'legend';
  const mine = seriesFor(ps, 0);
  const wins = s.records[0].w;
  const met =
    o.tier === 'title' ? false
      : o.tier === 'semis' ? !!mine && mine.round >= 2
        : o.tier === 'playoffs' ? !!mine
          : wins >= 30;
  if (met) return 'extended';
  const lastSeedWins = standings(s)[15].w;
  const close =
    o.tier === 'title' ? !!mine && mine.round === 3
      : o.tier === 'semis' ? !!mine && mine.round === 1
        : o.tier === 'playoffs' ? lastSeedWins - wins <= 5
          : wins >= 25;
  return close ? 'survived' : 'fired';
}
