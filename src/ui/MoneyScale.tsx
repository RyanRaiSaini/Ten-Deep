/**
 * Which dollars prices are shown in: 1 for today's, or an era's own (its real cap; see moneyScaleFor). Screens
 * that show a run's prices provide it; everything inside (player cards, the cap bar) formats with it.
 */
import { createContext, useContext } from 'react';
import { money } from './theme';

export const MoneyScale = createContext(1);

/** A money formatter in the surrounding screen's dollars (or `override`'s). */
export function useMoney(override?: number): (m: number) => string {
  const ctx = useContext(MoneyScale);
  const scale = override ?? ctx;
  return (m) => money(m, scale);
}
