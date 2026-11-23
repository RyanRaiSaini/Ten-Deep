/** Sets: every team-season is a set of its player cards. Completing one pays a pick. */
import { HISTORY } from '../../data/modes';
import { teamStrengthScore } from '../daily';
import type { PickType } from './picks';

export interface CardSet {
  /** Team-season id, e.g. "chi-1996". */
  id: string;
  label: string;
  colors: [string, string];
  cards: string[];
  strength: number;
}

export const SETS: CardSet[] = HISTORY.map((t) => ({
  id: t.id, label: t.label, colors: t.colors, cards: t.players.map((p) => p.id), strength: teamStrengthScore(t),
}));

const BY_CARD = new Map<string, CardSet[]>();
for (const s of SETS) for (const c of s.cards) BY_CARD.set(c, [...(BY_CARD.get(c) ?? []), s]);

export const setsFor = (cardId: string) => BY_CARD.get(cardId) ?? [];

/** Elite teams (top-8 average 83+) pay a Mythic pick; everything else a Weekly pick. */
export function setReward(s: CardSet): PickType {
  return s.strength >= 83 ? 'mythic' : 'weekly';
}

/** Sets that are complete in `after` but weren't in `before`. */
export function newlyCompleted(before: Set<string>, after: Set<string>): CardSet[] {
  const changed = [...after].filter((id) => !before.has(id));
  const touched = new Set(changed.flatMap((id) => setsFor(id)));
  return [...touched].filter((s) => s.cards.every((c) => after.has(c)) && !s.cards.every((c) => before.has(c)));
}

/** Incomplete sets you're closest to finishing (fewest missing, then strongest). */
export function closestSets(owned: Set<string>, n: number) {
  return SETS.map((set) => ({ set, have: set.cards.filter((c) => owned.has(c)).length }))
    .filter((x) => x.have > 0 && x.have < x.set.cards.length)
    .sort((a, b) => (a.set.cards.length - a.have) - (b.set.cards.length - b.have) || b.set.strength - a.set.strength)
    .slice(0, n);
}

export function completedSets(owned: Set<string>): CardSet[] {
  return SETS.filter((s) => s.cards.every((c) => owned.has(c)));
}
