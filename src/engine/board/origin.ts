/** Where each player card comes from (franchise and season), for cards about titles, Finals and old teams. */
import { franchiseOf } from '../conference';
import type { Player, Pool } from '../types';
import type { Origin } from './rules';

/** "2026-27" → 2027, "1996" → 1996. */
export const endYear = (season: string) => (season.includes('-') ? Number(season.slice(0, 4)) + 1 : Number(season));

export function originIndex(pools: Pool[]): (p: Player) => Origin | null {
  const map = new Map<string, Origin>();
  for (const pool of pools) for (const t of pool.teams) {
    const o = { franchise: franchiseOf(t), year: endYear(t.season) };
    for (const p of t.players) if (!map.has(p.id)) map.set(p.id, o);
  }
  return (p) => map.get(p.id) ?? null;
}
