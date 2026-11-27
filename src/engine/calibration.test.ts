import { describe, expect, it } from 'vitest';
import { atSquadRating, bestRoster, goodDraft, runSeasons } from '../../scripts/calibrate';
import { current2026 } from '../data/current2026';
import { squadRating } from './rotation';

/**
 * Difficulty guardrails (owner's targets, against the real 2026-27 rosters), by Squad Rating:
 *   96 → about 77 wins and the only level where 82-0 happens · 93 → about 70 · 90 → about 62 · 88 → about 55
 *   85 → about 50. Titles take a 95+ squad: about half the time at 96, a third at 95, one in ten at 93, almost
 *   never below 92.
 * Checked two ways: the same drafted squads moved to each level, and real star-heavy drafts as they come (a squad
 * of two stars and a cheap bench must play like its number). Every AI league is levelled to the same strength
 * (SIM.leagueSr), so the eras follow the same curve. If a change breaks these, retune src/engine/simConfig.ts.
 */
const N = 40;
const bases = Array.from({ length: N }, (_, i) => goodDraft(current2026, `cal-${i}`));
const at = (sr: number) => runSeasons((i) => atSquadRating(bases[i % N], sr), current2026, N, `cal-sr${sr}`);

describe('calibration (2026 pool, real rosters)', () => {
  it('Squad Rating 96: about 77 wins, and 82-0 is possible', () => {
    const r = at(96);
    expect(r.avg).toBeGreaterThanOrEqual(73);
    expect(r.avg).toBeLessThanOrEqual(81);
    expect(r.titleRate).toBeGreaterThan(0.35);
  }, 120_000);

  it('Squad Rating 93: about 70 wins, never 82-0', () => {
    const r = at(93);
    expect(r.avg).toBeGreaterThanOrEqual(65);
    expect(r.avg).toBeLessThanOrEqual(74);
    expect(r.perfect).toBe(0);
    expect(r.titleRate).toBeLessThanOrEqual(0.2);
  }, 120_000);

  it('Squad Rating 90: about 62 wins, titles rare', () => {
    const r = at(90);
    expect(r.avg).toBeGreaterThanOrEqual(57);
    expect(r.avg).toBeLessThanOrEqual(65);
    expect(r.perfect).toBe(0);
    expect(r.titleRate).toBeLessThanOrEqual(0.05);
  }, 120_000);

  it('Squad Rating 85: about 50 wins, almost never a title', () => {
    const r = at(85);
    expect(r.avg).toBeGreaterThanOrEqual(44);
    expect(r.avg).toBeLessThanOrEqual(54);
    expect(r.titleRate).toBeLessThanOrEqual(0.05);
  }, 120_000);

  it('star-heavy real drafts play like their number: an 85–87 averages about 50, never 70+', () => {
    const wins: number[] = [];
    for (let i = 0; i < 120 && wins.length < 30; i++) {
      const u = goodDraft(current2026, `cal-real-${i}`);
      const sr = squadRating(u);
      if (sr < 85 || sr >= 87.5) continue;
      wins.push(runSeasons(u, current2026, 1, `cal-real-${i}`).avg);
    }
    expect(wins.length).toBeGreaterThanOrEqual(10);
    const avg = wins.reduce((a, b) => a + b, 0) / wins.length;
    expect(avg).toBeGreaterThanOrEqual(42);
    expect(avg).toBeLessThanOrEqual(57);
    expect(Math.max(...wins)).toBeLessThan(70); // an 86 went 78-4 before
  }, 240_000);

  it('eras are no easier: every AI league plays at the same strength, so an 84 is a mid-40s-win team anywhere', async () => {
    const { MODE_BY_ID } = await import('../data/modes');
    for (const id of ['era-lebron', 'era-magic-bird']) {
      const pool = MODE_BY_ID[id].pool;
      const eraBases = Array.from({ length: 12 }, (_, i) => goodDraft(pool, `cal-${id}-${i}`));
      const r = runSeasons((i) => atSquadRating(eraBases[i % 12], 84), pool, 24, `cal-${id}`);
      expect(r.avg, id).toBeGreaterThanOrEqual(38);
      expect(r.avg, id).toBeLessThanOrEqual(54); // an 84 averages about 45 (it went 74-8 before the leagues were levelled)
      expect(r.perfect, id).toBe(0);
    }
  }, 240_000);

  it('All-Time pool: the best roster of legends is a heavy favourite, not a lock on 82-0', async () => {
    const { MODE_BY_ID } = await import('../data/modes');
    const allTime = MODE_BY_ID['all-time'].pool;
    const r = runSeasons(bestRoster(allTime, 40), allTime, 20, 'cal-alltime');
    expect(r.avg).toBeGreaterThanOrEqual(66);
    expect(r.perfect).toBeLessThanOrEqual(3);
  }, 180_000);
});
