import { describe, expect, it } from 'vitest';
import { atSquadRating, bestRoster, goodDraft, runSeasons } from '../../scripts/calibrate';
import { current2026 } from '../data/current2026';
import { squadRating } from './rotation';

/**
 * Difficulty guardrails (owner's targets, against the real 2026-27 rosters), by Squad Rating:
 *   96 → about 80 wins and a ~70% title · 95 → about 78, ~50% · 94 → about 75, ~35% · 93 → about 70, ~15%
 *   92 → about 67, ~9% · 90 → about 60 · 85 → about 50, almost never a title. The very top pulls away: few players
 *   are rated that high, so a 95 is a different animal from a 93.
 * Checked two ways: the same drafted squads moved to each level (ratings stop at 99, so the last of a 95+ is a team
 * rating), and real star-heavy drafts as they come (a squad of two stars and a cheap bench must play like its
 * number). Every AI league is levelled to the same strength (SIM.leagueSr), so the eras follow the same curve. If a
 * change breaks these, retune src/engine/simConfig.ts.
 */
const N = 40;
const bases = Array.from({ length: N }, (_, i) => goodDraft(current2026, `cal-${i}`));
const at = (sr: number) => runSeasons((i) => atSquadRating(bases[i % N], sr), current2026, N, `cal-sr${sr}`);

describe('calibration (2026 pool, real rosters)', () => {
  it('Squad Rating 96: about 80 wins, a title most of the time, and 82-0 is possible', () => {
    const r = at(96);
    expect(r.avg).toBeGreaterThanOrEqual(76);
    expect(r.avg).toBeLessThanOrEqual(82);
    expect(r.titleRate).toBeGreaterThanOrEqual(0.55);
    expect(r.perfect).toBeGreaterThan(0);
  }, 120_000);

  it('Squad Rating 95: about 78 wins, a coin flip for the title', () => {
    const r = at(95);
    expect(r.avg).toBeGreaterThanOrEqual(74);
    expect(r.avg).toBeLessThanOrEqual(81);
    expect(r.titleRate).toBeGreaterThanOrEqual(0.3);
    expect(r.titleRate).toBeLessThanOrEqual(0.7);
  }, 120_000);

  it('Squad Rating 93: about 70 wins, titles about one in seven', () => {
    const r = at(93);
    expect(r.avg).toBeGreaterThanOrEqual(67);
    expect(r.avg).toBeLessThanOrEqual(75);
    expect(r.titleRate).toBeLessThanOrEqual(0.3);
  }, 120_000);

  it('Squad Rating 90: about 60 wins, titles rare', () => {
    const r = at(90);
    expect(r.avg).toBeGreaterThanOrEqual(56);
    expect(r.avg).toBeLessThanOrEqual(64);
    expect(r.perfect).toBe(0);
    expect(r.titleRate).toBeLessThanOrEqual(0.08);
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
    expect(r.avg).toBeGreaterThanOrEqual(60); // the AI's legend contenders get the top-end bonus too
    expect(r.perfect).toBeLessThanOrEqual(3);
  }, 180_000);
});
