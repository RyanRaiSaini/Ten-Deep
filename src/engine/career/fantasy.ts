/**
 * Dynasty's fantasy draft: all 30 teams draft today's league from scratch, 10 rounds, snake order (the last pick of
 * a round picks first in the next). You draft from your spun slot; the AI takes the best player available for its
 * needs (rating, age, and the positions its starting five still lacks).
 */
import { createRng, shuffle } from '../rng';
import { realRotation } from '../realLeague';
import { POSITIONS, type Player, type Pos, type Roster, type RosterSlots, type TeamSeason, playsPos } from '../types';

export const ROUNDS = 10;

export interface FantasyDraft {
  seed: string;
  /** The franchise drafting from each slot (slot 0 picks first in round 1). */
  order: string[];
  /** Your slot in `order`. */
  userSlot: number;
  /** Player ids drafted by each slot, in pick order. */
  picks: string[][];
  /** Overall picks made so far (0 … 30 × ROUNDS). */
  made: number;
}

export const totalPicks = (fd: FantasyDraft) => fd.order.length * ROUNDS;
export const draftDone = (fd: FantasyDraft) => fd.made >= totalPicks(fd);
export const roundOf = (n: number, teams: number) => Math.floor(n / teams);

/** The slot on the clock for overall pick n (snake order). */
export function slotForPick(n: number, teams: number): number {
  const r = Math.floor(n / teams);
  const i = n % teams;
  return r % 2 === 0 ? i : teams - 1 - i;
}

/** How many picks until your next one (0 = you're on the clock); -1 when you have no picks left. */
export function picksUntilUser(fd: FantasyDraft): number {
  for (let n = fd.made; n < totalPicks(fd); n++) if (slotForPick(n, fd.order.length) === fd.userSlot) return n - fd.made;
  return -1;
}

/** Start a draft: your franchise in your spun slot, the other 29 shuffled into the rest. */
export function newFantasy(userFranchise: string, userSlot: number, franchises: readonly string[], seed: string): FantasyDraft {
  const others = shuffle(franchises.filter((f) => f !== userFranchise), createRng(`${seed}:fantasy-order`));
  const order = [...others.slice(0, userSlot), userFranchise, ...others.slice(userSlot)];
  return { seed, order, userSlot, picks: order.map(() => []), made: 0 };
}

/** Today's league as one draft pool, one entry per player. */
export function draftPool(teams: readonly TeamSeason[]): Player[] {
  return [...new Map(teams.flatMap((t) => t.players).map((p) => [p.name, p])).values()].sort((a, b) => b.ovr - a.ovr);
}

export function available(fd: FantasyDraft, pool: readonly Player[]): Player[] {
  const taken = new Set(fd.picks.flat());
  return pool.filter((p) => !taken.has(p.id));
}

/**
 * The AI's pick: rating, nudged by age (a 21-year-old is worth a little more than a 33-year-old of the same rating),
 * plus a need bonus for a position its roster can't yet cover, and a little seeded noise so drafts differ.
 */
export function aiChoice(fd: FantasyDraft, slot: number, pool: readonly Player[]): Player {
  const mine = fd.picks[slot].map((id) => pool.find((p) => p.id === id)!).filter(Boolean);
  const uncovered = POSITIONS.filter((pos) => !mine.some((p) => playsPos(p, pos)));
  const rng = createRng(`${fd.seed}:ai:${fd.made}`);
  const round = roundOf(fd.made, fd.order.length);
  const value = (p: Player) => {
    const age = p.age ?? 27;
    const ageAdj = age <= 21 ? 2 : age <= 24 ? 1 : age >= 34 ? -3 : age >= 31 ? -1 : 0;
    const need = round >= 3 && uncovered.some((pos: Pos) => playsPos(p, pos)) ? 3 : 0;
    return p.ovr + ageAdj + need + (rng.next() - 0.5) * 1.5;
  };
  return available(fd, pool).slice(0, 40).reduce((best, p) => (value(p) > value(best) ? p : best));
}

export function makePick(fd: FantasyDraft, playerId: string): FantasyDraft {
  if (draftDone(fd) || fd.picks.flat().includes(playerId)) return fd;
  const slot = slotForPick(fd.made, fd.order.length);
  const picks = fd.picks.map((ps, i) => (i === slot ? [...ps, playerId] : ps));
  return { ...fd, picks, made: fd.made + 1 };
}

/** Let the AI pick until it's your turn (or the draft ends). `forUser` also auto-picks your remaining picks. */
export function simDraft(fd: FantasyDraft, pool: readonly Player[], forUser = false): FantasyDraft {
  let d = fd;
  while (!draftDone(d)) {
    const slot = slotForPick(d.made, d.order.length);
    if (slot === d.userSlot && !forUser) break;
    d = makePick(d, aiChoice(d, slot, pool).id);
  }
  return d;
}

/** The 30 drafted rosters as a league (yours first), each set into its best rotation. */
export function draftedLeague(fd: FantasyDraft, pool: readonly Player[], nameOf: (franchise: string) => { name: string; colors: [string, string] }): Roster[] {
  const byId = new Map(pool.map((p) => [p.id, p]));
  const slots = [fd.userSlot, ...fd.order.map((_, i) => i).filter((i) => i !== fd.userSlot)];
  return slots.map((slot, i) => {
    const f = fd.order[slot];
    const players = fd.picks[slot].map((id) => byId.get(id)!).filter(Boolean);
    const { name, colors } = nameOf(f);
    return { id: i === 0 ? 'user' : `ai-${i}`, name, colors, franchise: f, slots: realRotation(players, i === 0 ? 'user' : `ai-${i}`) as Required<RosterSlots> };
  });
}
