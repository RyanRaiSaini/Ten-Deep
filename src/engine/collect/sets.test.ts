import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from '../../data/cards';
import { HISTORY } from '../../data/modes';
import { teamStrengthScore } from '../daily';
import { ALL_SLOTS } from '../types';
import { cardLevel, lineupRoster } from './lineup';
import { SETS, closestSets, newlyCompleted, setReward, setsFor } from './sets';

describe('card levels', () => {
  it('each duplicate is a level, capped at 3', () => {
    expect([1, 2, 3, 4, 9].map(cardLevel)).toEqual([0, 1, 2, 3, 3]);
  });

  it('levels raise the card\'s rating in a lineup (capped at 99)', () => {
    const curry = ALL_CARDS.find((c) => c.id === 'stephen-curry-2016')!;
    const base = lineupRoster({ PG: curry.id });
    const leveled = lineupRoster({ PG: curry.id }, { [curry.id]: 3 });
    expect(base.slots.PG.ovr).toBe(curry.ovr);
    expect(leveled.slots.PG.ovr).toBe(Math.min(99, curry.ovr + 3));
    expect(leveled.slots.PG.off).toBeGreaterThan(base.slots.PG.off - 1);
    const mid = ALL_CARDS.find((c) => c.ovr === 80)!;
    expect(lineupRoster({ B1: mid.id }, { [mid.id]: 2 }).slots.B1.ovr).toBe(82);
  });
});

describe('sets', () => {
  it('every team-season is a set of its player cards', () => {
    expect(SETS.length).toBe(HISTORY.length);
    const bulls96 = SETS.find((s) => s.id === 'chi-1996')!;
    expect(bulls96.cards.length).toBe(HISTORY.find((t) => t.id === 'chi-1996')!.players.length);
    expect(setsFor('michael-jordan-1996').map((s) => s.id)).toContain('chi-1996');
  });

  it('detects sets completed by a newly added card, only once', () => {
    const s = SETS.find((x) => x.id === 'chi-1996')!;
    const before = new Set(s.cards.slice(0, -1));
    const after = new Set(s.cards);
    expect(newlyCompleted(before, after).map((x) => x.id)).toEqual(['chi-1996']);
    expect(newlyCompleted(after, after)).toEqual([]);
  });

  it('elite sets pay a Mythic pick, others a Weekly pick', () => {
    const strongest = [...SETS].sort((a, b) => b.strength - a.strength)[0];
    expect(setReward(strongest)).toBe('mythic');
    const weakest = [...SETS].sort((a, b) => a.strength - b.strength)[0];
    expect(setReward(weakest)).toBe('weekly');
    expect(strongest.strength).toBeCloseTo(teamStrengthScore(HISTORY.find((t) => t.id === strongest.id)!), 5);
  });

  it('closest sets ranks by fewest missing cards, then by strength', () => {
    const s = SETS.find((x) => x.id === 'gsw-2016')!;
    const owned = new Set(s.cards.slice(0, s.cards.length - 1));
    const top = closestSets(owned, 3);
    expect(top[0].set.id).toBe('gsw-2016');
    expect(top[0].have).toBe(s.cards.length - 1);
  });

  it('lineup ids for unknown levels default to level 0', () => {
    const r = lineupRoster({ PG: 'stephen-curry-2016' }, {});
    for (const k of ALL_SLOTS) expect(r.slots[k]).toBeDefined();
  });
});
