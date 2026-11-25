/**
 * Power-ups: one tap a day, used on any unopened pick, with a published chance to upgrade the whole pick one step.
 * Rolls are seeded by the pick and day, so reloading can't re-roll.
 */
import { createRng } from '../rng';
import type { PickType } from './picks';

/** Power-up taps per day (across all picks). */
export const POWER_TAPS_PER_DAY = 1;
/** Chance that the day's tap upgrades the pick. */
export const UPGRADE_CHANCE = 0.35;
const STEPS: PickType[] = ['daily', 'run', 'good', 'playoffs', 'weekly', 'confFinals', 'finals', 'champion', 'sweep', 'mythic'];

/** The next pick type up, or null at the top (Mythic, Legendary and Ultimate don't upgrade further). */
export function nextType(t: PickType): PickType | null {
  const i = STEPS.indexOf(t);
  return i >= 0 && i < STEPS.length - 1 ? STEPS[i + 1] : null;
}

export function tapUpgrades(pickId: string, day: string): boolean {
  return createRng(`${pickId}:power:${day}`).next() < UPGRADE_CHANCE;
}
