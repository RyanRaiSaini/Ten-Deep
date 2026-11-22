import { ALL_SLOTS, type Player, type RosterSlots } from './types';

export const CAP = 150;
export const MIN_SALARY = 1;

/** Anti-superteam rule: at most two players rated 95+ per roster. */
export const MAX_SUPERSTARS = 2;
export const SUPERSTAR_OVR = 95;

export function superstarCount(roster: RosterSlots): number {
  return ALL_SLOTS.filter((s) => (roster[s]?.ovr ?? 0) >= SUPERSTAR_OVR).length;
}

export function superstarBlocked(roster: RosterSlots, p: Player): boolean {
  return p.ovr >= SUPERSTAR_OVR && superstarCount(roster) >= MAX_SUPERSTARS;
}

/** Salary anchors ($M) from the design spec; linear between points. */
const ANCHORS: [number, number][] = [
  [64, 1], [70, 3], [75, 6], [80, 12], [85, 20], [90, 30], [95, 42], [99, 50],
];

export function salaryFor(ovr: number): number {
  if (ovr <= ANCHORS[0][0]) return ANCHORS[0][1];
  const last = ANCHORS[ANCHORS.length - 1];
  if (ovr >= last[0]) return last[1];
  for (let i = 1; i < ANCHORS.length; i++) {
    const [o1, s1] = ANCHORS[i];
    if (ovr <= o1) {
      const [o0, s0] = ANCHORS[i - 1];
      const raw = s0 + ((ovr - o0) / (o1 - o0)) * (s1 - s0);
      return Math.round(raw * 2) / 2;
    }
  }
  return last[1];
}

const filled = (roster: RosterSlots) => ALL_SLOTS.filter((s) => roster[s]);

export function capRoom(roster: RosterSlots): number {
  return CAP - filled(roster).reduce((sum, s) => sum + salaryFor(roster[s]!.ovr), 0);
}

/** True if picking `p` still leaves enough room to fill every other open slot at minimum salary. */
export function canAfford(roster: RosterSlots, p: Player): boolean {
  const openAfter = ALL_SLOTS.length - filled(roster).length - 1;
  return capRoom(roster) - salaryFor(p.ovr) >= openAfter * MIN_SALARY;
}
