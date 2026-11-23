import { MODE_BY_ID } from '../data/modes';
import { useGame } from '../store/game';
import { C } from './theme';

/** The current run's team colors: the franchise/era's colors, or Ten Deep orange and neon. */
export function useRunColors(): [string, string] {
  const poolId = useGame((s) => s.poolId);
  return MODE_BY_ID[poolId]?.colors ?? [C.hardwood, C.neon];
}
