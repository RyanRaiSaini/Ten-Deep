import { capRoom, payOf, superstarBlocked } from './cap';
import { createRng } from './rng';
import {
  ALL_SLOTS, BENCH_SLOTS, STARTER_SLOTS, type Player, type Pool, type RosterSlots, type SlotId, type TeamSeason,
} from './types';

export { MAX_SUPERSTARS } from './cap';

export const RESPINS_PER_DRAFT = 1;
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
  /** Head-to-head: rival rosters whose remaining slots must stay fillable too. */
  rivals?: RosterSlots[];
  /** This player's seat among the rosters (fixed order shared by all players; default 0). */
  seat?: number;
  /**
   * Fair spins (2): each spin is keyed by round and attempt, so everyone on the same seed sees the same team in
   * every round, and a respin in one round never changes later rounds. Older saved drafts have no scheme and
   * keep the original sequence (spin number across the whole draft).
   */
  scheme?: 2;
  /** Spins made in the current round (scheme 2). */
  attempt?: number;
}

export interface DraftOption {
  player: Player;
  slots: SlotId[];
  affordable: boolean;
}

/** A draft on the original spin sequence, for replaying links and dailies made before fair spins. */
export function legacyDraft(d: DraftState): DraftState {
  const { scheme: _s, attempt: _a, ...rest } = d;
  return rest;
}

export function startDraft(pool: Pool, seed: string): DraftState {
  return { poolId: pool.id, seed, round: 0, respinsLeft: RESPINS_PER_DRAFT, roster: {}, used: [], spin: null, spins: 0, scheme: 2, attempt: 0 };
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
  if (state.scheme === 2) {
    // Draw from every team in a fixed order; skip a team only if all its players are taken (never in practice),
    // moving to the next attempt so the result still depends only on seed, round and attempt.
    let attempt = state.attempt ?? 0;
    for (let tries = 0; tries < 64; tries++, attempt++) {
      const team = createRng(`${state.seed}:spin:r${state.round}:a${attempt}`).pick(pool.teams);
      if (team.players.some((p) => !state.used.includes(p.id))) return { ...state, spin: team, spins: state.spins + 1, attempt: attempt + 1 };
    }
    throw new Error('Pool exhausted');
  }
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

/** A shop reroll: spin this round again without using a free respin. */
export function reroll(state: DraftState, pool: Pool): DraftState {
  if (isComplete(state) || !state.spin) throw new Error('Nothing to reroll');
  return landSpin(state, pool);
}

const sortedCache = new WeakMap<Pool, Player[]>();
function bySalary(pool: Pool): Player[] {
  let list = sortedCache.get(pool);
  if (!list) {
    // By real salary (cheapest first), not rating: a low-rated veteran can be expensive, a rookie cheap.
    list = pool.teams.flatMap((t) => t.players).sort((a, b) => payOf(a) - payOf(b) || a.ovr - b.ovr);
    sortedCache.set(pool, list);
  }
  return list;
}

/**
 * Cheapest way to fill every open slot with unused, position-eligible players from the pool.
 * Starter slots are reserved first (they're the constrained ones), then the bench.
 */
export function reserveNeeded(roster: RosterSlots, used: Set<string>, pool: Pool): number {
  return jointReserve([roster], used, pool)[0];
}

/**
 * Joint version for head-to-head drafts: fill every open slot on every roster with distinct players
 * (all starter slots first, then benches) and return each roster's cost (Infinity if impossible).
 * A rival can then never strand you by taking the cheap players your reserve was counting on.
 */
export function jointReserve(rosters: RosterSlots[], used: Set<string>, pool: Pool): number[] {
  const taken = new Set(used);
  const costs = rosters.map(() => 0);
  for (const group of [STARTER_SLOTS, BENCH_SLOTS])
    for (const slot of group)
      rosters.forEach((roster, i) => {
        if (roster[slot] || costs[i] === Infinity) return;
        const bench = BENCH_SLOTS.includes(slot);
        const p = bySalary(pool).find((x) => !taken.has(x.id) && (bench || x.pos === slot || x.pos2 === slot));
        if (!p) {
          costs[i] = Infinity;
          return;
        }
        taken.add(p.id);
        costs[i] = Math.round((costs[i] + payOf(p)) * 10) / 10;
      });
  return costs;
}

/** Slots where placing `p` still leaves room to fill the rest of the roster from what's left in the pool. */
export function affordableSlots(state: DraftState, p: Player, pool: Pool): SlotId[] {
  if (superstarBlocked(state.roster, p)) return [];
  const used = new Set([...state.used, p.id]);
  const rivals = state.rivals ?? [];
  const at = state.seat ?? 0;
  return eligibleSlots(state, p).filter((slot) => {
    const roster = { ...state.roster, [slot]: p };
    // Fixed seating order: every player checks the same joint fill, so no one's check strands another.
    const seated = [...rivals];
    seated.splice(at, 0, roster);
    const costs = jointReserve(seated, used, pool);
    return seated.every((r, i) => capRoom(r) >= costs[i]);
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
    ...(state.scheme === 2 ? { attempt: 0 } : {}),
  };
}

/** Cheapest eligible, affordable, unused player anywhere in the pool (ties → higher overall). */
export function fallbackPick(state: DraftState, pool: Pool): Player {
  // Cheapest first; the reserve guarantees the cheapest eligible player always fits.
  const ok = bySalary(pool).filter((p) => !state.used.includes(p.id) && affordableSlots(state, p, pool).length > 0);
  if (ok.length === 0) throw new Error('No fallback player available');
  const cheapest = payOf(ok[0]);
  return ok.filter((p) => payOf(p) === cheapest).sort((a, b) => b.ovr - a.ovr)[0];
}
