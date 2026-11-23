import { describe, expect, it } from 'vitest';
import { averageUser, bestRoster, goodDraft, runSeasons } from '../../scripts/calibrate';
import { current2026 } from '../data/current2026';

/**
 * Difficulty guardrails (owner's targets, $200M cap):
 *   - a good draft averages 55–60 wins; about 1 run in 10 reaches 70+; 82-0 is possible but rare (~1 in 450)
 *   - title odds climb with strength: ~5% for a 55-win team, ~20% at 60, ~40% at 65, ~55% at 70, 75+ a big favourite
 * Measured over 800+ seasons when tuned (see SIM in simConfig.ts); these seeded checks keep the shape in place.
 * If a change breaks them, retune src/engine/simConfig.ts with `npx tsx scripts/calibrate.ts`.
 */
describe('calibration (2026 pool)', () => {
  it('a good draft averages 55–60 wins, sometimes 70+, and wins some titles but far from all', () => {
    const r = runSeasons((i) => goodDraft(current2026, `cal-good-${i}`), current2026, 80, 'cal-good');
    expect(r.avg).toBeGreaterThanOrEqual(55);
    expect(r.avg).toBeLessThanOrEqual(61);
    expect(r.p70).toBeGreaterThan(0.02);
    expect(r.p70).toBeLessThan(0.22);
    expect(r.titleRate).toBeGreaterThanOrEqual(0.08);
    expect(r.titleRate).toBeLessThanOrEqual(0.4);
  }, 240_000);

  // bestRoster stacks raw ratings, which isn't always the most effective build: it lands around 60 wins.
  it('a stacked-by-rating roster is a real contender, not a lock', () => {
    const r = runSeasons(bestRoster(current2026, 60), current2026, 40, 'cal-best');
    expect(r.avg).toBeGreaterThanOrEqual(58);
    expect(r.avg).toBeLessThanOrEqual(76);
    expect(r.titleRate).toBeGreaterThanOrEqual(0.12);
    expect(r.titleRate).toBeLessThanOrEqual(0.9);
  }, 120_000);

  it('All-Time pool: the best roster of legends stays believable (no routine 82-0s)', async () => {
    const { MODE_BY_ID } = await import('../data/modes');
    const allTime = MODE_BY_ID['all-time'].pool;
    const r = runSeasons(bestRoster(allTime, 40), allTime, 15, 'cal-alltime');
    expect(r.perfect).toBeLessThanOrEqual(1);
    expect(r.avg).toBeLessThanOrEqual(76);
  }, 180_000);

  it('a league-average roster wins about 41 games and almost never a title', () => {
    const r = runSeasons((i) => averageUser(current2026, i), current2026, 20, 'cal-avg');
    expect(r.avg).toBeGreaterThanOrEqual(34);
    expect(r.avg).toBeLessThanOrEqual(47);
    expect(r.titleRate).toBeLessThanOrEqual(0.05);
  }, 120_000);
});
