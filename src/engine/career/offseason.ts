/**
 * The offseason as a series of pure steps, so the UI can pause for the user's decisions:
 * startOffseason → resolveExpiring → rookieDraft → (user free agency via signFreeAgent) → aiFreeAgency → finalizeOffseason.
 */
import { APRON, MIN_CONTRACT, capRoom, payOf, rookieScale, salaryFor } from '../cap';
import { affordableSlots, startDraft } from '../draft';
import { createRng } from '../rng';
import { ALL_SLOTS, BENCH_SLOTS, STARTER_SLOTS, type Player, type Pool, type Roster, type RosterSlots, type SlotId, type TeamSeason, playsPos } from '../types';
import { progressPlayer, retires } from './aging';
import { ROOKIE_YEARS, type Contracts } from './contracts';
import { draftOrder } from './lottery';
import { generateJourneymen, generateRookieClass } from './rookies';
import { reseat } from '../reseat';

export interface OffTeam {
  id: string;
  name: string;
  colors: [string, string];
  slots: RosterSlots;
  franchise?: string;
}

export interface OffseasonState {
  /** The season about to start (2 for the first offseason). */
  season: number;
  seed: string;
  teams: OffTeam[];
  contracts: Contracts;
  freeAgents: Player[];
  retired: Player[];
  /** How the user's players changed this offseason. */
  changes: { id: string; name: string; from: number; to: number; age: number }[];
  /** User players whose contract just ran out (decide: re-sign or release). */
  expiring: string[];
  /** Draft order, team indexes, first pick first. */
  order: number[];
  rookies: Player[];
  /** Rookie picked by each team this draft (team index → player id). */
  picks: Record<number, string>;
  /** Your players traded away this offseason. */
  traded?: string[];
}

export const RESIGN_THRESHOLD = 75;
/** Rookie-scale deals: the real rookie scale by draft slot (cheap for what they give you: why drafting well matters). */
export const rookieSalary = (pick: number) => rookieScale(pick);
/** Released players hit the market at their current asking price. */
const unsigned = (p: Player): Player => { const { salary: _s, contractType: _c, ...rest } = p; return { ...rest, released: true }; };
/** A new deal replaces the old one, including what kind it was (a re-signed rookie is no longer on the scale). */
const signedAt = (p: Player, salary = salaryFor(p.ovr)): Player => ({ ...unsigned(p), salary });

export function seasonLabel(n: number): string {
  const y = 2025 + n;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

const players = (t: OffTeam) => ALL_SLOTS.map((k) => t.slots[k]).filter((p): p is Player => !!p);
const openSlots = (t: OffTeam) => ALL_SLOTS.filter((k) => !t.slots[k]);
const allNames = (st: { teams: OffTeam[]; freeAgents: Player[] }) =>
  new Set([...st.teams.flatMap(players), ...st.freeAgents].map((p) => p.name));

export function startOffseason(o: {
  teams: Roster[]; contracts: Contracts; freeAgents: Player[]; season: number; seed: string; wins: number[]; playoff: Set<number>;
}): OffseasonState {
  const rng = createRng(`${o.seed}:off:${o.season}`);
  const contracts = { ...o.contracts };
  const retired: Player[] = [];
  const freeAgents: Player[] = [];
  const changes: OffseasonState['changes'] = [];
  const expiring: string[] = [];

  // Free agents age too; retirees leave the league.
  for (const p of o.freeAgents) {
    const np = progressPlayer(p, rng.fork(`fa:${p.id}`));
    if (!retires(np, np.ovr < p.ovr, rng.fork(`far:${p.id}`))) freeAgents.push(unsigned(np));
  }

  const teams: OffTeam[] = o.teams.map((t, ti) => {
    const slots: RosterSlots = {};
    for (const k of ALL_SLOTS) {
      const p = t.slots[k];
      const np = progressPlayer(p, rng.fork(`p:${p.id}`));
      if (ti === 0) changes.push({ id: p.id, name: p.name, from: p.ovr, to: np.ovr, age: np.age ?? 0 });
      if (retires(np, np.ovr < p.ovr, rng.fork(`r:${p.id}`))) {
        retired.push(np);
        delete contracts[p.id];
        continue;
      }
      contracts[p.id] = (contracts[p.id] ?? 1) - 1;
      if (contracts[p.id] > 0) slots[k] = np;
      else if (ti === 0) {
        slots[k] = np; // the user decides in resolveExpiring
        expiring.push(np.id);
      } else if (np.ovr >= RESIGN_THRESHOLD && capRoom({ ...t.slots, ...slots, [k]: signedAt(np) }) >= -10) {
        // AI re-signs good players at today's market rate, if the whole payroll stays roughly under the cap
        // (count every player, not just the ones already processed this loop)
        contracts[p.id] = rng.fork(`re:${p.id}`).int(1, 4);
        slots[k] = signedAt(np);
      } else {
        delete contracts[p.id];
        freeAgents.push(unsigned(np));
      }
    }
    return { id: t.id, name: t.name, colors: t.colors, slots, ...(t.franchise ? { franchise: t.franchise } : {}) };
  });

  const order = draftOrder(o.wins, o.playoff, rng.fork('lottery'));
  const rookies = generateRookieClass(o.season, o.seed, 30, allNames({ teams, freeAgents }));
  return { season: o.season, seed: o.seed, teams, contracts, freeAgents, retired, changes, expiring, order, rookies, picks: {} };
}

/** Payroll if the user re-signs `keep` (in that order) at today's market rates; expiring players not kept are gone. */
export function payrollAfterResign(st: OffseasonState, keep: string[]): number {
  const slots = st.teams[0].slots;
  let total = 0;
  for (const k of ALL_SLOTS) {
    const p = slots[k];
    if (!p) continue;
    if (!st.expiring.includes(p.id)) total += payOf(p);
    else if (keep.includes(p.id)) total += salaryFor(p.ovr);
  }
  return total;
}

/**
 * The user re-signs `keep` (new 1–4 year deals) at market rates, as long as payroll stays under the apron
 * (re-signing your own players may go over the cap, not past the apron). Everyone else becomes a free agent.
 */
export function resolveExpiring(st: OffseasonState, keep: string[]): OffseasonState {
  const user = { ...st.teams[0], slots: { ...st.teams[0].slots } };
  const contracts = { ...st.contracts };
  const freeAgents = [...st.freeAgents];
  const fits: string[] = [];
  for (const id of keep) if (payrollAfterResign(st, [...fits, id]) <= APRON) fits.push(id);
  for (const id of st.expiring) {
    const k = ALL_SLOTS.find((s) => user.slots[s]?.id === id);
    if (!k) continue;
    if (fits.includes(id)) {
      contracts[id] = createRng(`${st.seed}:resign:${st.season}:${id}`).int(1, 4);
      user.slots[k] = signedAt(user.slots[k]!); // new deal at today's market rate
    } else {
      freeAgents.push(unsigned(user.slots[k]!));
      delete user.slots[k];
      delete contracts[id];
    }
  }
  return { ...st, teams: [user, ...st.teams.slice(1)], contracts, freeAgents, expiring: [] };
}

/** Best open slot for a player: an eligible open starter spot, else any open bench spot, else any open spot. */
function slotFor(t: OffTeam, p: Player): SlotId | undefined {
  return STARTER_SLOTS.find((k) => !t.slots[k] && playsPos(p, k))
    ?? BENCH_SLOTS.find((k) => !t.slots[k])
    ?? ALL_SLOTS.find((k) => !t.slots[k]);
}

/**
 * Every team picks one rookie in draft order. The user takes `userPick` (default: best left).
 * A team with a full roster cuts to make room: the user cuts `userCut` (or declines the rookie if none given),
 * AI teams cut their lowest-rated player if the rookie is better.
 */
export function rookieDraft(st: OffseasonState, userPick?: string, userCut?: SlotId): OffseasonState {
  let rookies = [...st.rookies];
  const teams = st.teams.map((t) => ({ ...t, slots: { ...t.slots } }));
  const freeAgents = [...st.freeAgents];
  const contracts = { ...st.contracts };
  const picks: Record<number, string> = {};
  let pickNo = 0;
  for (const ti of st.order) {
    pickNo++;
    if (!rookies.length) break;
    const r = (ti === 0 && rookies.find((x) => x.id === userPick)) || rookies[0];
    rookies = rookies.filter((x) => x.id !== r.id);
    picks[ti] = r.id;
    const t = teams[ti];
    let slot = slotFor(t, r);
    if (!slot) {
      if (ti === 0) {
        if (userCut && t.slots[userCut]) {
          freeAgents.push(unsigned(t.slots[userCut]!));
          delete contracts[t.slots[userCut]!.id];
          slot = userCut;
        }
      } else {
        const low = ALL_SLOTS.reduce((a, b) => (t.slots[a]!.ovr <= t.slots[b]!.ovr ? a : b));
        if (r.ovr > t.slots[low]!.ovr) {
          freeAgents.push(unsigned(t.slots[low]!));
          delete contracts[t.slots[low]!.id];
          slot = low;
        }
      }
    }
    if (slot) {
      t.slots[slot] = { ...signedAt(r, rookieSalary(pickNo)), contractType: 'rookie' };
      contracts[r.id] = ROOKIE_YEARS;
    } else freeAgents.push(r);
  }
  // A rookie dropped into a cut player's spot may not play it: re-seat so every starter is in position.
  return { ...st, teams: teams.map((t) => ({ ...t, slots: reseat(t.slots) })), freeAgents: [...freeAgents, ...rookies], contracts, rookies: [], picks };
}

/** Free agents as a spinnable pool: one "team" per position group. */
export function faPool(st: Pick<OffseasonState, 'freeAgents' | 'season'>): Pool {
  const bin = (id: string, label: string, pos: string[]): TeamSeason => ({
    id: `fa-${id}`, label, city: 'Free', name: 'Agents', season: String(st.season), colors: ['#3DF2C2', '#141B2E'],
    players: st.freeAgents.filter((p) => pos.includes(p.pos)),
  });
  return {
    id: 'free-agents', label: 'Free Agents',
    teams: [bin('guards', 'Free-agent guards', ['PG', 'SG']), bin('wings', 'Free-agent wings', ['SF']), bin('bigs', 'Free-agent bigs', ['PF', 'C'])]
      .filter((t) => t.players.length),
  };
}

/** Top the free-agent pool up with journeymen so every open slot can always be filled. */
export function ensureDepth(st: OffseasonState): OffseasonState {
  const open = st.teams.reduce((n, t) => n + openSlots(t).length, 0);
  const need = open + 25 - st.freeAgents.length;
  if (need <= 0) return st;
  return { ...st, freeAgents: [...st.freeAgents, ...generateJourneymen(st.season, st.seed, need, allNames(st))] };
}

/** Sign `player` (a free agent) into team `ti`'s `slot`. */
export function signFreeAgent(st: OffseasonState, ti: number, player: Player, slot: SlotId, salary?: number): OffseasonState {
  const teams = [...st.teams];
  teams[ti] = { ...teams[ti], slots: { ...teams[ti].slots, [slot]: salary === undefined ? signedAt(player) : { ...signedAt(player, salary), contractType: 'min' } } };
  const years = createRng(`${st.seed}:fa:${st.season}:${player.id}`).int(1, 3);
  return { ...st, teams, freeAgents: st.freeAgents.filter((p) => p.id !== player.id), contracts: { ...st.contracts, [player.id]: years } };
}

/** What team `ti` can afford right now: candidates with legal slots (cap, position). */
export function affordableFor(st: OffseasonState, ti: number): { player: Player; slots: SlotId[] }[] {
  const pool = faPool(st);
  const draft = { ...startDraft(pool, 'fa'), roster: st.teams[ti].slots };
  return st.freeAgents
    .map((player) => ({ player, slots: affordableSlots(draft, player, pool) }))
    .filter((x) => x.slots.length);
}

/**
 * Over the cap: the minimum exception lets a team sign a free agent to a minimum deal into any open slot
 * (the real NBA's minimum-salary exception). The best player willing to take the minimum: the lowest asking price.
 */
export function minimumException(st: OffseasonState, ti: number): { player: Player; slot: SlotId; salary: number } | null {
  const slot = openSlots(st.teams[ti])[0];
  const player = [...st.freeAgents].sort((a, b) => salaryFor(a.ovr) - salaryFor(b.ovr) || a.ovr - b.ovr)[0];
  return slot && player ? { player, slot, salary: MIN_CONTRACT } : null;
}

/** AI teams (and, in simulations, the user) fill open slots with the best affordable free agents. */
export function aiFreeAgency(st: OffseasonState, includeUser = false): OffseasonState {
  let s = ensureDepth(st);
  for (let ti = includeUser ? 0 : 1; ti < s.teams.length; ti++) {
    while (openSlots(s.teams[ti]).length) {
      const best = affordableFor(s, ti).sort((a, b) => b.player.ovr - a.player.ovr)[0];
      const move = best ? { player: best.player, slot: best.slots[0], salary: undefined } : minimumException(s, ti);
      if (!move) break;
      s = signFreeAgent(s, ti, move.player, move.slot, move.salary);
    }
  }
  return s;
}

export function openSlotCount(st: OffseasonState, ti: number): number {
  return openSlots(st.teams[ti]).length;
}

/** All rosters full again: back to season-ready Rosters. */
export function finalizeOffseason(st: OffseasonState): Roster[] {
  return st.teams.map((t) => {
    if (openSlots(t).length) throw new Error(`${t.name} still has open roster spots`);
    return { id: t.id, name: t.name, colors: t.colors, slots: t.slots as Required<RosterSlots>, ...(t.franchise ? { franchise: t.franchise } : {}) };
  });
}
