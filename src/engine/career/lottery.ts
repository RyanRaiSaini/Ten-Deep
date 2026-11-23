import type { Rng } from '../types';

/** Lottery weights for the 14 non-playoff teams, worst first (NBA-style flattened odds). */
const ODDS = [140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5];

/**
 * Draft order (team indexes, first pick first): the top 4 picks are a weighted lottery among non-playoff teams;
 * the rest of the non-playoff teams follow by record (worst first), then playoff teams by record.
 */
export function draftOrder(wins: number[], playoff: Set<number>, rng: Rng): number[] {
  const byRecord = (a: number, b: number) => wins[a] - wins[b] || a - b;
  const lottery = wins.map((_, i) => i).filter((i) => !playoff.has(i)).sort(byRecord);
  const inPlayoffs = wins.map((_, i) => i).filter((i) => playoff.has(i)).sort(byRecord);
  const pool = lottery.map((team, i) => ({ team, w: ODDS[i] ?? 1 }));
  const top: number[] = [];
  for (let k = 0; k < 4 && pool.length; k++) {
    let roll = rng.next() * pool.reduce((s, x) => s + x.w, 0);
    const idx = pool.findIndex((x) => (roll -= x.w) < 0);
    top.push(pool.splice(idx < 0 ? pool.length - 1 : idx, 1)[0].team);
  }
  return [...top, ...pool.map((x) => x.team), ...inPlayoffs];
}
