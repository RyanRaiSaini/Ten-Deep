/**
 * Positions for versatile legends, approved by the owner, for every season of theirs. The season data mostly lists a
 * single position (Pippen is "SF" in all 17 of his), so without this a point forward could never start at the
 * point. The first position is his main one. Current Day players carry theirs in src/data/current2026.ts.
 */
import type { Pos } from '../engine/types';

export const LEGEND_POSITIONS: Record<string, Pos[]> = {
  'Magic Johnson': ['PG', 'SF', 'PF'],
  'Scottie Pippen': ['SF', 'PG', 'PF'],
  'Larry Bird': ['SF', 'PF'],
  'Michael Jordan': ['SG', 'SF'],
  'Kobe Bryant': ['SG', 'SF'],
  'LeBron James': ['SF', 'PF', 'PG'],
  'Kevin Durant': ['SF', 'PF', 'SG'],
  'Giannis Antetokounmpo': ['PF', 'C'],
  'Kevin Garnett': ['PF', 'C'],
  'Tim Duncan': ['PF', 'C'],
  'Dirk Nowitzki': ['PF', 'C'],
  'Chris Webber': ['PF', 'C'],
  'Kevin McHale': ['PF', 'C'],
  'Rasheed Wallace': ['PF', 'C'],
  'Pau Gasol': ['PF', 'C'],
  'Anthony Davis': ['PF', 'C'],
  'Chris Bosh': ['PF', 'C'],
  'Charles Barkley': ['PF', 'SF'],
  'Dennis Rodman': ['PF', 'SF'],
  'Robert Horry': ['PF', 'SF'],
  'Lamar Odom': ['PF', 'SF'],
  'Grant Hill': ['SF', 'PG'],
  'Toni Kukoč': ['SF', 'PF', 'PG'],
  'Boris Diaw': ['PF', 'C', 'SF'],
  'Penny Hardaway': ['PG', 'SG', 'SF'],
  'Ben Simmons': ['PG', 'PF'],
  'Jimmy Butler': ['SF', 'SG', 'PF'],
  'Paul George': ['SF', 'PF', 'SG'],
  'Paul Pierce': ['SF', 'SG', 'PF'],
  'Kawhi Leonard': ['SF', 'PF'],
  'Carmelo Anthony': ['SF', 'PF'],
  'Shawn Marion': ['SF', 'PF'],
  'Julius Erving': ['SF', 'PF'],
  'Elgin Baylor': ['SF', 'PF'],
  'Ron Artest': ['SF', 'PF'],
  'Tracy McGrady': ['SG', 'SF'],
  'Vince Carter': ['SG', 'SF'],
  'Manu Ginóbili': ['SG', 'SF'],
  'Andre Iguodala': ['SF', 'SG'],
  'John Havlicek': ['SF', 'SG'],
  'Dwyane Wade': ['SG', 'PG'],
  'Jerry West': ['PG', 'SG'],
  'James Harden': ['PG', 'SG'],
  'Stephen Curry': ['PG', 'SG'],
  'Russell Westbrook': ['PG', 'SG'],
  'Oscar Robertson': ['PG', 'SG'],
};

/** A player (or card) with the legend's positions, if he has a listing; unchanged otherwise. */
export function withLegendPositions<T extends { name: string; pos: Pos; pos2?: Pos; more?: Pos[] }>(p: T): T {
  const list = LEGEND_POSITIONS[p.name];
  if (!list) return p;
  const [pos, pos2, ...more] = list;
  const { pos2: _p2, more: _m, ...rest } = p;
  return { ...rest, pos, ...(pos2 ? { pos2 } : {}), ...(more.length ? { more } : {}) } as T;
}
