/**
 * The front office: during a Management Crisis season you can sell any player for his contract value and pick his
 * replacement from three priced options (bottom, middle, top of the market) or a free bench option, as in Box to Box.
 * Your budget for a slot is your cap room plus the outgoing salary (the same rule as the trade deadline).
 */
import { CAP, MIN_SALARY, payOf, superstarBlocked } from '../cap';
import { createRng, shuffle } from '../rng';
import { tradeBudget, type SeasonState } from '../season';
import { ALL_SLOTS, STARTER_SLOTS, type Player, type Pool, type SlotId, playsPos } from '../types';
import { swapIn } from '../crisis/apply';
import type { BoardState, Signing, Tier } from './state';

export interface MarketOption {
  tier: Tier;
  player: Player;
  /** What he costs you (after any discount). */
  pay: number;
  /** The AI team he plays for (it gets your player back in a swap); none for a free agent. */
  fromTeam?: number;
}

export const LOW_MAX = CAP * 0.05;
export const TOP_MIN = CAP * 0.15;
const tierOf = (pay: number): Tier => (pay >= TOP_MIN ? 'top' : pay > LOW_MAX ? 'mid' : 'low');

/** Everyone you could bring in: AI rosters (as swaps) plus the mode's free agents, one entry per name. */
function candidates(s: SeasonState, pool: Pool): { p: Player; team?: number }[] {
  const mine = new Set(ALL_SLOTS.map((k) => s.teams[0].slots[k].name));
  const taken = new Map<string, number>();
  s.teams.forEach((t, i) => { if (i > 0) for (const k of ALL_SLOTS) taken.set(t.slots[k].name, i); });
  const seen = new Set<string>();
  const out: { p: Player; team?: number }[] = [];
  for (let i = 1; i < s.teams.length; i++) for (const k of ALL_SLOTS) {
    const p = s.teams[i].slots[k];
    if (!mine.has(p.name) && !seen.has(p.name)) { seen.add(p.name); out.push({ p, team: i }); }
  }
  for (const t of pool.teams) for (const p of t.players) {
    if (!mine.has(p.name) && !seen.has(p.name) && !taken.has(p.name)) { seen.add(p.name); out.push({ p }); }
  }
  return out;
}

export const budgetFor = (s: SeasonState, slot: SlotId) => tradeBudget(s.teams[0].slots, slot, s.fees ?? 0);

/** Three priced options and a bench option for a slot, fixed by the season seed, your move count and respins. */
export function marketOptions(s: SeasonState, b: BoardState, slot: SlotId, pool: Pool): MarketOption[] {
  const rng = createRng(`${s.seed}:market:${b.signings.length}:${slot}:${b.spins ?? 0}`);
  const user = s.teams[0];
  const without = { ...user.slots, [slot]: undefined };
  const fits = candidates(s, pool).filter(({ p }) =>
    (!STARTER_SLOTS.includes(slot) || playsPos(p, slot)) && !superstarBlocked(without, p));
  const discount = b.perks.includes('agent-friend') ? 0.75 : 1;
  const pick = (tier: Tier, list: typeof fits): MarketOption | null => {
    const best = [...list].sort((a, c) => c.p.ovr - a.p.ovr).slice(0, 20);
    if (!best.length) return null;
    const { p, team } = rng.pick(shuffle(best, rng));
    const pay = Math.round(payOf(p) * discount * 10) / 10;
    return { tier, player: pay !== payOf(p) ? { ...p, salary: pay } : p, pay, ...(team !== undefined ? { fromTeam: team } : {}) };
  };
  const out: MarketOption[] = [];
  for (const tier of ['low', 'mid', 'top'] as Tier[]) {
    const o = pick(tier, fits.filter(({ p }) => tierOf(payOf(p)) === tier));
    if (o) out.push(o);
  }
  // The bench option: a role player who'll sign for the minimum.
  const cheap = fits.filter(({ p }) => p.ovr <= 76 && !out.some((o) => o.player.name === p.name));
  if (cheap.length) {
    const { p, team } = rng.pick(cheap);
    out.push({ tier: 'bench', player: { ...p, salary: MIN_SALARY }, pay: MIN_SALARY, ...(team !== undefined ? { fromTeam: team } : {}) });
  }
  return out;
}

/** Why an option can't be signed right now, or null if it can. */
export function blocked(s: SeasonState, b: BoardState, slot: SlotId, o: MarketOption): 'budget' | 'crunch' | null {
  if (b.crunch && o.tier !== 'bench') return 'crunch';
  return o.pay > budgetFor(s, slot) + 1e-9 ? 'budget' : null;
}

/** Sign an option into `slot`. Returns the new season and board (call checkDemands after). */
export function signOption(s: SeasonState, b: BoardState, slot: SlotId, o: MarketOption, tier: Tier = o.tier): { season: SeasonState; board: BoardState } {
  const out = s.teams[0].slots[slot];
  const incoming: Player = o.pay !== payOf(o.player) ? { ...o.player, salary: o.pay } : o.player;
  const season = swapIn(s, slot, incoming);
  const signing: Signing = {
    round: s.round, inId: incoming.id, inName: incoming.name, outName: out.name, outPay: payOf(out), pay: o.pay, tier,
    pos: incoming.pos, ...(incoming.age !== undefined ? { age: incoming.age } : {}), ...(o.fromTeam !== undefined ? { fromTeam: o.fromTeam } : {}),
  };
  // The agent's discount is priced into every market option while you hold it; any priced signing uses it up.
  const perks = o.tier !== 'bench' && tier !== 'perk' ? b.perks.filter((x) => x !== 'agent-friend') : b.perks;
  return { season, board: { ...b, signings: [...b.signings, signing], perks, crunch: false } };
}

/** Spend a respin: new options for every slot. */
export const respin = (b: BoardState): BoardState | null =>
  b.respins > 0 ? { ...b, respins: b.respins - 1, spins: (b.spins ?? 0) + 1 } : null;
