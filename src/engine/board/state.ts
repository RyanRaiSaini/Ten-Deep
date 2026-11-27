/** Board state for a Management Crisis season: confidence, the cards at each stop, demands, signings. */
import type { Player, Pos, SlotId } from '../types';
import { DEADLINE_GAME, SEASON_GAMES } from '../season';

/** Card stops: preseason, then about every 12 games (Nov, Dec, Jan, Feb before the deadline, Mar, Apr). */
export const STOPS = [0, 12, 24, 36, 48, 60, 72];
export const STOP_MONTHS = ['preseason', 'nov', 'dec', 'jan', 'feb', 'mar', 'apr'] as const;
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
  /** Coin flip, double or nothing. */
  heads?: boolean;
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
  /** Index into STOPS of the next stop to play. */
  stop: number;
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

export const newBoard = (home: string): BoardState => ({
  v: 2, confidence: START_CONFIDENCE, stop: 0, hand: null, picked: null, offer: null, played: [], demands: [], signings: [],
  respins: START_RESPINS, perks: [], events: [], home, lastW: 0, lastL: 0,
});

export const drawnIds = (b: BoardState) => b.played.map((p) => p.id);
export const activeDemands = (b: BoardState) => b.demands.filter((d) => d.status === 'active');

/** The round a demand is checked by. */
export function dueRound(due: 'next' | 'deadline' | 'end' | 'now' | 'games', round: number, stop: number, games = 0): number {
  switch (due) {
    case 'next': return STOPS[stop + 1] ?? SEASON_GAMES;
    case 'deadline': return round < DEADLINE_GAME ? DEADLINE_GAME : SEASON_GAMES;
    case 'end': return SEASON_GAMES;
    case 'now': return round;
    case 'games': return Math.min(SEASON_GAMES, round + games);
  }
}
