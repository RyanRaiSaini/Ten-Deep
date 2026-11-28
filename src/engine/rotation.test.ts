import { describe, expect, it } from 'vitest';
import { BALANCE_PER_POS, STACK_PENALTY, benchBalance, lineupMinutes, squadRating, teamStrength } from './rotation';
import type { Player, Pos, Roster, SlotId } from './types';

let n = 0;
const player = (pos: Pos, ovr = 75, pos2?: Pos): Player => ({ id: `p${n++}`, name: `P${n}`, pos, pos2, ovr, off: ovr, def: ovr, reb: ovr, ast: ovr, three: ovr, dur: 90 });
const starters: Record<string, Player> = { PG: player('PG', 85), SG: player('SG', 85), SF: player('SF', 85), PF: player('PF', 85), C: player('C', 85) };
const roster = (bench: Player[]): Roster => ({
  id: 'user', name: 'Test', colors: ['#000', '#fff'],
  slots: { ...starters, B1: bench[0], B2: bench[1], B3: bench[2], B4: bench[3], B5: bench[4] } as Record<SlotId, Player>,
});

describe('bench balance', () => {
  it('a backup at every position is worth +1; nothing on the bench is worth nothing', () => {
    const b = benchBalance(roster([player('PG'), player('SG'), player('SF'), player('PF'), player('C')]).slots);
    expect(b.covered).toEqual(['PG', 'SG', 'SF', 'PF', 'C']);
    expect(b.stacked).toBeNull();
    expect(b.bonus).toBeCloseTo(5 * BALANCE_PER_POS, 5);
    expect(benchBalance({}).bonus).toBe(0);
  });

  it('five point guards cover one position and pay for the three extra: -1.3', () => {
    const b = benchBalance(roster([player('PG'), player('PG'), player('PG'), player('PG'), player('PG')]).slots);
    expect(b.covered).toEqual(['PG']);
    expect(b.stacked).toBe('PG');
    expect(b.stackCount).toBe(5);
    expect(b.bonus).toBeCloseTo(BALANCE_PER_POS - 3 * STACK_PENALTY, 5);
  });

  it('two at a position is fine; a third starts the penalty', () => {
    expect(benchBalance(roster([player('PG'), player('PG'), player('SF'), player('PF'), player('C')]).slots).bonus).toBeCloseTo(0.8, 5);
    expect(benchBalance(roster([player('PG'), player('PG'), player('PG'), player('PF'), player('C')]).slots).bonus).toBeCloseTo(0.6 - 0.5, 5);
  });

  it('a two-position player covers both, and counts toward stacking only at his main one', () => {
    const b = benchBalance(roster([player('SF', 75, 'PF'), player('PG'), player('SG'), player('C'), player('PG')]).slots);
    expect(b.covered).toEqual(['PG', 'SG', 'SF', 'PF', 'C']);
    expect(b.stacked).toBeNull();
    expect(b.bonus).toBeCloseTo(1, 5);
  });

  it('shows up in Squad Rating and in the sim strength, and an injured backup covers nothing', () => {
    const balanced = roster([player('PG'), player('SG'), player('SF'), player('PF'), player('C')]);
    const stacked = roster([player('PG'), player('PG'), player('PG'), player('PG'), player('PG')]);
    expect(squadRating(balanced) - squadRating(stacked)).toBeCloseTo(2.3, 5);
    const sb = teamStrength(lineupMinutes(balanced, new Set()));
    const ss = teamStrength(lineupMinutes(stacked, new Set()));
    expect(sb.off - ss.off).toBeGreaterThan(2);
    // The C backup is hurt: coverage drops to four positions.
    const hurt = teamStrength(lineupMinutes(balanced, new Set([balanced.slots.B5.id])));
    expect(sb.off - hurt.off).toBeGreaterThan(0);
  });
});
