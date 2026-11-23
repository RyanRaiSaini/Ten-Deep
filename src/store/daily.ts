import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { track } from './progress';

/** Daily trivia is five questions; 5/5 is a perfect score. */
const TRIVIA_QUESTIONS = 5;

/** Mid-challenge state, saved on every answer so leaving the screen can't reset a one-shot challenge. */
export interface Progress {
  i: number;
  score: number;
  /** Choice made on question `i` (answer already revealed), or null if not answered yet. */
  picked: string | null;
}

export interface DailyDay {
  draft?: { wins: number; losses: number; champion: boolean };
  /** The Daily Draft was begun; it can be resumed but never restarted. */
  draftStarted?: boolean;
  progress?: { trivia?: Progress; derby?: Progress; teamDuel?: Progress };
  trivia?: number;
  rank?: number;
  teamRank?: number;
  derby?: number;
  /** 1 if the Team Duel winner was guessed right, else 0. */
  teamDuel?: number;
}

export interface DailyStore {
  days: Record<string, DailyDay>;
  /** First result for a day wins — one shot per challenge. */
  record: <K extends keyof DailyDay>(key: string, kind: K, value: NonNullable<DailyDay[K]>) => void;
  saveProgress: (key: string, kind: 'trivia' | 'derby' | 'teamDuel', p: Progress) => void;
}

export const useDaily = create<DailyStore>()(
  persist(
    (set, get) => ({
      days: {},
      record: (key, kind, value) => {
        if (get().days[key]?.[kind] !== undefined) return;
        set((s) => ({ days: { ...s.days, [key]: { ...s.days[key], [kind]: value } } }));
        track({ type: 'daily', perfect: kind === 'trivia' && value === TRIVIA_QUESTIONS });
      },
      saveProgress: (key, kind, p) =>
        set((s) => ({ days: { ...s.days, [key]: { ...s.days[key], progress: { ...s.days[key]?.progress, [kind]: p } } } })),
    }),
    { name: 'tendeep-daily', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
