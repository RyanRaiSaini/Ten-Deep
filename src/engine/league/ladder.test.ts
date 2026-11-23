import { describe, expect, it } from 'vitest';
import { LADDER, PROMOTE, RELEGATE, cohort, pointsFor, settle, standings, weekProgress } from './ladder';

describe('weekly league ladder', () => {
  it('has 10 tiers from Bronze III to Legend', () => {
    expect(LADDER).toHaveLength(10);
    expect(LADDER[0]).toEqual({ group: 'bronze', level: 3 });
    expect(LADDER[9]).toEqual({ group: 'legend', level: 0 });
  });

  it('each week and tier has the same 29 AI rivals (deterministic), labeled as bots', () => {
    const a = cohort('2026-11-23', 2);
    expect(a).toHaveLength(29);
    expect(cohort('2026-11-23', 2)).toEqual(a);
    expect(cohort('2026-11-30', 2)).not.toEqual(a);
    expect(new Set(a.map((b) => b.name)).size).toBe(29);
  });

  it('rivals score through the week and higher tiers score more', () => {
    const sum = (tier: number, t: number) => cohort('2026-11-23', tier).reduce((n, b) => n + Math.round(b.target * weekProgress(b, t)), 0);
    expect(sum(0, 0)).toBe(0);
    expect(sum(0, 0.5)).toBeGreaterThan(0);
    expect(sum(0, 1)).toBeGreaterThan(sum(0, 0.5));
    expect(sum(8, 1)).toBeGreaterThan(sum(0, 1) * 3);
  });

  it('standings rank you among the rivals with promotion and relegation zones', () => {
    const rows = standings('2026-11-23', 3, 100_000, 0.5);
    expect(rows).toHaveLength(30);
    expect(rows[0].you).toBe(true);
    expect(rows[0].zone).toBe('promote');
    expect(rows.filter((r) => r.zone === 'promote')).toHaveLength(PROMOTE);
    expect(rows.filter((r) => r.zone === 'relegate')).toHaveLength(RELEGATE);
    // No relegation from the bottom tier, no promotion from the top.
    expect(standings('2026-11-23', 0, 0, 1).some((r) => r.zone === 'relegate')).toBe(false);
    expect(standings('2026-11-23', 9, 1e9, 1).some((r) => r.zone === 'promote')).toBe(false);
  });

  it('settling a week moves you up, down, or keeps you, with a reward for a top finish', () => {
    expect(settle('2026-11-23', 3, 100_000)).toMatchObject({ rank: 1, tier: 4, reward: 'mythic' });
    expect(settle('2026-11-23', 3, 0)).toMatchObject({ tier: 2, reward: null });
    expect(settle('2026-11-23', 0, 0).tier).toBe(0);
  });

  it('points: half your wins, plus playoffs and titles; dailies count too', () => {
    expect(pointsFor({ type: 'run', wins: 61, champion: true, madePlayoffs: true })).toBe(31 + 10 + 25);
    expect(pointsFor({ type: 'run', wins: 30, champion: false, madePlayoffs: false })).toBe(15);
    expect(pointsFor({ type: 'daily' })).toBe(5);
  });
});
