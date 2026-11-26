import { describe, expect, it } from 'vitest';
import { atSquadRating, bestRoster, goodDraft, runSeasons } from '../../scripts/calibrate';
import { current2026 } from '../data/current2026';

/**
 * Difficulty guardrails (owner's targets, against the real 2026-27 rosters), by Squad Rating. Every AI league is
 * levelled to the same strength (SIM.leagueSr), so the eras follow the same curve:
 *   93 → about 80 wins (out of reach under the cap) · 91 → about 76 · 88 → about 70 · 86 → about 65
 *   84 → about 55 · 80 → about 33. The owner's middle ground: harder than "84 goes 74-8", easier than 84 → 49.
 *   The best squad the cap allows is about 90 (Current Day) to 92 (eras), so 82-0 stays nearly impossible.
 * Measured over 150 seasons per level when tuned (see SIM in simConfig.ts); these seeded checks keep the shape.
 * If a change breaks them, retune src/engine/simConfig.ts.
 */
const N = 40;
const bases = Array.from({ length: N }, (_, i) => goodDraft(current2026, `cal-${i}`));
const at = (sr: number) => runSeasons((i) => atSquadRating(bases[i % N], sr), current2026, N, `cal-sr${sr}`);

describe('calibration (2026 pool, real rosters)', () => {
  it('Squad Rating 93: about 78 wins, nearly always 70+', () => {
    const r = at(93);
    expect(r.avg).toBeGreaterThanOrEqual(75);
    expect(r.avg).toBeLessThanOrEqual(81);
    expect(r.p70).toBeGreaterThan(0.85);
  }, 120_000);

  it('Squad Rating 91: about 76 wins on average', () => {
    const r = at(91);
    expect(r.avg).toBeGreaterThanOrEqual(73);
    expect(r.avg).toBeLessThanOrEqual(80);
  }, 120_000);

  it('Squad Rating 87: about 68 wins, never 82-0', () => {
    const r = at(87);
    expect(r.avg).toBeGreaterThanOrEqual(63);
    expect(r.avg).toBeLessThanOrEqual(73);
    expect(r.perfect).toBe(0);
  }, 120_000);

  it('Squad Rating 83: about 50 wins, never 82-0, rarely a title', () => {
    const r = at(83);
    expect(r.avg).toBeGreaterThanOrEqual(44);
    expect(r.avg).toBeLessThanOrEqual(56);
    expect(r.perfect).toBe(0);
    expect(r.titleRate).toBeLessThanOrEqual(0.1);
  }, 120_000);

  it('eras are no easier: every AI league plays at the same strength, so an 84 is about .500-plus anywhere', async () => {
    const { MODE_BY_ID } = await import('../data/modes');
    for (const id of ['era-lebron', 'era-magic-bird']) {
      const pool = MODE_BY_ID[id].pool;
      const eraBases = Array.from({ length: 12 }, (_, i) => goodDraft(pool, `cal-${id}-${i}`));
      const r = runSeasons((i) => atSquadRating(eraBases[i % 12], 84), pool, 24, `cal-${id}`);
      expect(r.avg, id).toBeGreaterThanOrEqual(46);
      expect(r.avg, id).toBeLessThanOrEqual(62); // it went 74-8 before the leagues were levelled
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
