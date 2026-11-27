/** Board state for a Management Crisis season: confidence, the cards at each stop, demands, signings. */
import type { Player, Pos, SlotId } from '../types';
import { DEADLINE_GAME, SEASON_GAMES } from '../season';

/**
 * A run's card stops. An objective stop deals six board objectives (pick the one you must complete); an event stop
 * deals six good-or-bad events. Crisis Season: the objective before tip-off, one event at midseason. A Takeover deals
 * its objective and two events during the build (see rebuild.ts), then one event at midseason.
 */
export type StopKind = 'objective' | 'event';
export interface Stop { round: number; kind: StopKind }
export const MIDSEASON = 41;
export const CRISIS_PLAN: Stop[] = [{ round: 0, kind: 'objective' }, { round: MIDSEASON, kind: 'event' }];
export const TAKEOVER_SEASON_PLAN: Stop[] = [{ round: MIDSEASON, kind: 'event' }];
/** Older saves had seven stops at these rounds. */
export const STOPS = CRISIS_PLAN.map((x) => x.round);
/** Board Confidence for the objective: failing it costs 5, completing it is +2. */
export const OBJECTIVE_PENALTY = 5;
export const OBJECTIVE_REWARD = 2;
export const HAND = 6;
export const START_CONFIDENCE = 10;
export const MAX_CONFIDENCE = 10;
export const START_RESPINS = 2;

export type Status = 'active' | 'done' | 'failed' | 'vetoed';

export interface Demand {
  id: string;
  /** Round it was drawn and the round it's checked by. */
  from: number;
  due: number;
  status: Status;
  /** Round it was settled. */
  at?: number;
  penalty: number;
  /** Signings made before it was drawn (only later ones count toward it). */
  sig?: number;
  /** The run's objective (the big one on screen); passing it is worth OBJECTIVE_REWARD. */
  objective?: boolean;
  /** Teams named by the card (any of them counts). */
  franchises?: string[];
  /** What the card needs to remember: a target player, a franchise, the starters when it was drawn... */
  ids?: string[];
  pay?: number;
  franchise?: string;
  wins?: number;
  team?: number;
  /** Effects when it ends: rating cut for a player who forced his way out, a refund, a lifted slump. */
  onFail?: 'cut3';
  onDone?: 'refund' | 'lift';
  amount?: number;
  /** The card's wording: the player or team it named. */
  name?: string;
  city?: string;
}

export type Tier = 'low' | 'mid' | 'top' | 'bench' | 'perk';
export interface Signing {
  round: number;
  inId: string;
  inName: string;
  outName: string;
  outPay: number;
  pay: number;
  tier: Tier;
  pos: Pos;
  age?: number;
  /** The AI team he came from (a swap), if he wasn't a free agent. */
  fromTeam?: number;
}

/** What a card offered when it was revealed, and anything it needs remembered for the recap. */
export interface Offer {
  players?: Player[];
  outSlots?: SlotId[];
  options?: string[];
  target?: SlotId;
  /** Franchises a card names (any of them counts). */
  teams?: string[];
  /** AI team singled out (superteam rumor). */
  team?: number;
  /** For text: a player's name, a city, an amount. */
  name?: string;
  city?: string;
  amount?: number;
}

export interface Played {
  stop: number;
  round: number;
  id: string;
  /** The five you didn't pick, shown after the reveal. */
  missed: string[];
  choice?: string;
  name?: string;
}

export interface BoardEvent {
  round: number;
  kind: 'done' | 'failed' | 'hot' | 'cold' | 'fired' | 'refund';
  id?: string;
  delta: number;
}

export interface BoardState {
  v: 2;
  confidence: number;
  /** Index into the plan of the next stop to play. */
  stop: number;
  /** This run's stops (Crisis Season when missing). */
  plan?: Stop[];
  /** The six face-down cards at the current stop (null between stops). */
  hand: string[] | null;
  /** Revealed card awaiting your decision, and what it offers. */
  picked: string | null;
  offer: Offer | null;
  played: Played[];
  /** Cards shown face up at this stop (Scout's tip). */
  peek?: number[];
  demands: Demand[];
  signings: Signing[];
  respins: number;
  /** Respins spent (keeps the front office options fresh). */
  spins?: number;
  /** Perks you're holding: veto, scout-tip, agent-friend, second-look. */
  perks: string[];
  /** Next signing must be a bench option (roster crunch). */
  crunch?: boolean;
  events: BoardEvent[];
  /** The franchise your team plays for (the one your division left open), for "Local legend". */
  home: string;
  firedAt?: number;
  /** Record at the last stop, for hot and cold stretches. */
  lastW: number;
  lastL: number;
}

export const newBoard = (home: string, plan: Stop[] = CRISIS_PLAN): BoardState => ({
  v: 2, confidence: START_CONFIDENCE, stop: 0, plan, hand: null, picked: null, offer: null, played: [], demands: [], signings: [],
  respins: START_RESPINS, perks: [], events: [], home, lastW: 0, lastL: 0,
});

export const planOf = (b: BoardState): Stop[] => b.plan ?? CRISIS_PLAN;
/** The stop being played (or next to play). */
export const stopAt = (b: BoardState): Stop | undefined => planOf(b)[b.stop];
/** The rounds the season pauses at for cards (the preseason one is dealt before the first game). */
export const pauseRounds = (b: BoardState) => planOf(b).map((x) => x.round).filter((r) => r > 0);
/** The run's objective, if one was drawn. */
export const objectiveOf = (b: BoardState) => b.demands.find((d) => d.objective);

export const drawnIds = (b: BoardState) => b.played.map((p) => p.id);
export const activeDemands = (b: BoardState) => b.demands.filter((d) => d.status === 'active');

/** The round a demand is checked by. */
export function dueRound(due: 'next' | 'deadline' | 'end' | 'now' | 'games', round: number, stop: number, games = 0): number {
  switch (due) {
    case 'next': return round < DEADLINE_GAME ? DEADLINE_GAME : SEASON_GAMES;
    case 'deadline': return round < DEADLINE_GAME ? DEADLINE_GAME : SEASON_GAMES;
    case 'end': return SEASON_GAMES;
    case 'now': return round;
    case 'games': return Math.min(SEASON_GAMES, round + games);
  }
}
