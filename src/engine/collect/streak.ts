import type { PickType } from './picks';

const dayNumber = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

/** Login streak after opening the app on `today` (YYYY-MM-DD local days). */
export const MAX_FREEZES = 2;

/**
 * Streak with freezes: each missed day spends a freeze instead of breaking the streak (if you have enough).
 * Returns the new streak, the freezes left, and how many were used.
 */
export function advanceWithFreezes(last: string | null, today: string, streak: number, freezes: number): { streak: number; freezes: number; used: number } {
  if (!last) return { streak: 1, freezes, used: 0 };
  const gap = dayNumber(today) - dayNumber(last);
  if (gap <= 0) return { streak: Math.max(1, streak), freezes, used: 0 };
  const missed = gap - 1;
  if (missed === 0) return { streak: streak + 1, freezes, used: 0 };
  if (missed <= freezes) return { streak: streak + 1, freezes: freezes - missed, used: missed };
  return { streak: 1, freezes, used: 0 };
}

/** A freeze is earned on every 7th day of a streak (up to the maximum held). */
export const freezeEarned = (streak: number) => streak > 0 && streak % 7 === 0;

export function advanceStreak(last: string | null, today: string, streak: number): number {
  if (!last) return 1;
  const gap = dayNumber(today) - dayNumber(last);
  if (gap <= 0) return Math.max(1, streak);
  return gap === 1 ? streak + 1 : 1;
}

/** Picks earned on a given streak day: a daily pick, plus a weekly (every 7th) or mythic (every 31st) pick. */
export function streakRewards(day: number): PickType[] {
  if (day > 0 && day % 31 === 0) return ['daily', 'mythic'];
  if (day > 0 && day % 7 === 0) return ['daily', 'weekly'];
  return ['daily'];
}
