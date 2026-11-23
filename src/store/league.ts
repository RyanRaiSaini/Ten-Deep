import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { settle, type Settlement } from '../engine/league/ladder';
import { weekKey } from '../engine/progress/missions';
import { useCollection } from './collection';

export interface LeagueStore {
  /** Monday (YYYY-MM-DD) of the week you're playing in. */
  week: string | null;
  tier: number;
  points: number;
  /** Last week's result, shown until dismissed. */
  result: Settlement | null;
  best: number;
  rollover: (today: string) => void;
  add: (points: number) => void;
  /** Change this week's points by a signed amount (never below zero). */
  adjust: (delta: number) => void;
  dismiss: () => void;
}

export const useLeague = create<LeagueStore>()(
  persist(
    (set, get) => ({
      week: null,
      tier: 0,
      points: 0,
      result: null,
      best: 0,

      /** A new week settles the old one (only the week you actually played; idle weeks don't relegate you again). */
      rollover: (today) => {
        const s = get();
        const week = weekKey(today);
        if (s.week === week) return;
        if (!s.week) return set({ week, points: 0 });
        const r = settle(s.week, s.tier, s.points);
        if (r.reward) useCollection.getState().grant(r.reward, `league:${s.week}`);
        set({ week, tier: r.tier, points: 0, result: r, best: Math.max(s.best, r.tier) });
      },

      add: (points) => set((s) => ({ points: s.points + Math.max(0, points) })),
      adjust: (delta) => set((s) => ({ points: Math.max(0, s.points + delta) })),
      dismiss: () => set({ result: null }),
    }),
    { name: 'tendeep-league', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
