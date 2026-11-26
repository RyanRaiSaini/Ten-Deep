import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Language } from '../i18n/languages';

export const SIM_SPEEDS = [0.5, 1, 2, 4] as const;
export type SimSpeed = (typeof SIM_SPEEDS)[number];

export interface Settings {
  /** Sound effects on/off (off when the volume is 0). */
  sfx: boolean;
  /** Sound-effects volume, 0..1. */
  sfxVolume: number;
  haptics: boolean;
  notifDaily: boolean;
  notifStreak: boolean;
  notifDuel: boolean;
  simSpeed: SimSpeed;
  nationality: string;
  language: Language | null;
  /** Seen the first-launch welcome slides. */
  onboarded: boolean;
  /** Seen the how-to-play card that pops up the first time you open a game mode. */
  introSeen: boolean;
  set: (patch: Partial<Omit<Settings, 'set'>>) => void;
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      sfx: true,
      sfxVolume: 1,
      haptics: true,
      notifDaily: true,
      notifStreak: true,
      notifDuel: true,
      simSpeed: 1,
      nationality: '🇨🇦',
      language: null,
      onboarded: false,
      introSeen: false,
      set: (patch) => set(patch),
    }),
    { name: 'tendeep-settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
