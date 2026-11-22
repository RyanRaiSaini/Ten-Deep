import { canAfford, capRoom, salaryFor } from './cap';
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

/** AI teams keep ~$3M per remaining open slot in reserve; truly cheap players are scarce. */
const AI_RESERVE_PER_SLOT = 3;

function aiCanAfford(slots: RosterSlots, p: Player): boolean {
  const openAfter = ALL_SLOTS.filter((s) => !slots[s]).length - 1;
  return capRoom(slots) - salaryFor(p.ovr) >= openAfter * AI_RESERVE_PER_SLOT;
}

function value(team: AiTeam, p: Player, rng: Rng): number {
  const open = ALL_SLOTS.filter((s) => !team.slots[s]).length;
  const perSlotBudget = capRoom(team.slots) / Math.max(1, open);
  const salary = salaryFor(p.ovr);
  let v = p.ovr + rng.normal(0, 1.5 + (1 - team.acumen) * 7);
  if (team.style === 'balanced' && salary > perSlotBudget * 1.6) v -= (salary - perSlotBudget * 1.6) * 0.6;
  if (team.style === 'stars') v += (p.ovr - 85) * 0.3;
  if (team.style === 'rebuild') v -= salary * 0.6;
  return v;
}

/** Cheapest affordable unused player into the first open slot, even out of position. */
function lastResort(slots: RosterSlots, available: Player[], used: Set<string>): { p: Player; slot: SlotId; v: number } {
  const slot = ALL_SLOTS.find((s) => !slots[s])!;
  const cands = available.filter((p) => !used.has(p.id) && canAfford(slots, p)).sort((a, b) => a.ovr - b.ovr);
  if (cands.length === 0) throw new Error('AI draft: pool exhausted');
  return { p: cands[0], slot, v: 0 };
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
      let best: { p: Player; slot: SlotId; v: number } | null = null;
      for (const p of available) {
        if (used.has(p.id) || !aiCanAfford(team.slots, p)) continue;
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
