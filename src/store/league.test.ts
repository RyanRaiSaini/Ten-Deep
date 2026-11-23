import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {}, clear: async () => {} },
}));

const { useLeague } = await import('./league');
const { useCollection } = await import('./collection');
const { track } = await import('./progress');

describe('league store', () => {
  beforeEach(() => {
    useLeague.setState(useLeague.getInitialState(), true);
    useCollection.setState(useCollection.getInitialState(), true);
  });

  it('finished runs and dailies earn league points this week', () => {
    useLeague.getState().rollover('2026-11-23');
    track({ type: 'run', wins: 60, losses: 22, champion: true, madePlayoffs: true, seed: 1, playoffLosses: 2, kind: 'current', verdict: null });
    track({ type: 'daily', perfect: false });
    expect(useLeague.getState().points).toBe(30 + 10 + 25 + 5);
  });

  it('a big week promotes you on Monday and pays a pick, once', () => {
    useLeague.getState().rollover('2026-11-23');
    useLeague.getState().add(50_000);
    useLeague.getState().rollover('2026-11-30');
    expect(useLeague.getState()).toMatchObject({ tier: 1, points: 0, week: '2026-11-30' });
    expect(useLeague.getState().result).toMatchObject({ rank: 1, reward: 'mythic' });
    expect(useCollection.getState().pending.filter((p) => p.source === 'league:2026-11-23')).toHaveLength(1);
    useLeague.getState().rollover('2026-11-30');
    expect(useCollection.getState().pending.filter((p) => p.source.startsWith('league:'))).toHaveLength(1);
  });

  it('an empty week does not relegate you from the bottom tier', () => {
    useLeague.getState().rollover('2026-11-23');
    useLeague.getState().rollover('2026-11-30');
    expect(useLeague.getState().tier).toBe(0);
  });
});
