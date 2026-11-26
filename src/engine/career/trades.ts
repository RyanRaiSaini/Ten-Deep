/** Offseason trades: one of yours for one of theirs. The AI says yes only when it comes out ahead. */
import { capRoom, payOf, salaryFor, superstarBlocked } from '../cap';
import { STARTER_SLOTS, type Player, type SlotId, playsPos } from '../types';
import type { OffseasonState } from './offseason';

/** What a player is worth to a GM: rating, adjusted for age and for how fair the contract is. */
export function tradeValue(p: Player): number {
  const age = p.age ?? 27;
  const ageAdj = age <= 23 ? 3 : age <= 26 ? 1.5 : age <= 30 ? 0 : -(age - 30) * 1.5;
  const contractAdj = -(payOf(p) - salaryFor(p.ovr)) * 0.12;
  return p.ovr + ageAdj + contractAdj;
}

/** The AI wants a small edge before it says yes. */
const AI_EDGE = 1;
/** How far over the cap a trade may take a team (same rule as AI re-signing). */
const CAP_SLACK = -10;

export type TradeVerdict = { ok: true } | { ok: false; reason: 'value' | 'cap' | 'position' | 'stars' | 'missing' };

const slotOf = (slots: OffseasonState['teams'][number]['slots'], id: string) =>
  (Object.keys(slots) as SlotId[]).find((k) => slots[k]?.id === id);
const fits = (p: Player, slot: SlotId) => !STARTER_SLOTS.includes(slot) || playsPos(p, slot);

export function evaluateTrade(st: OffseasonState, give: string, team: number, get: string): TradeVerdict {
  const mine = st.teams[0].slots;
  const theirs = st.teams[team]?.slots;
  const myK = slotOf(mine, give);
  const theirK = theirs && slotOf(theirs, get);
  if (!myK || !theirK || !theirs) return { ok: false, reason: 'missing' };
  const out = mine[myK]!;
  const inc = theirs[theirK]!;
  if (!fits(inc, myK) || !fits(out, theirK)) return { ok: false, reason: 'position' };
  // Same two-superstar rule as the draft and the deadline, for both sides.
  if (superstarBlocked({ ...mine, [myK]: undefined }, inc) || superstarBlocked({ ...theirs, [theirK]: undefined }, out)) return { ok: false, reason: 'stars' };
  const afterMine = { ...mine, [myK]: inc };
  const afterTheirs = { ...theirs, [theirK]: out };
  // A trade may not push a team further over the cap than the slack allows (getting cheaper is always fine).
  for (const [before, after] of [[mine, afterMine], [theirs, afterTheirs]] as const) {
    if (capRoom(after) < CAP_SLACK && capRoom(after) < capRoom(before)) return { ok: false, reason: 'cap' };
  }
  if (tradeValue(out) < tradeValue(inc) + AI_EDGE) return { ok: false, reason: 'value' };
  return { ok: true };
}

/** Swap the two players (contracts travel with them). Call only after evaluateTrade says ok. */
export function executeTrade(st: OffseasonState, give: string, team: number, get: string): OffseasonState {
  if (!evaluateTrade(st, give, team, get).ok) return st;
  const teams = st.teams.map((t) => ({ ...t, slots: { ...t.slots } }));
  const myK = slotOf(teams[0].slots, give)!;
  const theirK = slotOf(teams[team].slots, get)!;
  const out = teams[0].slots[myK]!;
  teams[0].slots[myK] = teams[team].slots[theirK]!;
  teams[team].slots[theirK] = out;
  return { ...st, teams, traded: [...(st.traded ?? []), give] };
}
