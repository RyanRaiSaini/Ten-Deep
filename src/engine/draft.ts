import { canAfford, salaryFor } from './cap';
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

export function options(state: DraftState): DraftOption[] {
  if (!state.spin) return [];
  return state.spin.players
    .filter((p) => !state.used.includes(p.id))
    .map((player) => ({ player, slots: eligibleSlots(state, player), affordable: canAfford(state.roster, player) }))
    .sort((a, b) => b.player.ovr - a.player.ovr);
}

export function pick(state: DraftState, playerId: string, slot: SlotId): DraftState {
  if (!state.spin) throw new Error('No active spin');
  if (state.used.includes(playerId)) throw new Error('Player already drafted');
  const player = state.spin.players.find((p) => p.id === playerId) ?? null;
  return place(state, player, slot);
}

/** Place a fallback player (from anywhere in the pool) when a spin offers nothing usable. */
export function pickFallback(state: DraftState, player: Player, slot: SlotId): DraftState {
  if (state.used.includes(player.id)) throw new Error('Player already drafted');
  return place(state, player, slot);
}

function place(state: DraftState, player: Player | null, slot: SlotId): DraftState {
  if (!player) throw new Error('Player not in this spin');
  if (!eligibleSlots(state, player).includes(slot)) throw new Error(`Slot ${slot} not available for ${player.name}`);
  if (!canAfford(state.roster, player)) throw new Error('Over the cap');
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
  const all = pool.teams.flatMap((t) => t.players);
  const ok = all.filter(
    (p) => !state.used.includes(p.id) && eligibleSlots(state, p).length > 0 && canAfford(state.roster, p),
  );
  if (ok.length === 0) throw new Error('No fallback player available');
  ok.sort((a, b) => salaryFor(a.ovr) - salaryFor(b.ovr) || b.ovr - a.ovr);
  return ok[0];
}
