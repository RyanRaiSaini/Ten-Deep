/** Card lineups (10 cards from your collection) and the Gauntlet: 10 iconic teams, best-of-3 each. */
import { ALL_CARDS, CARD_BY_ID } from '../../data/cards';
import { HISTORY } from '../../data/modes';
import { rosterFromTeam, teamStrengthScore } from '../daily';
import { createRng } from '../rng';
import { bestOf, type SeriesResult } from '../series';
import { ALL_SLOTS, BENCH_SLOTS, STARTER_SLOTS, type Player, type Pos, type Roster, type RosterSlots, type SlotId, type TeamSeason } from '../types';
import type { PickType } from './picks';
import type { Card } from './tiers';

export type Lineup = Partial<Record<SlotId, string>>;

const PLAYER_BY_ID: Record<string, Player> = Object.fromEntries(HISTORY.flatMap((t) => t.players).map((p) => [p.id, p]));

/** The full player (with sub-ratings) behind a card. */
export function cardPlayer(id: string): Player {
  return PLAYER_BY_ID[id];
}

const fits = (c: Card, slot: SlotId) => BENCH_SLOTS.includes(slot) || c.pos === slot || c.pos2 === slot;

/** Can `cardId` go in `slot`? Starters must fit the position; each player (by name) only once. */
export function canPlace(lineup: Lineup, cardId: string, slot: SlotId): boolean {
  const c = CARD_BY_ID[cardId];
  if (!c || !fits(c, slot)) return false;
  return !ALL_SLOTS.some((k) => k !== slot && lineup[k] && CARD_BY_ID[lineup[k]!]?.name === c.name);
}

/** Franchise = team nickname ("Bulls"); decade from the season year. */
const franchise = (c: Card) => c.team.replace(/^\S+\s/, '');
const decade = (c: Card) => Math.floor(parseInt(c.season, 10) / 10) * 10;

export interface Chemistry {
  bonus: number;
  franchise: { name: string; count: number } | null;
  decade: { name: string; count: number } | null;
}

/** Up to +3: 3+ cards from one franchise +1 (5+ → +2); 5+ cards from one decade +1. */
export function chemistry(cards: Card[]): Chemistry {
  const top = (key: (c: Card) => string) => {
    const counts = new Map<string, number>();
    for (const c of cards) counts.set(key(c), (counts.get(key(c)) ?? 0) + 1);
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return best ? { name: best[0], count: best[1] } : null;
  };
  const f = top(franchise);
  const d = top((c) => `${decade(c)}s`);
  const bonus = Math.min(3, (f && f.count >= 5 ? 2 : f && f.count >= 3 ? 1 : 0) + (d && d.count >= 5 ? 1 : 0));
  return { bonus, franchise: f, decade: d };
}

function callup(slot: SlotId): Player {
  const pos = (STARTER_SLOTS.includes(slot) ? slot : 'SF') as Pos;
  return { id: `callup-${slot}`, name: 'Call-up', pos, ovr: 64, off: 62, def: 62, reb: 60, ast: 58, three: 58, dur: 90 };
}

/** Each duplicate of a card is a level, up to 3. */
export function cardLevel(count: number): number {
  return Math.max(0, Math.min(3, count - 1));
}

/** A card's player with its level applied: +1 rating per level, capped at 99. */
function leveled(p: Player, level: number): Player {
  if (!level) return p;
  const up = (v: number) => Math.min(99, v + level);
  return { ...p, ovr: up(p.ovr), off: up(p.off), def: up(p.def), reb: up(p.reb), ast: up(p.ast), three: up(p.three) };
}

/** A playable roster from a lineup: empty slots get call-ups; card levels apply; chemistry becomes a team modifier. */
export function lineupRoster(lineup: Lineup, levels: Record<string, number> = {}): Roster {
  const slots = Object.fromEntries(
    ALL_SLOTS.map((k) => [k, lineup[k] ? leveled(cardPlayer(lineup[k]!), levels[lineup[k]!] ?? 0) : callup(k)]),
  ) as Required<RosterSlots>;
  const cards = ALL_SLOTS.map((k) => lineup[k]).filter((id): id is string => !!id).map((id) => CARD_BY_ID[id]);
  return { id: 'collection', name: 'Your Lineup', colors: ['#B26BFF', '#3DF2C2'], slots, mod: chemistry(cards).bonus };
}

/** Best legal lineup from owned cards: strongest eligible starter per position, then the best bench. */
export function autoFill(owned: string[]): Lineup {
  const cards = owned.map((id) => CARD_BY_ID[id]).filter(Boolean).sort((a, b) => b.ovr - a.ovr);
  const lineup: Lineup = {};
  for (const slot of [...STARTER_SLOTS, ...BENCH_SLOTS]) {
    const c = cards.find((x) => canPlace(lineup, x.id, slot) && !Object.values(lineup).includes(x.id));
    if (c) lineup[slot] = c.id;
  }
  return lineup;
}

/** Welcome gift: 10 solid role players (74–80), one per lineup spot, so a new collector can play right away. */
export function starterSquad(seed: string): string[] {
  const rng = createRng(`starter-squad:${seed}`);
  const pool = ALL_CARDS.filter((c) => c.ovr >= 74 && c.ovr <= 80);
  const lineup: Lineup = {};
  for (const slot of ALL_SLOTS) {
    const fitsHere = pool.filter((c) => canPlace(lineup, c.id, slot));
    lineup[slot] = rng.pick(fitsHere).id;
  }
  return ALL_SLOTS.map((k) => lineup[k]!);
}

export interface GauntletStage {
  team: TeamSeason;
  strength: number;
}

/** 10 real team-seasons spread from good to all-time great (the last is the strongest in the database). */
export const GAUNTLET: GauntletStage[] = (() => {
  const teams = HISTORY.filter((t) => t.players.length >= 8 && !t.season.includes("-")) // historic seasons only
    .map((team) => ({ team, strength: teamStrengthScore(team) }))
    .sort((a, b) => a.strength - b.strength);
  const at = [0, 0.04, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92, 1];
  return at.map((q) => teams[Math.min(teams.length - 1, Math.round(q * (teams.length - 1)))]);
})();

/** Play a Gauntlet stage: your lineup ('a') vs that stage's team, best-of-3. */
export function playStage(lineup: Roster, stage: number, seed: string): SeriesResult {
  return bestOf(lineup, rosterFromTeam(GAUNTLET[stage].team), createRng(`gauntlet:${stage}:${seed}`), 2);
}

const REWARDS: Record<number, PickType> = { 2: 'playoffs', 5: 'weekly', 9: 'champion' };
/** Picks for clearing stages 3, 6 and 10 (indexes 2, 5, 9) the first time. */
export function stageReward(stage: number): PickType | null {
  return REWARDS[stage] ?? null;
}

export { ALL_CARDS };
