import { capRoom, salaryFor, superstarBlocked } from './cap';

export { MAX_SUPERSTARS } from './cap';
import { createRng } from './rng';
import {
  ALL_SLOTS, BENCH_SLOTS, type Player, type Pool, type RosterSlots, type SlotId, type TeamSeason,
} from './types';

export const RESPINS_PER_DRAFT = 2;
export const ROUNDS = 10;

export interface DraftState {
  poolId: string;
  seed: string;
  round: number;
  respinsLeft: number;
  roster: RosterSlots;
  /** Player ids already drafted (array, not Set, so state serializes to JSON). */
  used: string[];
  spin: TeamSeason | null;
  /** Count of spins made so far; feeds the deterministic spin RNG. */
  spins: number;
}

export interface DraftOption {
  player: Player;
  slots: SlotId[];
  affordable: boolean;
}

export function startDraft(pool: Pool, seed: string): DraftState {
  return { poolId: pool.id, seed, round: 0, respinsLeft: RESPINS_PER_DRAFT, roster: {}, used: [], spin: null, spins: 0 };
}

export function isComplete(state: DraftState): boolean {
  return ALL_SLOTS.every((s) => state.roster[s]);
}

export function eligibleSlots(state: DraftState, p: Player): SlotId[] {
  return ALL_SLOTS.filter((slot) => {
    if (state.roster[slot]) return false;
    if (BENCH_SLOTS.includes(slot)) return true;
    return slot === p.pos || slot === p.pos2;
  });
}

function landSpin(state: DraftState, pool: Pool): DraftState {
  const rng = createRng(`${state.seed}:spin:${state.spins}`);
  const candidates = pool.teams.filter((t) => t.players.some((p) => !state.used.includes(p.id)));
  if (candidates.length === 0) throw new Error('Pool exhausted');
  return { ...state, spin: rng.pick(candidates), spins: state.spins + 1 };
}

/** Spin for the current round. Spins derive from seed + spin count, so the same seed gives the same spins. */
export function spin(state: DraftState, pool: Pool): DraftState {
  if (isComplete(state)) throw new Error('Draft complete');
  return landSpin(state, pool);
}

export function respin(state: DraftState, pool: Pool): DraftState {
  if (state.respinsLeft <= 0) throw new Error('No respins left');
  return landSpin({ ...state, respinsLeft: state.respinsLeft - 1 }, pool);
}

const sortedCache = new WeakMap<Pool, Player[]>();
function bySalary(pool: Pool): Player[] {
  let list = sortedCache.get(pool);
  if (!list) {
    list = pool.teams.flatMap((t) => t.players).sort((a, b) => a.ovr - b.ovr);
    sortedCache.set(pool, list);
  }
  return list;
}

/**
 * Cheapest way to fill every open slot with unused, position-eligible players from the pool.
 * Starter slots are reserved first (they're the constrained ones), then the bench.
 */
export function reserveNeeded(roster: RosterSlots, used: Set<string>, pool: Pool): number {
  const taken = new Set(used);
  let total = 0;
  for (const slot of ALL_SLOTS) {
    if (roster[slot]) continue;
    const bench = BENCH_SLOTS.includes(slot);
    const p = bySalary(pool).find((x) => !taken.has(x.id) && (bench || x.pos === slot || x.pos2 === slot));
    if (!p) return Infinity;
    taken.add(p.id);
    total += salaryFor(p.ovr);
  }
  return total;
}

/** Slots where placing `p` still leaves room to fill the rest of the roster from what's left in the pool. */
export function affordableSlots(state: DraftState, p: Player, pool: Pool): SlotId[] {
  if (superstarBlocked(state.roster, p)) return [];
  const used = new Set([...state.used, p.id]);
  return eligibleSlots(state, p).filter((slot) => {
    const roster = { ...state.roster, [slot]: p };
    return capRoom(roster) >= reserveNeeded(roster, used, pool);
  });
}

export function options(state: DraftState, pool: Pool): DraftOption[] {
  if (!state.spin) return [];
  return state.spin.players
    .filter((p) => !state.used.includes(p.id))
    .map((player) => {
      const ok = affordableSlots(state, player, pool);
      return ok.length
        ? { player, slots: ok, affordable: true }
        : { player, slots: eligibleSlots(state, player), affordable: false };
    })
    .sort((a, b) => b.player.ovr - a.player.ovr);
}

export function pick(state: DraftState, playerId: string, slot: SlotId, pool: Pool): DraftState {
  if (!state.spin) throw new Error('No active spin');
  if (state.used.includes(playerId)) throw new Error('Player already drafted');
  const player = state.spin.players.find((p) => p.id === playerId) ?? null;
  return place(state, player, slot, pool);
}

/** Place a fallback player (from anywhere in the pool) when a spin offers nothing usable. */
export function pickFallback(state: DraftState, player: Player, slot: SlotId, pool: Pool): DraftState {
  if (state.used.includes(player.id)) throw new Error('Player already drafted');
  return place(state, player, slot, pool);
}

function place(state: DraftState, player: Player | null, slot: SlotId, pool: Pool): DraftState {
  if (!player) throw new Error('Player not in this spin');
  if (!eligibleSlots(state, player).includes(slot)) throw new Error(`Slot ${slot} not available for ${player.name}`);
  if (superstarBlocked(state.roster, player)) throw new Error('Superstar limit reached (max 2 players rated 95+)');
  if (!affordableSlots(state, player, pool).includes(slot)) throw new Error('Over the cap');
  return {
    ...state,
    roster: { ...state.roster, [slot]: player },
    used: [...state.used, player.id],
    round: state.round + 1,
    spin: null,
  };
}

/** Cheapest eligible, affordable, unused player anywhere in the pool (ties → higher overall). */
export function fallbackPick(state: DraftState, pool: Pool): Player {
  // Cheapest first; the reserve guarantees the cheapest eligible player always fits.
  const ok = bySalary(pool).filter((p) => !state.used.includes(p.id) && affordableSlots(state, p, pool).length > 0);
  if (ok.length === 0) throw new Error('No fallback player available');
  const cheapest = salaryFor(ok[0].ovr);
  return ok.filter((p) => salaryFor(p.ovr) === cheapest).sort((a, b) => b.ovr - a.ovr)[0];
}
