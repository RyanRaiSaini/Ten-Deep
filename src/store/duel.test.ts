import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {}, clear: async () => {} },
}));

const { useDuel } = await import('./duel');
const { useProgress } = await import('./progress');

describe('duel store', () => {
  it('playing the series twice (a double tap) counts one duel', () => {
    const d = useDuel.getState();
    d.start('A', 'B');
    // Draft both teams with fallback picks until there is nothing left to pick.
    for (let i = 0; i < 40; i++) {
      try { useDuel.getState().fallback(); } catch { break; }
    }
    const n = useProgress.getState().stats.duels;
    useDuel.getState().playSeries();
    useDuel.getState().playSeries();
    expect(useProgress.getState().stats.duels).toBe(n + 1);
  });
});
