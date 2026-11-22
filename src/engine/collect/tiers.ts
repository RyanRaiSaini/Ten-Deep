import type { Pos } from '../types';

/** Collectible tiers, lowest to highest. (Deliberately not 2K's gem names.) */
export const TIERS = ['common', 'uncommon', 'rare', 'epic', 'mythic', 'ultra'] as const;
export type Tier = (typeof TIERS)[number];

export function tierOf(ovr: number): Tier {
  return ovr >= 95 ? 'ultra' : ovr >= 90 ? 'mythic' : ovr >= 85 ? 'epic' : ovr >= 80 ? 'rare' : ovr >= 75 ? 'uncommon' : 'common';
}

/** A collectible card: one player in one season. */
export interface Card {
  id: string;
  name: string;
  /** e.g. "2016" or "2026-27" */
  season: string;
  /** e.g. "2016 Cavaliers" */
  team: string;
  pos: Pos;
  pos2?: Pos;
  ovr: number;
  tier: Tier;
  colors: [string, string];
  tag?: string;
}
