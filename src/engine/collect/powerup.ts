/**
 * Power-up taps: before opening a pick you get three taps; each has a
 * published chance to upgrade the whole pick one step. Rolls are seeded by the pick, so reloading can't re-roll.
 */
import { createRng } from '../rng';
import type { PickType } from './picks';

export const POWER_TAPS = 3;
/** Chance that tap 1, 2, 3 upgrades the pick. */
export const UPGRADE_CHANCE = [0.35, 0.25, 0.15] as const;
const STEPS: PickType[] = ['daily', 'run', 'playoffs', 'weekly', 'champion', 'mythic'];

/** The next pick type up, or null at the top (Mythic and Legendary don't upgrade further). */
export function nextType(t: PickType): PickType | null {
  const i = STEPS.indexOf(t);
  return i >= 0 && i < STEPS.length - 1 ? STEPS[i + 1] : null;
}

export function tapUpgrades(pickId: string, tap: number): boolean {
  if (tap < 0 || tap >= POWER_TAPS) return false;
  return createRng(`${pickId}:power:${tap}`).next() < UPGRADE_CHANCE[tap];
}
