import type { Pool } from '../engine/types';
import { current2026 } from './current2026';
import { MODES, MODE_BY_ID, leaguePoolFor, type Mode } from './modes';

export const POOLS: Record<string, Pool> = Object.fromEntries(MODES.map((m) => [m.id, m.pool]));

export { current2026, MODES, MODE_BY_ID, leaguePoolFor, type Mode };
