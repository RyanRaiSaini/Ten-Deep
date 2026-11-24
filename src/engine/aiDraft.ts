import { canAfford, capRoom, payOf, superstarBlocked } from './cap';
import {
  ALL_SLOTS, BENCH_SLOTS, STARTER_SLOTS, type Player, type Pool, type Rng, type Roster, type RosterSlots, type SlotId,
} from './types';

type Style = 'stars' | 'balanced' | 'rebuild';

interface AiTeam {
  slots: RosterSlots;
  style: Style;
  /** 0–1: how sharp the front office is. Low acumen → noisy valuations → weaker team. */
  acumen: number;
}

function openSlotFor(slots: RosterSlots, p: Player, startersOnly: boolean): SlotId | null {
  for (const s of STARTER_SLOTS) if (!slots[s] && (p.pos === s || p.pos2 === s)) return s;
  if (startersOnly) return null;
  for (const s of BENCH_SLOTS) if (!slots[s]) return s;
  return null;
}

/**
 * AI teams keep enough cap to fill their other open slots with the cheapest real contracts still available
 * (minimums, two-ways, late rookie deals), so they don't spend themselves into a corner.
 */
function aiCanAfford(slots: RosterSlots, p: Player, cheapest: number[]): boolean {
  const openAfter = ALL_SLOTS.filter((s) => !slots[s]).length - 1;
  let reserve = 0;
  for (let i = 0; i < openAfter && i < cheapest.length; i++) reserve += cheapest[i];
  return capRoom(slots) - payOf(p) >= reserve;
}

function value(team: AiTeam, p: Player, rng: Rng): number {
  const open = ALL_SLOTS.filter((s) => !team.slots[s]).length;
  const perSlotBudget = capRoom(team.slots) / Math.max(1, open);
  const salary = payOf(p);
  let v = p.ovr + rng.normal(0, 1.5 + (1 - team.acumen) * 7);
  if (team.style === 'balanced' && salary > perSlotBudget * 1.6) v -= (salary - perSlotBudget * 1.6) * 0.6;
  if (team.style === 'stars') v += (p.ovr - 85) * 0.3;
  if (team.style === 'rebuild') v -= salary * 0.6;
  return v;
}

/**
 * Cheapest contract left into the first open slot, even out of position. If nothing fits under the cap, the
 * cheapest deal anyway: like the real NBA's minimum-salary exception, which lets capped-out teams sign minimums.
 */
function lastResort(slots: RosterSlots, available: Player[], used: Set<string>): { p: Player; slot: SlotId; v: number } {
  const slot = ALL_SLOTS.find((s) => !slots[s])!;
  const left = available.filter((p) => !used.has(p.id)).sort((a, b) => payOf(a) - payOf(b) || a.ovr - b.ovr);
  if (left.length === 0) throw new Error('AI draft: pool exhausted');
  return { p: left.find((p) => canAfford(slots, p)) ?? left[0], slot, v: 0 };
}

/**
 * The other teams in the league: a snake draft over the whole pool under the same cap rules.
 * Teams get a random style and front-office acumen, so the league spreads from contenders to lottery teams.
 */
export function draftLeague(pool: Pool, exclude: Set<string>, count: number, rng: Rng): Roster[] {
  const available = pool.teams.flatMap((t) => t.players).filter((p) => !exclude.has(p.id));
  const used = new Set<string>();
  const styles: Style[] = ['stars', 'balanced', 'rebuild'];
  const teams: AiTeam[] = Array.from({ length: count }, () => ({
    slots: {},
    style: rng.pick(styles),
    acumen: rng.next(),
  }));

  for (let round = 0; round < ALL_SLOTS.length; round++) {
    const order = round % 2 === 0 ? teams : [...teams].reverse();
    for (const team of order) {
      const startersOpen = STARTER_SLOTS.some((s) => !team.slots[s]);
      const cheapest = available.filter((p) => !used.has(p.id)).map(payOf).sort((a, b) => a - b).slice(0, ALL_SLOTS.length);
      let best: { p: Player; slot: SlotId; v: number } | null = null;
      for (const p of available) {
        if (used.has(p.id) || superstarBlocked(team.slots, p) || !aiCanAfford(team.slots, p, cheapest)) continue;
        const slot = openSlotFor(team.slots, p, startersOpen);
        if (!slot) continue;
        const v = value(team, p, rng);
        if (!best || v > best.v) best = { p, slot, v };
      }
      if (!best) best = lastResort(team.slots, available, used);
      team.slots[best.slot] = best.p;
      used.add(best.p.id);
    }
  }

  return teams.map((t, i) => ({
    id: `ai-${i}`,
    name: `AI ${i + 1}`,
    colors: ['#334155', '#94a3b8'],
    slots: t.slots as Required<RosterSlots>,
  }));
}

/**
 * The AI league for a fair run: drafted from the seed alone, before (and regardless of) your picks, so everyone
 * on the same seed starts against the same 29 teams. A player you also drafted is swapped, on his AI team, for
 * the closest-rated player who fits the same slot and isn't in the league or on your roster. Your own picks are
 * the only thing that changes the league.
 */
export function fairLeague(pool: Pool, mine: Player[], rng: Rng, count = 29): Roster[] {
  const league = draftLeague(pool, new Set(), count, rng);
  const myNames = new Set(mine.map((p) => p.name));
  const taken = new Set([...league.flatMap((r) => Object.values(r.slots).map((p) => p!.name)), ...myNames]);
  const all = pool.teams.flatMap((t) => t.players);
  for (const r of league) {
    for (const slot of ALL_SLOTS) {
      const p = r.slots[slot];
      if (!p || !myNames.has(p.name)) continue;
      const fits = (x: Player) => BENCH_SLOTS.includes(slot) || x.pos === slot || x.pos2 === slot;
      const rep = all
        .filter((x) => !taken.has(x.name) && fits(x))
        .sort((a, b) => Math.abs(a.ovr - p.ovr) - Math.abs(b.ovr - p.ovr) || b.ovr - a.ovr || a.id.localeCompare(b.id))[0];
      if (!rep) continue;
      r.slots[slot] = rep;
      taken.add(rep.name);
    }
  }
  return league;
}
