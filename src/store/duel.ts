import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { current2026 } from '../data/current2026';
import { duelFallback, duelPick, rosterOf, startDuel, type DuelState } from '../engine/duel';
import { createRng } from '../engine/rng';
import { bestOf7, type SeriesResult } from '../engine/series';
import type { SlotId } from '../engine/types';

const POOL = current2026;
export const DUEL_COLORS: Record<'a' | 'b', [string, string]> = { a: ['#E8833A', '#0B1020'], b: ['#3DF2C2', '#0B1020'] };

export interface DuelStore {
  names: { a: string; b: string };
  state: DuelState | null;
  series: SeriesResult | null;
  /** Series games revealed so far (play them one at a time). */
  shown: number;
  start: (a: string, b: string) => void;
  pick: (playerId: string, slot: SlotId) => void;
  fallback: () => void;
  playSeries: () => void;
  reveal: () => void;
  reset: () => void;
}

export const useDuel = create<DuelStore>()(
  persist(
    (set, get) => ({
      names: { a: 'Player 1', b: 'Player 2' },
      state: null,
      series: null,
      shown: 0,
      start: (a, b) =>
        set({
          names: { a: a.trim() || 'Player 1', b: b.trim() || 'Player 2' },
          state: startDuel(POOL, `duel-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`),
          series: null,
          shown: 0,
        }),
      pick: (playerId, slot) => set((s) => (s.state ? { state: duelPick(s.state, playerId, slot, POOL) } : {})),
      fallback: () => set((s) => (s.state ? { state: duelFallback(s.state, POOL) } : {})),
      playSeries: () => {
        const { state, names } = get();
        if (!state) return;
        const series = bestOf7(rosterOf(state.a, names.a, DUEL_COLORS.a), rosterOf(state.b, names.b, DUEL_COLORS.b), createRng(`${state.seed}:series`));
        set({ series, shown: 0 });
      },
      reveal: () => set((s) => ({ shown: Math.min((s.series?.games.length ?? 0), s.shown + 1) })),
      reset: () => set({ state: null, series: null, shown: 0 }),
    }),
    { name: 'tendeep-duel', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const DUEL_POOL = POOL;
