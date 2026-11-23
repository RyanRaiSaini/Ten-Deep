import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, newlyUnlocked, valueOf, type Snapshot } from './achievements';
import { DAILY_POOL, WEEKLY_POOL, dailyMissions, missionProgress, weekKey, weeklyMissions } from './missions';
import { EMPTY_STATS, applyEvent, type RunEvent } from './stats';

const run = (p: Partial<RunEvent> = {}): RunEvent => ({
  type: 'run', wins: 45, losses: 37, champion: false, madePlayoffs: true, seed: 6, playoffLosses: 4, kind: 'current', verdict: null, ...p,
});

describe('stats', () => {
  it('a finished season bumps the right counters', () => {
    const s = applyEvent(EMPTY_STATS, run({ wins: 72, losses: 10, champion: true, seed: 1, playoffLosses: 0 }));
    expect(s).toMatchObject({ runs: 1, seasonWins: 72, playoffRuns: 1, titles: 1, win40: 1, win55: 1, win60: 1, win70: 1, win75: 0, perfectTitles: 1, cinderella: 0, underdog: 0 });
  });

  it('title shapes: low seed is a Cinderella, under 50 wins is an underdog', () => {
    const s = applyEvent(EMPTY_STATS, run({ wins: 47, champion: true, seed: 6, playoffLosses: 7 }));
    expect(s).toMatchObject({ titles: 1, cinderella: 1, underdog: 1, perfectTitles: 0, win55: 0 });
  });

  it('mode kinds and crisis verdicts are counted', () => {
    let s = applyEvent(EMPTY_STATS, run({ kind: 'crisis', verdict: 'legend' }));
    s = applyEvent(s, run({ kind: 'crisis', verdict: 'fired' }));
    s = applyEvent(s, run({ kind: 'career', champion: true }));
    s = applyEvent(s, run({ kind: 'franchise' }));
    s = applyEvent(s, run({ kind: 'era' }));
    expect(s).toMatchObject({ crisisRuns: 2, crisisLegend: 1, crisisFired: 1, careerSeasons: 1, careerTitles: 1, franchiseRuns: 1, eraRuns: 1, runs: 5 });
  });

  it('dailies, duels, gauntlet series and packs', () => {
    let s = applyEvent(EMPTY_STATS, { type: 'daily', perfect: true });
    s = applyEvent(s, { type: 'daily', perfect: false });
    s = applyEvent(s, { type: 'duel' });
    s = applyEvent(s, { type: 'gauntlet' });
    s = applyEvent(s, { type: 'pack' });
    expect(s).toMatchObject({ dailyGames: 2, triviaPerfect: 1, duels: 1, gauntletSeries: 1, packs: 1 });
  });

  it('never mutates its input', () => {
    const before = { ...EMPTY_STATS };
    applyEvent(EMPTY_STATS, run());
    expect(EMPTY_STATS).toEqual(before);
  });
});

describe('missions', () => {
  it('three daily and three weekly missions, seeded by the date', () => {
    expect(dailyMissions('2026-11-23')).toHaveLength(3);
    expect(dailyMissions('2026-11-23')).toEqual(dailyMissions('2026-11-23'));
    expect(new Set(dailyMissions('2026-11-23').map((m) => m.id)).size).toBe(3);
    expect(weeklyMissions('2026-11-23')).toHaveLength(3);
    // Same week → same weekly missions
    expect(weeklyMissions('2026-11-23')).toEqual(weeklyMissions('2026-11-29'));
    const days = new Set(Array.from({ length: 14 }, (_, i) => dailyMissions(`2026-12-${String(i + 1).padStart(2, '0')}`).map((m) => m.id).join()));
    expect(days.size).toBeGreaterThan(5);
  });

  it('weeks start on Monday', () => {
    expect(weekKey('2026-11-23')).toBe('2026-11-23'); // a Monday
    expect(weekKey('2026-11-29')).toBe('2026-11-23'); // Sunday
    expect(weekKey('2026-11-30')).toBe('2026-11-30');
    expect(weekKey('2027-01-01')).toBe('2026-12-28');
  });

  it('progress counts only what happened since the period began, capped at the target', () => {
    const m = DAILY_POOL.find((x) => x.stat === 'runs')!;
    const base = { ...EMPTY_STATS, runs: 10 };
    expect(missionProgress(m, { ...EMPTY_STATS, runs: 10 }, base)).toBe(0);
    expect(missionProgress(m, { ...EMPTY_STATS, runs: 14 }, base)).toBe(m.target);
  });

  it('pools only use counters that events can move', () => {
    for (const m of [...DAILY_POOL, ...WEEKLY_POOL]) expect(m.stat in EMPTY_STATS).toBe(true);
  });
});

describe('achievements', () => {
  const snap = (p: Partial<Snapshot> = {}): Snapshot => ({
    stats: EMPTY_STATS, owned: 0, hasEpic: 0, hasMythic: 0, hasUltra: 0, sets: 0, maxLevel: 0, gauntlet: 0, streak: 0, ...p,
  });

  it('there are 40+ with unique ids, and gold ones pay the best reward', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) expect(a.reward).toBe({ bronze: null, silver: 'weekly', gold: 'mythic' }[a.tier]);
  });

  it('unlocks when the stat reaches the target, and only once', () => {
    const s = snap({ stats: applyEvent(EMPTY_STATS, run({ champion: true, wins: 60, seed: 2, playoffLosses: 3 })) });
    const first = newlyUnlocked(s, {}).map((a) => a.id);
    expect(first).toEqual(expect.arrayContaining(['rookie', 'postseason', 'ring', 'juggernaut']));
    expect(first).not.toContain('dynasty');
    const unlocked = Object.fromEntries(first.map((id) => [id, '2026-11-23']));
    expect(newlyUnlocked(s, unlocked)).toEqual([]);
  });

  it('collection achievements read the collection snapshot', () => {
    expect(valueOf(snap({ owned: 30 }), 'owned')).toBe(30);
    expect(newlyUnlocked(snap({ owned: 30, hasMythic: 1, streak: 7 }), {}).map((a) => a.id)).toEqual(
      expect.arrayContaining(['collector', 'mythic-pull', 'loyal']),
    );
  });

  it('a starter squad alone unlocks nothing', () => {
    expect(newlyUnlocked(snap({ owned: 10, streak: 1 }), {})).toEqual([]);
  });
});

describe('progress strings', () => {
  it('every stat and achievement has an English label', async () => {
    const en = (await import('../../i18n/locales/en.json')).default as { stat: Record<string, string>; ach: Record<string, string> };
    const { DAILY_POOL: D, WEEKLY_POOL: W } = await import('./missions');
    for (const a of ACHIEVEMENTS) {
      expect(en.ach[a.id], a.id).toBeTruthy();
      expect(en.stat[a.stat], a.stat).toBeTruthy();
    }
    for (const m of [...D, ...W]) expect(en.stat[m.stat], m.stat).toBeTruthy();
  });
});
