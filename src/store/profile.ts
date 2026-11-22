import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { dailyKey } from '../engine/daily';

export interface Profile {
  /** The home-screen streak: drafts played. */
  draftsPlayed: number;
  titles: number;
  bestWins: number;
  bestLosses: number;
  avatarId: string;
  /** Day (YYYY-MM-DD) of the last finished draft; drives the streak reminder. */
  lastPlayed?: string;
  recordDraft: (result: { wins: number; losses: number; champion: boolean }) => void;
  set: (patch: Partial<Pick<Profile, 'avatarId'>>) => void;
}

export const useProfile = create<Profile>()(
  persist(
    (set) => ({
      draftsPlayed: 0,
      titles: 0,
      bestWins: 0,
      bestLosses: 0,
      avatarId: 'floor-general-hardwood',
      recordDraft: ({ wins, losses, champion }) =>
        set((s) => ({
          draftsPlayed: s.draftsPlayed + 1,
          lastPlayed: dailyKey(),
          titles: s.titles + (champion ? 1 : 0),
          ...(wins > s.bestWins || s.draftsPlayed === 0 ? { bestWins: wins, bestLosses: losses } : {}),
        })),
      set: (patch) => set(patch),
    }),
    { name: 'tendeep-profile', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
