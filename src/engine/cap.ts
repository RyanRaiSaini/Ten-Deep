import { CONTRACTS, MARKET_CURVE, type ContractType } from '../data/contracts';
import { ALL_SLOTS, type Player, type RosterSlots } from './types';

export const CAP = 200;
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

/**
 * Game dollars: a real salary as a share of that season's cap, × 171.4 (so a 35% supermax = $60M).
 * See src/data/contracts.ts (generated from real contracts by scripts/contracts/build.mts).
 */
export const GAME_DOLLARS_PER_CAP = 60 / 0.35;

/**
 * Market rate for a rating: the median real veteran contract at that rating (fitted, MARKET_CURVE).
 * Used where no real contract exists: Career-mode free agency and re-signing.
 */
export function salaryFor(ovr: number): number {
  const c = MARKET_CURVE;
  if (ovr <= c[0][0]) return c[0][1];
  for (let i = c.length - 1; i >= 0; i--) if (ovr >= c[i][0]) return c[i][1];
  return c[0][1];
}

/** Real rookie scale (2026-27, signed at 120%) as a share of the cap, by first-round pick; linear between. */
const ROOKIE_SCALE: [number, number][] = [[1, 0.0894], [2, 0.08], [3, 0.0718], [4, 0.0646], [5, 0.0585], [7, 0.048], [10, 0.0392], [15, 0.0298], [20, 0.0236], [25, 0.0198], [30, 0.0177]];
/** Second-round picks and later sign near the rookie minimum. */
const SECOND_ROUND_SHARE = 0.0083;

/**
 * The apron: how far over the cap a team may go by re-signing its own players (like the NBA's Bird rights,
 * limited by the aprons). New signings still have to fit under the cap; minimum deals and rookies don't.
 */
export const APRON = CAP + 30;

/** A minimum contract (the floor of the real market curve): what the minimum-salary exception pays. */
export const MIN_CONTRACT = MARKET_CURVE[0][1];

export function rookieScale(pick: number): number {
  let share = SECOND_ROUND_SHARE;
  if (pick <= 30) {
    const i = ROOKIE_SCALE.findIndex(([p]) => p >= pick);
    const [p1, s1] = ROOKIE_SCALE[i];
    const [p0, s0] = ROOKIE_SCALE[Math.max(0, i - 1)];
    share = p1 === p0 ? s1 : s0 + ((pick - p0) / (p1 - p0)) * (s1 - s0);
  }
  return Math.round(share * GAME_DOLLARS_PER_CAP * 10) / 10;
}

const filled = (roster: RosterSlots) => ALL_SLOTS.filter((s) => roster[s]);

/** Real contracts of every player-season in the full rosters (src/data/fullHistory.ts registers them as it loads). */
const SEASON_CONTRACTS: Record<string, [number, ContractType]> = {};
export function registerContracts(entries: Iterable<[string, [number, ContractType]]>) {
  for (const [id, c] of entries) SEASON_CONTRACTS[id] = c;
}
/** His real deal that season: the hand-built list, unless that's only an estimate and the full rosters have the real one. */
const contractOf = (id: string) => {
  const a = CONTRACTS[id];
  return a && a[1] !== 'est' ? a : SEASON_CONTRACTS[id] ?? a;
};

/**
 * What a player costs: his signed contract in Career mode, else his real contract for that season,
 * else the market rate for his rating.
 */
export function payOf(p: Player): number {
  if (p.salary !== undefined) return p.salary;
  return (!p.released && contractOf(p.id)?.[0]) || salaryFor(p.ovr);
}

/** The kind of deal a player is on (supermax, max, rookie scale, two-way, minimum…); null when it's an estimate. */
export function contractType(p: Player): Exclude<ContractType, 'est'> | null {
  if (p.contractType) return p.contractType;
  if (p.released) return null;
  const t = contractOf(p.id)?.[1];
  return t && t !== 'est' ? t : null;
}

export function capRoom(roster: RosterSlots): number {
  // Salaries are in $0.1M steps; round so float noise (2.9999999…) can't make an exact fit look over the cap.
  return Math.round((CAP - filled(roster).reduce((sum, s) => sum + payOf(roster[s]!), 0)) * 10) / 10;
}

/** True if picking `p` still leaves enough room to fill every other open slot at minimum salary. */
export function canAfford(roster: RosterSlots, p: Player): boolean {
  const openAfter = ALL_SLOTS.length - filled(roster).length - 1;
  return capRoom(roster) - payOf(p) >= openAfter * MIN_SALARY;
}
