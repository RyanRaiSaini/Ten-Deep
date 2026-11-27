/** Small season edits the board cards share. */
import type { SeasonState } from '../season';
import { ALL_SLOTS, type Player } from '../types';

const clamp = (n: number) => Math.max(1, Math.min(99, n));

/** A player's rating moves by `d` (overall and every sub-rating), wherever he is in the league. */
export const bump = (p: Player, d: number): Player => ({
  ...p, ovr: clamp(p.ovr + d), off: clamp(p.off + d), def: clamp(p.def + d), reb: clamp(p.reb + d), ast: clamp(p.ast + d), three: clamp(p.three + d),
});

export function bumpPlayer(s: SeasonState, id: string, d: number): SeasonState {
  const teams = s.teams.map((t) => {
    const k = ALL_SLOTS.find((x) => t.slots[x].id === id);
    return k ? { ...t, slots: { ...t.slots, [k]: bump(t.slots[k], d) } } : t;
  });
  return { ...s, teams };
}

export const addFee = (s: SeasonState, amount: number): SeasonState => ({ ...s, fees: Math.round(((s.fees ?? 0) + amount) * 10) / 10 });
