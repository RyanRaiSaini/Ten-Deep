import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {}, clear: async () => {} },
}));

const { useProgress, track } = await import('./progress');
const { useCollection } = await import('./collection');
const { dailyMissions, weeklyMissions } = await import('../engine/progress/missions');

const run = { type: 'run' as const, wins: 50, losses: 32, champion: false, madePlayoffs: true, seed: 4, playoffLosses: 4, kind: 'current' as const, verdict: null };

describe('progress store', () => {
  beforeEach(() => {
    useProgress.setState(useProgress.getInitialState(), true);
    useCollection.setState(useCollection.getInitialState(), true);
  });

  it('missions count from the start of the day; daily ones pay no pick, weekly ones pay once', () => {
    const day = '2026-11-23';
    track({ type: 'duel' }); // before the day starts: doesn't count
    useProgress.getState().rollover(day);
    const m = dailyMissions(day)[0];
    expect(useProgress.getState().claim(m.id)).toBe(false); // not done yet
    for (let i = 0; i < 10; i++) {
      track(run);
      track({ type: 'daily', perfect: false });
      track({ type: 'duel' });
      track({ type: 'gauntlet' });
      track({ type: 'pack' });
      track({ ...run, kind: 'franchise' });
      track({ ...run, kind: 'era' });
    }
    expect(useProgress.getState().claim(m.id)).toBe(true);
    expect(useProgress.getState().claim(m.id)).toBe(false);
    expect(useCollection.getState().pending.filter((p) => p.source.startsWith('mission:'))).toHaveLength(0);
    const w = weeklyMissions(day).find((x) => useProgress.getState().claim(x.id));
    expect(w).toBeDefined();
    expect(useCollection.getState().pending.filter((p) => p.source.startsWith('mission:'))).toHaveLength(1);
  });

  it('a new day resets daily progress; the week carries on until Monday', () => {
    useProgress.getState().rollover('2026-11-23');
    track(run);
    useProgress.getState().rollover('2026-11-24');
    const s = useProgress.getState();
    expect(s.dayBase.runs).toBe(1);
    expect(s.weekBase.runs).toBe(0);
    useProgress.getState().rollover('2026-11-30');
    expect(useProgress.getState().weekBase.runs).toBe(1);
  });

  it('achievements unlock from events, pay their reward once, and queue a toast', () => {
    useProgress.getState().rollover('2026-11-23');
    track({ ...run, champion: true });
    const s = useProgress.getState();
    expect(s.unlocked.ring).toBe('2026-11-23');
    expect(s.toasts).toContain('ring');
    const ringPicks = () => useCollection.getState().pending.filter((p) => p.source === 'ach:ring');
    expect(ringPicks()).toHaveLength(1);
    track({ ...run, champion: true });
    expect(ringPicks()).toHaveLength(1);
  });

  it('collection milestones unlock on check()', () => {
    useProgress.getState().rollover('2026-11-23');
    useCollection.setState({ streak: 7 });
    useProgress.getState().check();
    expect(useProgress.getState().unlocked.loyal).toBeDefined();
  });

  it('the first rollover backfills seasons and titles from the profile, once', async () => {
    const { useProfile } = await import('./profile');
    useProfile.setState({ draftsPlayed: 12, titles: 2 });
    useProgress.getState().rollover('2026-11-23');
    expect(useProgress.getState().stats).toMatchObject({ runs: 12, titles: 2 });
    expect(useProgress.getState().unlocked.ring).toBeDefined();
    // Missions don't count the backfill as today's progress
    expect(useProgress.getState().dayBase.runs).toBe(12);
    useProgress.getState().rollover('2026-11-24');
    expect(useProgress.getState().stats.runs).toBe(12);
    useProfile.setState(useProfile.getInitialState(), true);
  });

  it('moving the clock back to an earlier week cannot pay a weekly mission twice', async () => {
    const { weeklyMissions } = await import('../engine/progress/missions');
    useProgress.getState().rollover('2026-11-23');
    const m = weeklyMissions('2026-11-23')[0];
    useProgress.setState((s) => ({ stats: { ...s.stats, [m.stat]: s.stats[m.stat] + m.target } }));
    expect(useProgress.getState().claim(m.id)).toBe(true);
    useProgress.getState().rollover('2026-11-30'); // next week
    useProgress.getState().rollover('2026-11-24'); // clock moved back
    useProgress.setState((s) => ({ stats: { ...s.stats, [m.stat]: s.stats[m.stat] + m.target } }));
    expect(useProgress.getState().claim(m.id)).toBe(false);
  });
});

