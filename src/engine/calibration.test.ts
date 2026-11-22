import { describe, expect, it } from 'vitest';
import { averageUser, bestRoster, runSeasons } from '../../scripts/calibrate';
import { current2026 } from '../data/current2026';

/**
 * Difficulty guardrails from the design spec (§5.5). Seeded, so results are stable for a given engine.
 * If a change breaks these, retune src/engine/simConfig.ts with `npx tsx scripts/calibrate.ts`.
 */
describe('calibration (2026 pool)', () => {
  it('the best legal roster wins ~60–70 games, rarely 70+, never 82-0, and wins ~25–50% of titles', () => {
    const r = runSeasons(bestRoster(current2026, 60), current2026, 30, 'cal-best');
    expect(r.avg).toBeGreaterThanOrEqual(60);
    expect(r.avg).toBeLessThanOrEqual(70);
    expect(r.p70).toBeLessThan(0.3);
    expect(r.perfect).toBe(0);
    expect(r.titleRate).toBeGreaterThanOrEqual(0.25);
    expect(r.titleRate).toBeLessThanOrEqual(0.55);
  }, 120_000);

  it('a league-average roster wins about 41 games and no titles', () => {
    const r = runSeasons((i) => averageUser(current2026, i), current2026, 20, 'cal-avg');
    expect(r.avg).toBeGreaterThanOrEqual(36);
    expect(r.avg).toBeLessThanOrEqual(47);
    expect(r.titleRate).toBeLessThanOrEqual(0.05);
  }, 120_000);
});
