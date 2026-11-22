import { effective } from './simConfig';
import {
  ALL_SLOTS, BENCH_SLOTS, STARTER_SLOTS, type Player, type Pos, type Roster, type SlotId,
} from './types';

export interface LineupEntry {
  player: Player;
  slot: SlotId;
  minutes: number;
  outOfPosition: boolean;
}

export const OOP_PENALTY = 4;
const MAX_MIN = 48;
const BENCH_BASE = [22, 18, 14, 10, 8];

const fits = (p: Player, pos: Pos) => p.pos === pos || p.pos2 === pos;

/** Emergency call-up when injuries leave fewer than five healthy players. */
function replacement(slot: SlotId): Player {
  const pos = (STARTER_SLOTS.includes(slot) ? slot : 'SF') as Pos;
  return { id: `rep-${slot}`, name: 'Two-way Call-up', pos, ovr: 60, off: 58, def: 58, reb: 58, ast: 58, three: 58, dur: 90 };
}

/** Who plays and for how long. Injured players are skipped and bench players move up. Always 240 minutes total. */
export function lineupMinutes(roster: Roster, out: Set<string>): LineupEntry[] {
  const healthy = (s: SlotId) => !out.has(roster.slots[s].id);
  const bench = BENCH_SLOTS.filter(healthy).map((s) => roster.slots[s]);
  const entries: { player: Player; slot: SlotId; outOfPosition: boolean; base: number }[] = [];

  for (const slot of STARTER_SLOTS) {
    const pos = slot as Pos;
    let player: Player;
    if (healthy(slot)) player = roster.slots[slot];
    else {
      const candidates = [...bench].sort((a, b) => Number(fits(b, pos)) - Number(fits(a, pos)) || b.ovr - a.ovr);
      player = candidates[0] ?? replacement(slot);
      const idx = bench.indexOf(player);
      if (idx >= 0) bench.splice(idx, 1);
    }
    const base = Math.max(28, Math.min(38, 34 + (player.ovr - 82) * 0.3));
    entries.push({ player, slot, outOfPosition: !fits(player, pos), base });
  }
  bench.forEach((player, i) => {
    const slot = BENCH_SLOTS.find((s) => roster.slots[s].id === player.id)!;
    const base = Math.max(4, BENCH_BASE[i] + (player.ovr - 75) * 0.25);
    entries.push({ player, slot, outOfPosition: false, base });
  });

  // Normalize to 240, capping anyone at 48 and redistributing the excess.
  const minutes = entries.map((e) => e.base);
  for (let iter = 0; iter < 10; iter++) {
    const capped = minutes.map((m) => m >= MAX_MIN);
    const fixed = minutes.reduce((s, m, i) => s + (capped[i] ? MAX_MIN : 0), 0);
    const free = minutes.reduce((s, m, i) => s + (capped[i] ? 0 : m), 0);
    const scale = (240 - fixed) / free;
    let over = false;
    for (let i = 0; i < minutes.length; i++) {
      minutes[i] = capped[i] ? MAX_MIN : minutes[i] * scale;
      if (minutes[i] > MAX_MIN) over = true;
    }
    if (!over) break;
  }
  return entries.map((e, i) => ({ player: e.player, slot: e.slot, minutes: minutes[i], outOfPosition: e.outOfPosition }));
}

export interface Strength {
  off: number;
  def: number;
  net: number;
}

/** Minutes-weighted team ratings. Out-of-position players lose OOP_PENALTY. */
export function teamStrength(lineup: LineupEntry[]): Strength {
  let off = 0;
  let def = 0;
  for (const e of lineup) {
    const w = e.minutes / 240;
    const pen = e.outOfPosition ? OOP_PENALTY : 0;
    off += w * (effective(0.5 * e.player.off + 0.5 * e.player.ovr) - pen);
    def += w * (effective(0.5 * e.player.def + 0.5 * e.player.ovr) - pen);
  }
  return { off, def, net: off + def };
}

export { ALL_SLOTS };
