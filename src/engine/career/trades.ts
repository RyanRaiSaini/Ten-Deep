/**
 * Offseason trades, the way the NBA does them: up to three players each way, salaries that have to match for a
 * team over the cap (it can take back at most 125% of what it sends), rosters that stay at ten or fewer, and a
 * GM who only says yes when the deal helps his team. Their GM can also tell you what it would take, and AI teams
 * call you with offers of their own.
 */
import { capRoom, payOf, salaryFor } from '../cap';
import { createRng, shuffle } from '../rng';
import { reseat, startersLegal } from '../reseat';
import { ALL_SLOTS, BENCH_SLOTS, type Player, type RosterSlots, type SlotId } from '../types';
import { released, type OffseasonState } from './offseason';

/** What a player is worth to a GM: rating, adjusted for age and for how fair the contract is. */
export function tradeValue(p: Player): number {
  const age = p.age ?? 27;
  const ageAdj = age <= 23 ? 3 : age <= 26 ? 1.5 : age <= 30 ? 0 : -(age - 30) * 1.5;
  const contractAdj = -(payOf(p) - salaryFor(p.ovr)) * 0.12;
  return p.ovr + ageAdj + contractAdj;
}

/** Up to three players a side. */
export const MAX_PER_SIDE = 3;
/** The AI wants a small edge before it says yes. */
export const AI_EDGE = 1;
/** Over the cap, a team can take back up to 125% of the salary it sends (plus a little, like the NBA's $100K). */
export const MATCH = 1.25;
const MATCH_PAD = 0.2;
/** Two good players aren't one great one: a package counts its best player fully, the next ones less. */
const WEIGHTS = [1, 0.55, 0.3];

/** A trade with team `team`: your players `give` for their players `get`. */
export interface TradePackage { team: number; give: string[]; get: string[] }

export type TradeVerdict =
  | { ok: true; gain: number }
  | { ok: false; reason: 'value' | 'cap' | 'position' | 'missing' | 'roster'; gain: number };

/** A package's worth to a GM: the best player counts fully, the rest less and less. */
export function packageValue(ps: Player[]): number {
  return [...ps].map(tradeValue).sort((a, b) => b - a).reduce((n, v, i) => n + v * (WEIGHTS[i] ?? 0.2), 0);
}

const players = (slots: RosterSlots) => ALL_SLOTS.map((k) => slots[k]).filter((p): p is Player => !!p);
const byIds = (slots: RosterSlots, ids: string[]) => ids.map((id) => players(slots).find((p) => p.id === id));
const total = (ps: Player[]) => Math.round(ps.reduce((n, p) => n + payOf(p), 0) * 10) / 10;

/**
 * A roster after sending `out` and taking `inc`: newcomers into the spots that opened, then any open spot;
 * starters re-seated. An AI team (`waive`) with no room waives its least valuable bench players, like an NBA team
 * cutting its last man; yours never loses anyone you didn't pick (null: no room).
 */
function after(slots: RosterSlots, out: Player[], inc: Player[], waive = false): { slots: RosterSlots; waived: Player[] } | null {
  const next: RosterSlots = { ...slots };
  const opened: SlotId[] = [];
  for (const p of out) {
    const k = ALL_SLOTS.find((s) => next[s]?.id === p.id);
    if (k) { delete next[k]; opened.push(k); }
  }
  const open = [...opened, ...BENCH_SLOTS.filter((k) => !next[k] && !opened.includes(k)), ...ALL_SLOTS.filter((k) => !next[k] && !opened.includes(k) && !BENCH_SLOTS.includes(k))];
  const waived: Player[] = [];
  if (waive) {
    const cuts = BENCH_SLOTS.filter((k) => next[k]).sort((a, b) => tradeValue(next[a]!) - tradeValue(next[b]!));
    while (open.length < inc.length && cuts.length) {
      const k = cuts.shift()!;
      waived.push(next[k]!);
      delete next[k];
      open.push(k);
    }
  }
  for (const p of inc) {
    const k = open.shift();
    if (!k) return null;
    next[k] = p;
  }
  return { slots: reseat(next), waived };
}

/** Salaries work for a team: under the cap afterwards, or taking back no more than 125% of what it sends. */
function salariesWork(before: RosterSlots, afterSlots: RosterSlots, out: Player[], inc: Player[]): boolean {
  if (capRoom(afterSlots) >= 0 || capRoom(afterSlots) >= capRoom(before)) return true;
  return total(inc) <= total(out) * MATCH + MATCH_PAD + 1e-9;
}

/** Is the deal legal, and does their GM say yes? `gain` is how much better (or worse) it makes his team. */
export function evaluatePackage(st: OffseasonState, pkg: TradePackage): TradeVerdict {
  const mine = st.teams[0]?.slots;
  const theirs = st.teams[pkg.team]?.slots;
  if (!mine || !theirs || pkg.team === 0 || !pkg.give.length || !pkg.get.length) return { ok: false, reason: 'missing', gain: 0 };
  if (pkg.give.length > MAX_PER_SIDE || pkg.get.length > MAX_PER_SIDE) return { ok: false, reason: 'roster', gain: 0 };
  const give = byIds(mine, pkg.give);
  const get = byIds(theirs, pkg.get);
  if (give.some((p) => !p) || get.some((p) => !p)) return { ok: false, reason: 'missing', gain: 0 };
  const out = give as Player[];
  const inc = get as Player[];
  const gain = Math.round((packageValue(out) - packageValue(inc)) * 10) / 10;
  const mineAfter = after(mine, out, inc)?.slots;
  const theirsAfter = after(theirs, inc, out, true)?.slots;
  if (!mineAfter || !theirsAfter) return { ok: false, reason: 'roster', gain };
  if (!startersLegal(mineAfter) || !startersLegal(theirsAfter)) return { ok: false, reason: 'position', gain };
  if (!salariesWork(mine, mineAfter, out, inc) || !salariesWork(theirs, theirsAfter, inc, out)) return { ok: false, reason: 'cap', gain };
  if (gain < AI_EDGE) return { ok: false, reason: 'value', gain };
  return { ok: true, gain };
}

/** Make the trade (contracts travel with the players). Does nothing unless their GM says yes. */
export function executePackage(st: OffseasonState, pkg: TradePackage): OffseasonState {
  if (!evaluatePackage(st, pkg).ok) return st;
  const out = byIds(st.teams[0].slots, pkg.give) as Player[];
  const inc = byIds(st.teams[pkg.team].slots, pkg.get) as Player[];
  const teams = [...st.teams];
  const theirs = after(teams[pkg.team].slots, inc, out, true)!;
  teams[0] = { ...teams[0], slots: after(teams[0].slots, out, inc)!.slots };
  teams[pkg.team] = { ...teams[pkg.team], slots: theirs.slots };
  // Anyone they waived to make room hits free agency.
  const contracts = { ...st.contracts };
  for (const p of theirs.waived) delete contracts[p.id];
  return {
    ...st, teams, contracts, traded: [...(st.traded ?? []), ...pkg.give],
    freeAgents: [...st.freeAgents, ...theirs.waived.map(released)],
  };
}

/** One of yours for one of theirs (the original trade screen's rule, and the tests'). */
export const evaluateTrade = (st: OffseasonState, give: string, team: number, get: string) => evaluatePackage(st, { team, give: [give], get: [get] });
export const executeTrade = (st: OffseasonState, give: string, team: number, get: string) => executePackage(st, { team, give: [give], get: [get] });

/**
 * "What would it take?": the smallest change that gets their GM to yes. Either one more of your players (the least
 * valuable one that does it) or one fewer of theirs. Null when nothing small enough works.
 */
export function counterOffer(st: OffseasonState, pkg: TradePackage): TradePackage | null {
  if (evaluatePackage(st, pkg).ok) return pkg;
  const tries: { pkg: TradePackage; cost: number }[] = [];
  if (pkg.give.length < MAX_PER_SIDE) {
    for (const p of players(st.teams[0].slots)) {
      if (pkg.give.includes(p.id)) continue;
      const next = { ...pkg, give: [...pkg.give, p.id] };
      if (evaluatePackage(st, next).ok) tries.push({ pkg: next, cost: tradeValue(p) });
    }
  }
  if (pkg.get.length > 1) {
    for (const id of pkg.get) {
      const next = { ...pkg, get: pkg.get.filter((x) => x !== id) };
      const p = players(st.teams[pkg.team].slots).find((x) => x.id === id)!;
      if (evaluatePackage(st, next).ok) tries.push({ pkg: next, cost: tradeValue(p) });
    }
  }
  return tries.sort((a, b) => a.cost - b.cost)[0]?.pkg ?? null;
}

/** A team calling you: what they'd send for one of your players. */
export interface TradeOffer extends TradePackage { key: string }
export const offerKey = (pkg: TradePackage) => `${pkg.team}:${[...pkg.give].sort().join('+')}:${[...pkg.get].sort().join('+')}`;

/**
 * Offers that come to you this offseason: a few AI teams each want one of your better players and offer one or
 * two of theirs for him, a deal they like (a small edge) that's as generous as they'll go. Fixed by the season and
 * the moves made so far; offers you turned down don't come back.
 */
export function incomingOffers(st: OffseasonState, n = 3, declined: string[] = []): TradeOffer[] {
  const rng = createRng(`${st.seed}:offers:${st.season}:${(st.traded ?? []).length}`);
  const mine = players(st.teams[0].slots).sort((a, b) => tradeValue(b) - tradeValue(a)).slice(0, 7);
  const out: TradeOffer[] = [];
  for (const ti of shuffle(st.teams.map((_, i) => i).slice(1), rng)) {
    if (out.length >= n) break;
    const theirs = players(st.teams[ti].slots);
    const target = rng.pick(mine);
    if (!target) break;
    const packs: Player[][] = [...theirs.map((p) => [p]), ...theirs.flatMap((a, i) => theirs.slice(i + 1).map((b) => [a, b]))];
    let best: { offer: TradeOffer; gain: number } | null = null;
    for (const pack of packs) {
      const pkg = { team: ti, give: [target.id], get: pack.map((p) => p.id) };
      const key = offerKey(pkg);
      if (declined.includes(key)) continue;
      const v = evaluatePackage(st, pkg);
      // A deal they like, but not a robbery: the most generous one inside a small edge.
      if (!v.ok || v.gain > AI_EDGE + 6) continue;
      if (!best || v.gain < best.gain) best = { offer: { ...pkg, key }, gain: v.gain };
    }
    if (best) out.push(best.offer);
  }
  return out;
}
