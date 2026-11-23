import { simGame } from './game';
import type { Rng, Roster } from './types';

/** 2-2-1-1-1: team A hosts games 1, 2, 5 and 7. */
const HOME_A = [true, true, false, false, true, false, true];

export interface SeriesResult {
  games: { scoreA: number; scoreB: number }[];
  winsA: number;
  winsB: number;
  winner: 'a' | 'b';
}

/** A seeded best-of-7 between two full rosters (no injuries). */
export function bestOf7(a: Roster, b: Roster, rng: Rng): SeriesResult {
  return bestOf(a, b, rng, 4);
}

/** First to `need` wins (need 2 = best-of-3, need 4 = best-of-7). */
export function bestOf(a: Roster, b: Roster, rng: Rng, need: number): SeriesResult {
  const games: SeriesResult['games'] = [];
  let winsA = 0;
  let winsB = 0;
  for (let g = 0; winsA < need && winsB < need; g++) {
    const ctx = { rng: rng.fork(`g${g}`), outHome: new Set<string>(), outAway: new Set<string>() };
    const r = HOME_A[g] ? simGame(a, b, ctx) : simGame(b, a, ctx);
    const scoreA = HOME_A[g] ? r.homeScore : r.awayScore;
    const scoreB = HOME_A[g] ? r.awayScore : r.homeScore;
    games.push({ scoreA, scoreB });
    if (scoreA > scoreB) winsA++;
    else winsB++;
  }
  return { games, winsA, winsB, winner: winsA === need ? 'a' : 'b' };
}
