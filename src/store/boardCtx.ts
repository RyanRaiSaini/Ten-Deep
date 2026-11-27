/** Builds what the board's cards need to know about the run: pools, where players come from, team names. */
import { MODE_BY_ID, POOLS, current2026 } from '../data';
import { franchiseOf } from '../engine/conference';
import { originIndex } from '../engine/board/origin';
import { nationOf } from '../data/nation';
import type { PlayCtx } from '../engine/board/play';
import type { SeasonState } from '../engine/season';

let names: Map<string, string> | null = null;
const teamName = (f: string) => (names ??= new Map(current2026.teams.map((t) => [franchiseOf(t), `${t.city} ${t.name}`]))).get(f) ?? f.toUpperCase();

const origins = new Map<string, PlayCtx['origin']>();

export function boardCtx(poolId: string, season: SeasonState): PlayCtx {
  const mode = MODE_BY_ID[poolId];
  const pool = POOLS[poolId] ?? current2026;
  const allTime = POOLS['all-time'];
  let origin = origins.get(poolId);
  if (!origin) {
    origin = originIndex(mode?.kind === 'current' ? [current2026] : [pool, allTime, current2026]);
    origins.set(poolId, origin);
  }
  return {
    season, origin, pool, allTime, teamName, nation: nationOf,
    history: !!mode && mode.kind !== 'current',
    allTimeMode: poolId === 'all-time' || mode?.kind === 'franchise',
  };
}
