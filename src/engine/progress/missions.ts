/** Daily and weekly missions: three each, seeded by the date, paid in Player Picks. */
import type { PickType } from '../collect/picks';
import { createRng, shuffle } from '../rng';
import type { StatKey, Stats } from './stats';

export interface Mission {
  id: string;
  stat: StatKey;
  target: number;
  reward: PickType;
}

const daily = (stat: StatKey, target: number): Mission => ({ id: `d-${stat}`, stat, target, reward: 'run' });
const weekly = (stat: StatKey, target: number): Mission => ({ id: `w-${stat}`, stat, target, reward: 'weekly' });

export const DAILY_POOL: Mission[] = [
  daily('runs', 1), daily('win40', 1), daily('playoffRuns', 1), daily('dailyGames', 2), daily('packs', 1),
  daily('gauntletSeries', 1), daily('duels', 1), daily('seasonWins', 100), daily('franchiseRuns', 1), daily('eraRuns', 1),
];

export const WEEKLY_POOL: Mission[] = [
  weekly('runs', 5), weekly('titles', 1), weekly('seasonWins', 300), weekly('dailyGames', 10), weekly('gauntletSeries', 5),
  weekly('crisisRuns', 2), weekly('win55', 1), weekly('packs', 7), weekly('careerSeasons', 2),
];

const pick3 = (pool: Mission[], seed: string) => shuffle(pool, createRng(seed)).slice(0, 3);

export const dailyMissions = (day: string) => pick3(DAILY_POOL, `missions:${day}`);
export const weeklyMissions = (day: string) => pick3(WEEKLY_POOL, `weekly:${weekKey(day)}`);

/** The Monday (YYYY-MM-DD) of the week containing `day`. */
export function weekKey(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Progress since the period began (base = counters at its start), capped at the target. */
export function missionProgress(m: Mission, stats: Stats, base: Stats): number {
  return Math.max(0, Math.min(m.target, (stats[m.stat] ?? 0) - (base[m.stat] ?? 0)));
}
