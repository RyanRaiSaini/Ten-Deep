import type { Pool } from '../engine/types';
import { current2026 } from './current2026';
import { MODES, MODE_BY_ID, leaguePoolFor, type Mode } from './modes';

/** Mode id → pool, each built on first access. */
export const POOLS: Record<string, Pool> = {};
for (const m of MODES) Object.defineProperty(POOLS, m.id, { get: () => m.pool, enumerable: true });

export { current2026, MODES, MODE_BY_ID, leaguePoolFor, type Mode };
