/** Player Picks: 5 cards, keep 1. Seeded, with published odds per pick type. */
import { createRng, shuffle } from '../rng';
import type { Rng } from '../types';
import { TIERS, type Card, type Tier } from './tiers';

export const PICK_TYPES = ['daily', 'run', 'playoffs', 'weekly', 'champion', 'mythic', 'legendary'] as const;
export type PickType = (typeof PICK_TYPES)[number];

type Odds = Record<Tier, number>;
const BASE: Odds = { common: 50, uncommon: 28, rare: 15, epic: 5.5, mythic: 1.3, ultra: 0.2 };
const PLAYOFFS: Odds = { common: 35, uncommon: 30, rare: 22, epic: 9, mythic: 3.3, ultra: 0.7 };
const WEEKLY: Odds = { common: 15, uncommon: 25, rare: 39, epic: 15.5, mythic: 4.5, ultra: 1 };
const CHAMPION: Odds = { common: 0, uncommon: 0, rare: 40, epic: 40, mythic: 16, ultra: 4 };

/** Per-card tier odds (percent) shown in the UI, plus each pick type's guarantee. */
export const PICK_ODDS: Record<PickType, Odds> = {
  daily: BASE, run: BASE, playoffs: PLAYOFFS, weekly: WEEKLY, champion: CHAMPION, mythic: WEEKLY, legendary: WEEKLY,
};
/** One card in these picks is forced into these tiers. */
const GUARANTEE: Partial<Record<PickType, Partial<Odds>>> = {
  mythic: { mythic: 85, ultra: 15 },
  legendary: { ultra: 100 },
};
/** Champion picks only contain 83+ cards. */
const MIN_OVR: Partial<Record<PickType, number>> = { champion: 83 };

function rollTier(odds: Partial<Odds>, rng: Rng): Tier {
  const entries = TIERS.map((t) => [t, odds[t] ?? 0] as const).filter(([, w]) => w > 0);
  let roll = rng.next() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [t, w] of entries) if ((roll -= w) < 0) return t;
  return entries[entries.length - 1][0];
}

export function generatePick(cards: Card[], type: PickType, seed: string): Card[] {
  const rng = createRng(`pick:${type}:${seed}`);
  const minOvr = MIN_OVR[type] ?? 0;
  const byTier = new Map<Tier, Card[]>(TIERS.map((t) => [t, cards.filter((c) => c.tier === t && c.ovr >= minOvr)]));
  const chosen: Card[] = [];
  for (let i = 0; i < 5; i++) {
    const odds = i === 0 && GUARANTEE[type] ? GUARANTEE[type]! : PICK_ODDS[type];
    // Re-roll if a tier is empty or exhausted (can't happen with real data, but never loop forever).
    for (let tries = 0; tries < 50; tries++) {
      const pool = (byTier.get(rollTier(odds, rng)) ?? []).filter((c) => !chosen.some((x) => x.id === c.id));
      if (pool.length) {
        chosen.push(rng.pick(pool));
        break;
      }
    }
  }
  return shuffle(chosen, rng);
}

/** Which pick a finished draft run earns. */
export function runPickType(r: { wins: number; champion: boolean; madePlayoffs: boolean }): PickType {
  if (r.wins >= 82) return 'legendary';
  if (r.champion) return 'champion';
  return r.madePlayoffs ? 'playoffs' : 'run';
}
