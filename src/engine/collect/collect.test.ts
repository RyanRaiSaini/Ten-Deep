import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from '../../data/cards';
import { PICK_TYPES, generatePick, runRewards, type PickType, type RunOutcome } from './picks';
import { advanceStreak, streakRewards } from './streak';
import { TIERS, tierOf } from './tiers';

describe('tiers', () => {
  it('maps overall to tier at the documented boundaries', () => {
    expect([64, 74, 75, 79, 80, 84, 85, 89, 90, 94, 95, 99].map(tierOf)).toEqual([
      'common', 'common', 'uncommon', 'uncommon', 'rare', 'rare', 'epic', 'epic', 'mythic', 'mythic', 'ultra', 'ultra',
    ]);
    expect(TIERS).toEqual(['common', 'uncommon', 'rare', 'epic', 'mythic', 'ultra']);
  });
});

describe('card pool', () => {
  it('has every player-season as its own card, with unique ids, and every tier represented', () => {
    expect(new Set(ALL_CARDS.map((c) => c.id)).size).toBe(ALL_CARDS.length);
    for (const t of TIERS) expect(ALL_CARDS.some((c) => c.tier === t), t).toBe(true);
    // different seasons of the same player are different cards
    expect(ALL_CARDS.filter((c) => c.name === 'LeBron James').length).toBeGreaterThan(2);
  });
});

describe('picks', () => {
  it.each(PICK_TYPES.map((t) => [t] as const))('%s: 5 distinct cards, deterministic', (type) => {
    const p = generatePick(ALL_CARDS, type, `seed-${type}`);
    expect(p).toHaveLength(5);
    expect(new Set(p.map((c) => c.id)).size).toBe(5);
    expect(generatePick(ALL_CARDS, type, `seed-${type}`)).toEqual(p);
  });

  it('guarantees: champion all 83+, mythic one 90+, legendary one Ultra', () => {
    for (let i = 0; i < 200; i++) {
      expect(generatePick(ALL_CARDS, 'champion', `c${i}`).every((c) => c.ovr >= 83)).toBe(true);
      expect(generatePick(ALL_CARDS, 'mythic', `m${i}`).some((c) => c.ovr >= 90)).toBe(true);
      expect(generatePick(ALL_CARDS, 'legendary', `l${i}`).some((c) => c.tier === 'ultra')).toBe(true);
    }
  });

  it('odds: daily Ultras are rare; weekly gives roughly 20% 85+ cards', () => {
    const rate = (type: PickType, f: (ovr: number) => boolean) => {
      let hit = 0;
      let n = 0;
      for (let i = 0; i < 600; i++) for (const c of generatePick(ALL_CARDS, type, `${type}-${i}`)) { n++; if (f(c.ovr)) hit++; }
      return hit / n;
    };
    expect(rate('daily', (o) => o >= 95)).toBeLessThan(0.01);
    const weekly = rate('weekly', (o) => o >= 85);
    expect(weekly).toBeGreaterThan(0.15);
    expect(weekly).toBeLessThan(0.27);
    expect(rate('daily', (o) => o >= 85)).toBeLessThan(weekly);
  });

  it('run rewards: a season pick for every run, plus a playoff pick that grows with how deep you went', () => {
    const run = (o: Partial<RunOutcome>): RunOutcome => ({ wins: 45, losses: 37, champion: false, madePlayoffs: false, round: -1, finalsSweep: false, playoffLosses: 0, ...o });
    expect(runRewards(run({}))).toEqual(['run']);
    expect(runRewards(run({ wins: 59, losses: 23, madePlayoffs: true, round: 1 }))).toEqual(['run']);
    expect(runRewards(run({ wins: 60, losses: 22, madePlayoffs: true, round: 0 }))).toEqual(['good']);
    expect(runRewards(run({ wins: 62, losses: 20, madePlayoffs: true, round: 2 }))).toEqual(['good', 'confFinals']);
    expect(runRewards(run({ wins: 50, losses: 32, madePlayoffs: true, round: 3 }))).toEqual(['run', 'finals']);
    expect(runRewards(run({ wins: 66, losses: 16, madePlayoffs: true, round: 3, champion: true, playoffLosses: 5 }))).toEqual(['good', 'champion']);
    expect(runRewards(run({ wins: 70, losses: 12, madePlayoffs: true, round: 3, champion: true, finalsSweep: true, playoffLosses: 3 }))).toEqual(['good', 'sweep']);
    expect(runRewards(run({ wins: 82, losses: 0, madePlayoffs: true, round: 3, champion: true, finalsSweep: true, playoffLosses: 1 }))).toEqual(['legendary', 'sweep']);
    expect(runRewards(run({ wins: 82, losses: 0, madePlayoffs: true, round: 3, champion: true, finalsSweep: true, playoffLosses: 0 }))).toEqual(['legendary', 'ultimate']);
  });

  it('the Ultimate pick is 98+ only; Sweep and Champion picks have their floors', () => {
    for (let i = 0; i < 30; i++) {
      expect(generatePick(ALL_CARDS, 'ultimate', `u${i}`).every((c) => c.ovr >= 98)).toBe(true);
      expect(generatePick(ALL_CARDS, 'sweep', `s${i}`).every((c) => c.ovr >= 85)).toBe(true);
      expect(generatePick(ALL_CARDS, 'finals', `f${i}`).every((c) => c.ovr >= 80)).toBe(true);
    }
  });
});

describe('login streak', () => {
  it('counts consecutive days, ignores same-day reopens, resets after a gap', () => {
    expect(advanceStreak(null, '2026-11-22', 0)).toBe(1);
    expect(advanceStreak('2026-11-22', '2026-11-22', 4)).toBe(4);
    expect(advanceStreak('2026-11-22', '2026-11-23', 4)).toBe(5);
    expect(advanceStreak('2026-11-30', '2026-12-01', 9)).toBe(10); // month boundary
    expect(advanceStreak('2026-11-20', '2026-11-23', 9)).toBe(1);
  });

  it('no pick for just logging in; a Weekly pick every 7th day, a Mythic every 31st', () => {
    expect(streakRewards(1)).toEqual([]);
    expect(streakRewards(6)).toEqual([]);
    expect(streakRewards(7)).toEqual(['weekly']);
    expect(streakRewards(14)).toEqual(['weekly']);
    expect(streakRewards(31)).toEqual(['mythic']);
    expect(streakRewards(62)).toEqual(['mythic']);
  });
});
