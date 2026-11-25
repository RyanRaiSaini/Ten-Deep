/**
 * Your Weekly Challenge runs: one attempt per week (it can be resumed, never restarted), the result, whether it
 * reached the leaderboard, and whether the end-of-week prize was paid.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { weeklyPrize, type Depth } from '../engine/weekly';
import { fetchBoard, submitWeekly } from '../net/weekly';
import { useCollection } from './collection';
import { useFriends } from './friends';
import { useProfile } from './profile';

export interface WeeklyRun {
  started?: boolean;
  result?: { w: number; l: number; depth: Depth; sr: number };
  /** The leaderboard has it. */
  submitted?: boolean;
  rank?: number;
  total?: number;
  /** The end-of-week prize was checked (paid if earned). */
  prized?: boolean;
}

export interface WeeklyStore {
  weeks: Record<string, WeeklyRun>;
  update: (week: string, patch: Partial<WeeklyRun>) => void;
  /** Send a finished run that isn't on the board yet. */
  submit: (week: string) => Promise<void>;
  /** After a week ends: look up your final rank once and pay its prize. Returns the prize, if any. */
  settle: (week: string) => Promise<string | null>;
}

export const useWeekly = create<WeeklyStore>()(
  persist(
    (set, get) => ({
      weeks: {},
      update: (week, patch) => set((s) => ({ weeks: { ...s.weeks, [week]: { ...s.weeks[week], ...patch } } })),
      submit: async (week) => {
        const run = get().weeks[week];
        if (!run?.result || run.submitted) return;
        const { pin, key } = useFriends.getState();
        const r = await submitWeekly({ week, pin, key, name: useProfile.getState().name || 'Player', ...run.result });
        if (r) get().update(week, { submitted: true, rank: r.rank, total: r.total });
      },
      settle: async (week) => {
        const run = get().weeks[week];
        if (!run?.result || run.prized) return null;
        if (!run.submitted) await get().submit(week);
        const b = await fetchBoard(week, useFriends.getState().pin);
        if (!b?.me) return null;
        const prize = weeklyPrize(b.me.rank, b.total);
        if (prize) useCollection.getState().grant(prize, `weekly-board:${week}`);
        get().update(week, { prized: true, rank: b.me.rank, total: b.total });
        return prize;
      },
    }),
    { name: 'tendeep-weekly', version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);
