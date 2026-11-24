import { describe, expect, it } from 'vitest';
import { CONTRACTS } from '../data/contracts';
import { CAP, MIN_SALARY, canAfford, capRoom, contractType, payOf, rookieScale, salaryFor } from './cap';
import type { Player, RosterSlots } from './types';

/** A made-up player (no real contract) at a given salary. */
const mk = (id: string, ovr: number, salary?: number): Player => ({
  id: `test-${id}`, name: id, pos: 'SF', ovr, off: ovr, def: ovr, reb: ovr, ast: ovr, three: ovr, dur: 80,
  ...(salary !== undefined ? { salary } : {}),
});
const real = (id: string, ovr = 90): Player => ({ ...mk(id, ovr), id });

describe('real contracts', () => {
  it('a player costs his real contract, not his rating', () => {
    // Rookie-scale stars are cheap; maxes are expensive, whatever the rating says.
    expect(payOf(real('cooper-flagg-2026-27', 93))).toBe(CONTRACTS['cooper-flagg-2026-27'][0]);
    expect(contractType(real('cooper-flagg-2026-27'))).toBe('rookie');
    expect(payOf(real('cooper-flagg-2026-27', 93))).toBeLessThan(20);
    expect(contractType(real('victor-wembanyama-2026-27'))).toBe('rookie');
    expect(contractType(real('nikola-jokic-2026-27'))).toBe('supermax');
    expect(payOf(real('nikola-jokic-2026-27'))).toBe(60);
    expect(contractType(real('trae-young-2026-27'))).toBe('max');
    expect(payOf(real('trae-young-2026-27'))).toBeGreaterThan(49);
    expect(payOf(real('trae-young-2026-27'))).toBeLessThan(53);
  });

  it('a Career-mode contract overrides the real one', () => {
    expect(payOf({ ...real('nikola-jokic-2026-27'), salary: 12 })).toBe(12);
  });

  it('every contract is between the minimum and the $60M supermax', () => {
    for (const [s] of Object.values(CONTRACTS)) {
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThanOrEqual(60);
    }
  });
});

describe('rookie scale', () => {
  it('follows the real 2026-27 scale by pick (about 8.9% of the cap at #1, 1.8% at #30)', () => {
    expect(rookieScale(1)).toBeCloseTo(15.3, 0);
    expect(rookieScale(7)).toBeCloseTo(8.2, 0);
    expect(rookieScale(30)).toBeCloseTo(3, 0);
    for (let p = 2; p <= 30; p++) expect(rookieScale(p)).toBeLessThanOrEqual(rookieScale(p - 1));
  });
  it('second-round picks are dirt cheap', () => {
    expect(rookieScale(31)).toBeLessThan(1.5);
    expect(rookieScale(45)).toBe(rookieScale(31));
  });
});

describe('market rate (free agency, players without a real contract)', () => {
  it('is fitted to real deals: non-decreasing, minimum-ish at the bottom, max-ish at the top', () => {
    for (let o = 61; o <= 99; o++) expect(salaryFor(o)).toBeGreaterThanOrEqual(salaryFor(o - 1));
    expect(salaryFor(60)).toBeLessThan(4);
    expect(salaryFor(97)).toBeGreaterThan(40);
    expect(salaryFor(120)).toBeLessThanOrEqual(60);
  });
});

describe('cap room and affordability', () => {
  it('capRoom subtracts salaries from the $200M cap', () => {
    expect(CAP).toBe(200);
    expect(MIN_SALARY).toBe(1);
    expect(capRoom({ PG: mk('a', 99, 50), SG: mk('b', 90, 30) })).toBe(120);
  });

  it('reserves minimum salary for every slot still open after the pick', () => {
    const roster: RosterSlots = { PG: mk('a', 99, 50), SG: mk('b', 99, 50), SF: mk('c', 99, 50), PF: mk('d', 90, 30) };
    // $20M left, 6 open: after the pick 5 remain and need $5M.
    expect(canAfford(roster, mk('e', 80, 12))).toBe(true);
    expect(canAfford(roster, mk('f', 85, 20))).toBe(false);
  });

  it('the last open slot only needs its own salary to fit', () => {
    const roster: RosterSlots = {
      PG: mk('a', 99, 50), SG: mk('b', 95, 42), SF: mk('c', 90, 30), PF: mk('d', 99, 50), C: mk('e', 64, 1),
      B1: mk('f', 64, 1), B2: mk('g', 64, 1), B3: mk('h', 64, 1), B4: mk('i', 64, 1),
    }; // 177 used → 23 left, 1 open
    expect(canAfford(roster, mk('j', 86, 23))).toBe(true);
    expect(canAfford(roster, mk('k', 90, 23.5))).toBe(false);
  });
});
