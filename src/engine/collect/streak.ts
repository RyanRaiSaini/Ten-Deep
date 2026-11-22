import type { PickType } from './picks';

const dayNumber = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

/** Login streak after opening the app on `today` (YYYY-MM-DD local days). */
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
