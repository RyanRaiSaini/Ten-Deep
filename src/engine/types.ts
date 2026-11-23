export type Pos = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export const POSITIONS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];

export interface Player {
  id: string;
  name: string;
  pos: Pos;
  pos2?: Pos;
  /** Overall rating, 64–99. */
  ovr: number;
  off: number;
  def: number;
  reb: number;
  ast: number;
  three: number;
  /** Durability 0–100: higher means fewer injuries. */
  dur: number;
  age?: number;
  /** In his first NBA season (Current Day: the 2026 draft class). */
  rookie?: boolean;
  tag?: string;
  /** Career mode: salary locked in when signed ($M). Without it, salary follows the current rating. */
  salary?: number;
  /** Data needs owner verification (e.g. roster move after mid-2026). */
  verify?: boolean;
  stats?: { ppg: number; rpg: number; apg: number };
  accolades?: string[];
}

export interface TeamSeason {
  id: string;
  label: string;
  city: string;
  name: string;
  season: string;
  colors: [string, string];
  players: Player[];
  /** Franchise key for historical seasons (e.g. 'lal'). */
  franchise?: string;
}

export interface Pool {
  id: string;
  label: string;
  teams: TeamSeason[];
}

export type SlotId = 'PG' | 'SG' | 'SF' | 'PF' | 'C' | 'B1' | 'B2' | 'B3' | 'B4' | 'B5';
export const STARTER_SLOTS: SlotId[] = ['PG', 'SG', 'SF', 'PF', 'C'];
export const BENCH_SLOTS: SlotId[] = ['B1', 'B2', 'B3', 'B4', 'B5'];
export const ALL_SLOTS: SlotId[] = [...STARTER_SLOTS, ...BENCH_SLOTS];

export type RosterSlots = Partial<Record<SlotId, Player>>;

export interface Roster {
  id: string;
  name: string;
  colors: [string, string];
  slots: Required<RosterSlots>;
  /** Temporary team-wide rating modifier (Management Crisis cards). */
  mod?: number;
}

export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(arr: readonly T[]): T;
  normal(mean: number, sd: number): number;
  fork(salt: string): Rng;
}
