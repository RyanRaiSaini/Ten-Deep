import { describe, expect, it } from 'vitest';
import { POSITIONS } from '../engine/types';
import { current2026 } from './current2026';
import { parseRoster } from './build';

describe('parseRoster', () => {
  it('derives sub-ratings from overall + archetype and reads flags', () => {
    const [p] = parseRoster('t', 'Test Shooter|SG/SF|80|27|shooter|55|?');
    expect(p).toMatchObject({ name: 'Test Shooter', pos: 'SG', pos2: 'SF', ovr: 80, age: 27, tag: 'shooter', dur: 55, verify: true });
    expect(p.three).toBeGreaterThan(p.ovr);
    expect(p.reb).toBeLessThan(p.ovr);
  });
  it('rejects ratings outside 64–99', () => {
    expect(() => parseRoster('t', 'Bad|PG|63|25|scorer')).toThrow();
    expect(() => parseRoster('t', 'Bad|PG|100|25|scorer')).toThrow();
  });
});

describe('Current Day 2026 pool', () => {
  const players = current2026.teams.flatMap((t) => t.players);

  it('has every overall between 64 and 99', () => {
    for (const p of players) {
      expect(p.ovr).toBeGreaterThanOrEqual(64);
      expect(p.ovr).toBeLessThanOrEqual(99);
    }
  });

  it('has no duplicate player ids or names', () => {
    expect(new Set(players.map((p) => p.id)).size).toBe(players.length);
    expect(new Set(players.map((p) => p.name)).size).toBe(players.length);
  });

  it('has 30 NBA teams plus the rookie class, each covering all five positions', () => {
    expect(current2026.teams.filter((t) => t.id !== 'rookies-2026')).toHaveLength(30);
    for (const t of current2026.teams) {
      const covered = new Set(t.players.flatMap((p) => [p.pos, p.pos2]));
      for (const pos of POSITIONS) expect(covered.has(pos), `${t.label} missing ${pos}`).toBe(true);
    }
  });

  it('has at least 350 players', () => {
    expect(players.length).toBeGreaterThanOrEqual(350);
  });

  it('puts the four 2026 superstars at 97', () => {
    for (const n of ['Shai Gilgeous-Alexander', 'Nikola Jokić', 'Luka Dončić', 'Victor Wembanyama'])
      expect(players.find((p) => p.name === n)?.ovr, n).toBe(97);
    const lebron = players.find((p) => p.name === 'LeBron James')!;
    expect(lebron.ovr).toBeGreaterThanOrEqual(86);
    expect(lebron.ovr).toBeLessThanOrEqual(91);
  });
});
