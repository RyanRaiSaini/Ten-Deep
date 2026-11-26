/**
 * After a roster change (crisis swap, rookie draft), put players back where they can play: every starter at a
 * position he plays when the roster allows it, keeping current spots whenever they're already legal.
 */
import { ALL_SLOTS, BENCH_SLOTS, STARTER_SLOTS, type Player, type RosterSlots, type SlotId, playsPos } from './types';

const plays = (p: Player, slot: SlotId) => playsPos(p, slot);

export function startersLegal(slots: RosterSlots): boolean {
  return STARTER_SLOTS.every((k) => { const p = slots[k]; return !p || plays(p, k); });
}

export function reseat<T extends RosterSlots>(slots: T): T {
  if (startersLegal(slots)) return slots;
  const filled = ALL_SLOTS.filter((k) => slots[k]);
  const players = filled.map((k) => ({ p: slots[k]!, from: k }));
  // Best starting five: in position (big), then rating, then staying put (small tiebreak).
  let best: { score: number; pick: number[] } = { score: -Infinity, pick: [] };
  const used = new Set<number>();
  const pick: number[] = [];
  const dfs = (i: number, score: number) => {
    if (i === STARTER_SLOTS.length) {
      if (score > best.score) best = { score, pick: [...pick] };
      return;
    }
    if (players.length - used.size < STARTER_SLOTS.length - i) return;
    const slot = STARTER_SLOTS[i];
    for (let j = 0; j < players.length; j++) {
      if (used.has(j)) continue;
      const { p, from } = players[j];
      const s = (plays(p, slot) ? 1000 : 0) + p.ovr + (from === slot ? 2 : 0);
      used.add(j); pick.push(j);
      dfs(i + 1, score + s);
      used.delete(j); pick.pop();
    }
  };
  dfs(0, 0);
  const out = { ...slots } as T;
  for (const k of ALL_SLOTS) delete out[k];
  best.pick.forEach((j, i) => { out[STARTER_SLOTS[i]] = players[j].p; });
  const benchers = players.filter((_, j) => !best.pick.includes(j));
  // Bench: players already on the bench keep their spot; the rest fill the gaps.
  const free = BENCH_SLOTS.filter((k) => !benchers.some((b) => b.from === k));
  for (const b of benchers) {
    const k = BENCH_SLOTS.includes(b.from) ? b.from : free.shift();
    if (k) out[k] = b.p;
  }
  return out;
}
