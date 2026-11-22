import { describe, expect, it } from 'vitest';
import { CAP, MIN_SALARY, canAfford, capRoom, salaryFor } from './cap';
import type { Player, RosterSlots } from './types';

const mk = (id: string, ovr: number): Player => ({
  id, name: id, pos: 'SF', ovr, off: ovr, def: ovr, reb: ovr, ast: ovr, three: ovr, dur: 80,
});

describe('salaryFor', () => {
  it('pins the spec anchor points', () => {
    expect(salaryFor(99)).toBe(50);
    expect(salaryFor(95)).toBe(42);
    expect(salaryFor(90)).toBe(30);
    expect(salaryFor(85)).toBe(20);
    expect(salaryFor(80)).toBe(12);
    expect(salaryFor(75)).toBe(6);
    expect(salaryFor(70)).toBe(3);
    expect(salaryFor(64)).toBe(1);
  });

  it('is non-decreasing from 64 to 99 and rounds to $0.5M', () => {
    for (let o = 65; o <= 99; o++) {
      expect(salaryFor(o)).toBeGreaterThanOrEqual(salaryFor(o - 1));
      expect((salaryFor(o) * 2) % 1).toBe(0);
    }
  });

  it('clamps outside the 64–99 range', () => {
    expect(salaryFor(50)).toBe(1);
    expect(salaryFor(120)).toBe(50);
  });
});

describe('cap room and affordability', () => {
  it('capRoom subtracts salaries from the $150M cap', () => {
    expect(CAP).toBe(150);
    expect(MIN_SALARY).toBe(1);
    const roster: RosterSlots = { PG: mk('a', 99), SG: mk('b', 90) };
    expect(capRoom(roster)).toBe(70);
  });

  it('reserves minimum salary for every slot still open after the pick', () => {
    // 9 open slots: after picking, 8 remain and need $8M reserved.
    const roster: RosterSlots = { PG: mk('a', 99), SG: mk('b', 99) }; // 100 used, 50 left, 8 open
    // picking a 95 ($42M) leaves $8M for the 7 slots still open → ok
    expect(canAfford(roster, mk('c', 95))).toBe(true);
    // picking a 97 leaves less than 7 × $1M
    expect(canAfford(roster, mk('d', 97))).toBe(false);
  });

  it('never lets three 99s fit with seven minimum slots left', () => {
    const roster: RosterSlots = { PG: mk('a', 99), SG: mk('b', 99) };
    expect(canAfford(roster, mk('c', 99))).toBe(false);
  });

  it('the last open slot only needs its own salary to fit', () => {
    const roster: RosterSlots = {
      PG: mk('a', 99), SG: mk('b', 95), SF: mk('c', 90), PF: mk('d', 64), C: mk('e', 64),
      B1: mk('f', 64), B2: mk('g', 64), B3: mk('h', 64), B4: mk('i', 64),
    }; // 50+42+30+6 = 128 → 22 left, 1 open
    expect(canAfford(roster, mk('j', 86))).toBe(salaryFor(86) <= 22);
    expect(canAfford(roster, mk('k', 90))).toBe(false);
  });
});
