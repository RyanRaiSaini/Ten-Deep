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
/**
 * Share of the 240 minutes by role: each starter 15% (36 min), then the bench in order, 6th man to 10th man
 * 9 / 6 / 5 / 3 / 2% (21.6, 14.4, 12, 7.2, 4.8 min). A role plays the same minutes whoever fills it, so the
 * starting five carries the team and the bench adds a little. Shares add up to 100%.
 */
export const STARTER_SHARE = 0.15;
export const BENCH_SHARES = [0.09, 0.06, 0.05, 0.03, 0.02] as const;

const fits = (p: Player, pos: Pos) => p.pos === pos || p.pos2 === pos;

/** Emergency call-up when injuries leave fewer than five healthy players. */
function replacement(slot: SlotId): Player {
  const pos = (STARTER_SLOTS.includes(slot) ? slot : 'SF') as Pos;
  return { id: `rep-${slot}`, name: 'Two-way Call-up', pos, ovr: 60, off: 58, def: 58, reb: 58, ast: 58, three: 58, dur: 90 };
}

/**
 * Who plays and for how long. An injured starter's spot goes to the bench player who best fits it, and the rest
 * of the bench moves up a role. With fewer than ten healthy, the empty roles' minutes are shared out by role
 * (everyone plays a bit more). Always 240 minutes total.
 */
export function lineupMinutes(roster: Roster, out: Set<string>): LineupEntry[] {
  const healthy = (s: SlotId) => !out.has(roster.slots[s].id);
  const bench = BENCH_SLOTS.filter(healthy).map((s) => roster.slots[s]);
  const entries: { player: Player; slot: SlotId; outOfPosition: boolean; share: number }[] = [];

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
    entries.push({ player, slot, outOfPosition: !fits(player, pos), share: STARTER_SHARE });
  }
  bench.forEach((player, i) => {
    const slot = BENCH_SLOTS.find((s) => roster.slots[s].id === player.id)!;
    entries.push({ player, slot, outOfPosition: false, share: BENCH_SHARES[i] });
  });
  const total = entries.reduce((n, e) => n + e.share, 0);
  return entries.map((e) => ({ player: e.player, slot: e.slot, minutes: (240 * e.share) / total, outOfPosition: e.outOfPosition }));
}

/**
 * Squad Rating: the players' overalls weighted by their role's share of the minutes (a starter out of position
 * counts OOP_PENALTY less). One number for how good the ten-man rotation is, healthy.
 */
export function squadRating(roster: Roster): number {
  return lineupMinutes(roster, new Set()).reduce((n, e) => n + (e.minutes / 240) * (e.player.ovr - (e.outOfPosition ? OOP_PENALTY : 0)), 0);
}

export interface Strength {
  off: number;
  def: number;
  net: number;
}

/** Minutes-weighted team ratings. Out-of-position players lose OOP_PENALTY. */
export function teamStrength(lineup: LineupEntry[], mod = 0): Strength {
  let off = 0;
  let def = 0;
  for (const e of lineup) {
    const w = e.minutes / 240;
    const pen = e.outOfPosition ? OOP_PENALTY : 0;
    off += w * (effective(0.5 * e.player.off + 0.5 * e.player.ovr) - pen);
    def += w * (effective(0.5 * e.player.def + 0.5 * e.player.ovr) - pen);
  }
  off += mod;
  def += mod;
  return { off, def, net: off + def };
}

export { ALL_SLOTS };
