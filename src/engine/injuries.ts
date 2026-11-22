import type { Player, Rng } from './types';

export type InjuryLabel = 'Day-to-day' | 'Short-term' | 'Long-term' | 'Season-ending';
export interface Injury {
  playerId: string;
  games: number;
  label: InjuryLabel;
}

export const INJURY_BASE_RATE = 0.004;

/** Per-game injury roll. Risk scales with minutes and falls with durability. */
export function rollInjury(p: Player, minutes: number, rng: Rng): Injury | null {
  const risk = INJURY_BASE_RATE * (minutes / 30) * (1.6 - p.dur / 100);
  if (rng.next() >= risk) return null;
  const r = rng.next();
  if (r < 0.55) return { playerId: p.id, games: rng.int(1, 2), label: 'Day-to-day' };
  if (r < 0.85) return { playerId: p.id, games: rng.int(3, 10), label: 'Short-term' };
  if (r < 0.97) return { playerId: p.id, games: rng.int(11, 30), label: 'Long-term' };
  return { playerId: p.id, games: 200, label: 'Season-ending' };
}
