import type { Pool } from '../engine/types';
import { current2026 } from './current2026';

export const POOLS: Record<string, Pool> = {
  [current2026.id]: current2026,
};

export { current2026 };
