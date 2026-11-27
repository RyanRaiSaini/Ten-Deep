/**
 * Rebuild mode (Management Crisis B), Box to Box style: take over a real team with its real roster and payroll plus a
 * rebuild budget, decide on the coach, then go position by position (PG, SG, SF, PF, C, then the bench): keep the
 * player, or sell him for his contract and sign one of three priced options or a minimum bench option. Card stops
 * come between positions. Then tip-off: the season plays with the board, as in a Crisis Season.
 *
 * The league and season are built up front (round 0), so every rebuild move is the same swap the front office makes.
 */
import { CAP, capRoom } from '../cap';
import { assignDivisions, divOfFranchise, franchiseOf, LAYOUTS, DIVISIONS, type LayoutId } from '../conference';
import { createRng } from '../rng';
import { SEASON_GAMES, createSeason, type SeasonState } from '../season';
import { realLeague, realRotation } from '../realLeague';
import { ALL_SLOTS, type Roster, type RosterSlots, type TeamSeason } from '../types';
import { CARDS } from './cards';
import { available, type PlayCtx } from './play';
import { HAND, STOPS, drawnIds, type BoardState } from './state';
import { bumpPlayer } from './util';

/** Rebuild money on top of the real payroll: a quarter of the cap. */
export const REBUILD_BUDGET = CAP * 0.25;
/** Card stops come after these slots (SG, C and the third bench spot), like the cards between positions in the videos. */
export const STOP_AFTER = [1, 4, 7];
/** Steps: 0 = the takeover, 1 = the coach, 2–11 = PG…B5, 12 = ready for tip-off. */
export const COACH_STEP = 1;
export const FIRST_SLOT_STEP = 2;
export const TIPOFF_STEP = FIRST_SLOT_STEP + ALL_SLOTS.length;

export type CoachId = 'keep' | 'offense' | 'defense' | 'development';
export const COACHES: CoachId[] = ['keep', 'offense', 'defense', 'development'];
export const COACH_FEE: Record<CoachId, number> = { keep: 0, offense: CAP * 0.075, defense: CAP * 0.075, development: CAP * 0.05 };

export interface RebuildState {
  /** The team-season you took over, and its name for the screens. */
  teamId: string;
  name: string;
  season: string;
  colors: [string, string];
  franchise: string;
  step: number;
  coach: CoachId | null;
  /** Real payroll and Squad Rating when you took over. */
  payroll: number;
  sr0: number;
  /** Slot being sold (its options are on screen). */
  selling: string | null;
  /** Rebuild card stops played so far. */
  cards: number;
}

/** Card kinds and ids that make sense before a ball is bounced. */
const EVENTS_OK = new Set(['legend-comeback', 'contract-year']);
/** Demands about the starting five can't be met once the starters are done (they'd be free or impossible). */
const STARTER_DEMANDS = new Set(['break-core', 'positionless', 'defense-wins', 'space-floor', 'untouchable']);

export function rebuildCardOk(id: string, kind: string, cards: number): boolean {
  if (kind === 'event') return EVENTS_OK.has(id);
  if (cards > 0 && STARTER_DEMANDS.has(id)) return false;
  return true;
}

/** Six face-down cards for a rebuild stop (seeded by the season and the stop number). */
export function rebuildHand(b: BoardState, ctx: PlayCtx, n: number): string[] {
  const rng = createRng(`${ctx.season.seed}:rebuild:${n}`);
  const used = new Set(drawnIds(b));
  let left = CARDS.filter((c) => !used.has(c.id) && rebuildCardOk(c.id, c.kind, n) && available(c, b, ctx));
  const hand: string[] = [];
  const weight = { demand: 45, finance: 30, perk: 20, event: 5 } as const;
  while (hand.length < HAND && left.length) {
    const total = left.reduce((x, c) => x + weight[c.kind], 0);
    let roll = rng.next() * total;
    const c = left.find((x) => (roll -= weight[x.kind]) < 0) ?? left[left.length - 1];
    hand.push(c.id);
    left = left.filter((x) => x.id !== c.id);
  }
  return hand;
}

/** The layout of the league you're rebuilding in. */
export interface RebuildLeague {
  layout: LayoutId;
  /** The team-seasons the AI teams come from (that season's league), then a fallback, then today's league. */
  seasons: readonly TeamSeason[];
  fallback: readonly TeamSeason[];
  canonical: readonly TeamSeason[];
}

/** Take over a team: its real rotation, the rest of its league, and a season at game 0 with the rebuild budget. */
export function takeOver(team: TeamSeason, league: RebuildLeague, seed: string): { season: SeasonState; division: number; payroll: number } {
  const franchise = franchiseOf(team);
  // A short roster is topped up from the franchise's nearby seasons (as the AI teams are).
  const year = parseInt(team.season, 10);
  const names = new Set(team.players.map((p) => p.name));
  const depth = league.fallback.filter((t) => franchiseOf(t) === franchise && t.id !== team.id && Math.abs(parseInt(t.season, 10) - year) <= 5)
    .flatMap((t) => t.players).filter((p) => !names.has(p.name) && (names.add(p.name), true)).sort((a, b) => b.ovr - a.ovr);
  const slots = realRotation(team.players, 'user', depth) as Required<RosterSlots>;
  const user: Roster = { id: 'user', name: `${team.city} ${team.name}`, colors: team.colors, franchise, slots };
  const own = LAYOUTS[league.layout];
  const division = divOfFranchise(franchise, league.layout) ?? own[0];
  // Every other franchise of that league; an even league in all (drop one from another division if needed).
  let others = own.flatMap((d) => DIVISIONS[d].franchises).filter((f) => f !== franchise);
  if ((others.length + 1) % 2 === 1) {
    const rng = createRng(`${seed}:rebuild-drop`);
    const far = others.filter((f) => divOfFranchise(f, league.layout) !== division);
    const drop = rng.pick(far.length ? far : others);
    others = others.filter((f) => f !== drop);
  }
  const ai = realLeague(others, ALL_SLOTS.map((k) => slots[k]), seed, league.seasons, league.fallback, league.canonical);
  const divs = assignDivisions([franchise, ...others], division);
  const base = createSeason(user, ai, seed, divs);
  const payroll = Math.round((CAP - capRoom(slots)) * 10) / 10;
  // Your spending money is the rebuild budget, whatever the payroll: fees are set so the room left is exactly that.
  const fees = Math.round((capRoom(slots) - REBUILD_BUDGET) * 10) / 10;
  return { season: { ...base, stops: STOPS.slice(1), fees }, division, payroll };
}

/** Tip-off: the coach's effect lands on the season. */
export function applyCoach(s: SeasonState, coach: CoachId | null): SeasonState {
  const mod = (amount: number, from: number, to: number) => ({ amount, fromRound: from, toRound: to });
  switch (coach) {
    case 'offense':
      return { ...s, mods: [...(s.mods ?? []), mod(3, 0, 41), mod(1, 41, SEASON_GAMES)] };
    case 'defense':
      return { ...s, mods: [...(s.mods ?? []), mod(2, 0, SEASON_GAMES)] };
    case 'development': {
      let out = s;
      for (const k of ALL_SLOTS) { const p = s.teams[0].slots[k]; if ((p.age ?? 99) <= 24) out = bumpPlayer(out, p.id, 2); }
      return out;
    }
    default:
      return s;
  }
}

/** The slot a step is about, if it's a position step. */
export const slotOfStep = (step: number) => (step >= FIRST_SLOT_STEP && step < TIPOFF_STEP ? ALL_SLOTS[step - FIRST_SLOT_STEP] : null);
/** Does finishing this step open a card stop? */
export const stopAfterStep = (step: number) => STOP_AFTER.includes(step - FIRST_SLOT_STEP);
