import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface DailyDay {
  draft?: { wins: number; losses: number; champion: boolean };
  trivia?: number;
  rank?: number;
}

export interface DailyStore {
  days: Record<string, DailyDay>;
  /** First result for a day wins — one shot per challenge. */
  record: <K extends keyof DailyDay>(key: string, kind: K, value: NonNullable<DailyDay[K]>) => void;
}

export const useDaily = create<DailyStore>()(
  persist(
    (set) => ({
      days: {},
      record: (key, kind, value) =>
        set((s) => (s.days[key]?.[kind] !== undefined ? {} : { days: { ...s.days, [key]: { ...s.days[key], [kind]: value } } })),
    }),
    { name: 'tendeep-daily', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
