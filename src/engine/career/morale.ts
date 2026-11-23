/** Locker-room morale (0–100): winning builds it, losing and trading teammates away wears it down. */
import type { PlayoffResult } from './legacy';

export const MORALE_START = 60;

const PLAYOFF_BONUS: Record<PlayoffResult, number> = { champion: 15, finals: 9, semis: 5, quarters: 2, first: 0, missed: -6 };

export function moraleAfter(morale: number, s: { wins: number; result: PlayoffResult; trades: number }): number {
  const next = morale + (s.wins - 41) * 0.5 + PLAYOFF_BONUS[s.result] - 4 * s.trades;
  return Math.max(0, Math.min(100, Math.round(next)));
}

/** Team-wide rating nudge for the season: −2 (miserable) to +2 (buzzing). */
export function moraleMod(morale: number): number {
  return Math.max(-2, Math.min(2, Math.round((morale - 50) / 25)));
}
