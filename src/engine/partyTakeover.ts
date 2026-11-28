/**
 * Party Takeover: friends take over the same real team with the same budget and rebuild it position by position,
 * at the same time. For each position everyone sees the same three priced options and a bench option and has
 * CHOOSE_MS to lock in "keep" or an option. Then 3-2-1: every choice is revealed at once. When two or more friends
 * went for the same player it's a bidding war: each bids blind (at least his price, at most what they can spend) and
 * the top bid signs him at that price; the others keep their player. After the last position the rebuilt teams play
 * one shared season (engine/party.ts partySeason).
 *
 * Like the Party draft, the server stores only each member's moves and bids with server timestamps; this module
 * replays them into the room's state, identically on every phone and on the server.
 */
import { CAP, MIN_SALARY, payOf } from './cap';
import type { PartyMember, PartyMeta } from './party';
import { seats } from './party';
import { realRotation } from './realLeague';
import { createRng, shuffle } from './rng';
import { ALL_SLOTS, STARTER_SLOTS, playsPos, type Player, type Pool, type RosterSlots, type SlotId, type TeamSeason } from './types';

export const CHOOSE_MS = 30_000;
/** The 3-2-1 reveal. */
export const REVEAL_MS = 3_500;
export const BID_MS = 15_000;
export const TK_BUDGET = CAP * 0.25;

export type TkChoice = 'keep' | 'low' | 'mid' | 'top' | 'bench';
export const TK_TIERS: Exclude<TkChoice, 'keep'>[] = ['low', 'mid', 'top', 'bench'];
export interface TkMove { r: number; c: TkChoice; t: number }
export interface TkBid { r: number; amount: number; t: number }
export interface TkOption { tier: Exclude<TkChoice, 'keep'>; player: Player; pay: number }

export interface TkResult { seat: number; c: TkChoice; won: boolean; pay: number; bid?: number }

export interface TkState {
  phase: 'lobby' | 'choose' | 'reveal' | 'bid' | 'season';
  /** Position being played (0–9 = PG…B5); ALL_SLOTS.length once the rebuild is done. */
  r: number;
  phaseStart: number;
  deadline: number;
  rosters: Required<RosterSlots>[];
  budgets: number[];
  options: TkOption[];
  /** Locked in this position (choose phase). */
  chosen: boolean[];
  /** Everyone's choice, once revealed. */
  choices: (TkChoice | null)[];
  /** Seats in this position's bidding war, and who has bid. */
  bidders: number[];
  bidIn: boolean[];
  /** What happened at each finished position. */
  history: TkResult[][];
  /** When the rebuild ended (the season starts). */
  end: number | null;
}

export const LOW_MAX = CAP * 0.05;
export const TOP_MIN = CAP * 0.15;
const tierOf = (pay: number): 'low' | 'mid' | 'top' => (pay >= TOP_MIN ? 'top' : pay > LOW_MAX ? 'mid' : 'low');

export const tkTeam = (meta: PartyMeta, pool: Pool): TeamSeason | undefined => pool.teams.find((t) => t.id === meta.teamId);

/** The team everyone takes over, set into its real rotation. */
export function tkStartRoster(team: TeamSeason): Required<RosterSlots> {
  return realRotation(team.players, 'tk') as Required<RosterSlots>;
}

/** The same four options for everyone at position r: three priced tiers and a minimum-salary bench option. */
export function tkOptions(meta: PartyMeta, pool: Pool, r: number, team: TeamSeason, signed: Set<string>): TkOption[] {
  const slot = ALL_SLOTS[r];
  const own = new Set(team.players.map((p) => p.name));
  const seen = new Set<string>();
  const cands = pool.teams.flatMap((t) => t.players).filter((p) => !own.has(p.name) && !signed.has(p.name) && !seen.has(p.name) && (seen.add(p.name), true)
    && (!STARTER_SLOTS.includes(slot) || playsPos(p, slot)));
  const rng = createRng(`${meta.seed}:tk-options:${r}`);
  const out: TkOption[] = [];
  for (const tier of ['low', 'mid', 'top'] as const) {
    const best = cands.filter((p) => tierOf(payOf(p)) === tier).sort((a, b) => b.ovr - a.ovr).slice(0, 15);
    if (best.length) { const p = rng.pick(shuffle(best, rng)); out.push({ tier, player: p, pay: payOf(p) }); }
  }
  const cheap = cands.filter((p) => p.ovr <= 76 && !out.some((o) => o.player.name === p.name));
  if (cheap.length) { const p = rng.pick(cheap); out.push({ tier: 'bench', player: { ...p, salary: MIN_SALARY }, pay: MIN_SALARY }); }
  return out;
}

/** The most a seat can pay for the player at slot r: budget plus the salary of the player going out. */
export const maxSpend = (st: Pick<TkState, 'rosters' | 'budgets'>, seat: number, r: number) =>
  Math.round((st.budgets[seat] + payOf(st.rosters[seat][ALL_SLOTS[r]])) * 10) / 10;

/** Replay the room to "now". Pure and deterministic. */
export function resolveTakeover(meta: PartyMeta, membersIn: PartyMember[], pool: Pool, now: number): TkState {
  const members = seats(membersIn);
  const n = members.length;
  const team = tkTeam(meta, pool);
  const start0 = team ? tkStartRoster(team) : ({} as Required<RosterSlots>);
  const rosters = members.map(() => ({ ...start0 }));
  const budgets = members.map(() => TK_BUDGET);
  const history: TkResult[][] = [];
  const base = { rosters, budgets, history, options: [] as TkOption[], chosen: members.map(() => false), choices: members.map(() => null), bidders: [] as number[], bidIn: [] as boolean[] };
  if (!meta.started || !team) return { ...base, phase: 'lobby', r: 0, phaseStart: 0, deadline: 0, end: null };

  const signed = new Set<string>();
  let start = meta.started;
  for (let r = 0; r < ALL_SLOTS.length; r++) {
    const slot = ALL_SLOTS[r];
    const options = tkOptions(meta, pool, r, team, signed);
    const deadline = start + CHOOSE_MS;
    // Each seat's first move for this position, if it came in time.
    const first = members.map((m) => (m.moves ?? []).filter((x) => x.r === r && x.t <= deadline).sort((a, b) => a.t - b.t)[0]);
    const allIn = first.every(Boolean);
    if (!allIn && now < deadline) {
      return { ...base, phase: 'choose', r, phaseStart: start, deadline, options, chosen: first.map(Boolean), end: null };
    }
    const chooseEnd = allIn ? Math.max(...first.map((x) => x!.t)) : deadline;
    // A choice you can't pay for (or an option that doesn't exist) counts as keeping your player.
    const st = { rosters, budgets };
    const choices: TkChoice[] = first.map((x, seat) => {
      const c = x?.c ?? 'keep';
      const o = options.find((y) => y.tier === c);
      return c === 'keep' || !o || o.pay > maxSpend(st, seat, r) + 1e-9 ? 'keep' : c;
    });
    const revealEnd = chooseEnd + REVEAL_MS;
    if (now < revealEnd) {
      return { ...base, phase: 'reveal', r, phaseStart: chooseEnd, deadline: revealEnd, options, chosen: members.map(() => true), choices, end: null };
    }
    // Bidding wars: any option two or more friends went for.
    const contested = TK_TIERS.filter((tier) => choices.filter((c) => c === tier).length >= 2);
    const bidders = choices.map((c, seat) => ({ c, seat })).filter((x) => contested.includes(x.c as never)).map((x) => x.seat);
    const bidDeadline = revealEnd + BID_MS;
    const bids = members.map((m, seat) => (bidders.includes(seat) ? (m.bids ?? []).filter((b) => b.r === r && b.t >= revealEnd - 1000 && b.t <= bidDeadline).sort((a, b) => a.t - b.t)[0] : undefined));
    const bidsIn = bidders.every((seat) => bids[seat]);
    if (bidders.length && !bidsIn && now < bidDeadline) {
      return { ...base, phase: 'bid', r, phaseStart: revealEnd, deadline: bidDeadline, options, chosen: members.map(() => true), choices, bidders, bidIn: members.map((_, s) => !!bids[s]), end: null };
    }
    // Settle: uncontested options sign at their price; each war goes to the top bid (earliest, then seat order on ties).
    const results: TkResult[] = [];
    const sign = (seat: number, o: TkOption, pay: number) => {
      const out = rosters[seat][slot];
      rosters[seat] = { ...rosters[seat], [slot]: pay !== payOf(o.player) ? { ...o.player, salary: pay } : o.player };
      budgets[seat] = Math.round((budgets[seat] + payOf(out) - pay) * 10) / 10;
    };
    for (let seat = 0; seat < n; seat++) {
      const c = choices[seat];
      if (c === 'keep') { results.push({ seat, c, won: false, pay: 0 }); continue; }
      const o = options.find((y) => y.tier === c)!;
      if (!contested.includes(c)) { sign(seat, o, o.pay); results.push({ seat, c, won: true, pay: o.pay }); continue; }
    }
    for (const tier of contested) {
      const o = options.find((y) => y.tier === tier)!;
      const fighters = bidders.filter((s) => choices[s] === tier).map((seat) => {
        const cap = maxSpend({ rosters, budgets }, seat, r);
        const raw = bids[seat]?.amount ?? o.pay;
        return { seat, amount: Math.round(Math.max(o.pay, Math.min(cap, raw)) * 10) / 10, t: bids[seat]?.t ?? Infinity };
      }).sort((a, b) => b.amount - a.amount || a.t - b.t || a.seat - b.seat);
      fighters.forEach((f, i) => {
        if (i === 0) sign(f.seat, o, f.amount);
        results.push({ seat: f.seat, c: tier, won: i === 0, pay: i === 0 ? f.amount : 0, bid: f.amount });
      });
    }
    for (const x of results) if (x.won) signed.add(options.find((y) => y.tier === x.c)!.player.name);
    history.push(results.sort((a, b) => a.seat - b.seat));
    start = bidders.length ? (bidsIn ? Math.max(...bidders.map((s) => bids[s]!.t)) : bidDeadline) : revealEnd;
  }
  return { ...base, phase: 'season', r: ALL_SLOTS.length, phaseStart: start, deadline: start, end: start };
}

/** Each friend's rebuilt team for the shared season. Everyone kept some of the same players, so each seat gets its
 *  own copies (box scores and leaders stay per team). */
export const seasonRosters = (st: TkState): RosterSlots[] =>
  st.rosters.map((r, seat) => Object.fromEntries(ALL_SLOTS.map((k) => [k, { ...r[k], id: `${r[k].id}~s${seat}` }])) as RosterSlots);

export const slotOfRound = (r: number): SlotId => ALL_SLOTS[r];
