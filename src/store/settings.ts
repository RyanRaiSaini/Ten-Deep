import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Language } from '../i18n/languages';

export const SIM_SPEEDS = [0.5, 1, 2, 4] as const;
export type SimSpeed = (typeof SIM_SPEEDS)[number];

export interface Settings {
  music: boolean;
  sfx: boolean;
  haptics: boolean;
  notifDaily: boolean;
  notifStreak: boolean;
  notifDuel: boolean;
  simSpeed: SimSpeed;
  nationality: string;
  language: Language | null;
  set: (patch: Partial<Omit<Settings, 'set'>>) => void;
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      music: true,
      sfx: true,
      haptics: true,
      notifDaily: true,
      notifStreak: true,
      notifDuel: true,
      simSpeed: 1,
      nationality: '🇨🇦',
      language: null,
      set: (patch) => set(patch),
    }),
    { name: 'tendeep-settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
