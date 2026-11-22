import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ALL_CARDS } from '../data/cards';
import { generatePick, runPickType, type PickType } from '../engine/collect/picks';
import { advanceStreak, streakRewards } from '../engine/collect/streak';

export interface PendingPick {
  id: string;
  type: PickType;
  /** Card ids on offer (5), fixed when the pick is earned so reopening shows the same cards. */
  cards: string[];
  /** What earned it, e.g. "day-7" or a run seed. */
  source: string;
}

export interface CollectionStore {
  owned: Record<string, { count: number; firstDay: string }>;
  pending: PendingPick[];
  streak: number;
  lastDay: string | null;
  /** Run keys already rewarded (one pick per run). */
  awardedRuns: string[];
  checkIn: (today: string) => void;
  awardRun: (runKey: string, result: { wins: number; champion: boolean; madePlayoffs: boolean }) => void;
  keep: (pickId: string, cardId: string) => void;
}

const pick = (type: PickType, source: string): PendingPick => ({
  id: `${type}:${source}`, type, source, cards: generatePick(ALL_CARDS, type, source).map((c) => c.id),
});

export const useCollection = create<CollectionStore>()(
  persist(
    (set, get) => ({
      owned: {},
      pending: [],
      streak: 0,
      lastDay: null,
      awardedRuns: [],

      /** Opening the app on a new day: advance the streak and grant that day's picks. */
      checkIn: (today) => {
        const s = get();
        if (s.lastDay === today) return;
        const streak = advanceStreak(s.lastDay, today, s.streak);
        const earned = streakRewards(streak).map((type) => pick(type, `${today}:day-${streak}`));
        set({ streak, lastDay: today, pending: [...s.pending, ...earned] });
      },

      awardRun: (runKey, result) => {
        const s = get();
        if (s.awardedRuns.includes(runKey)) return;
        set({ awardedRuns: [...s.awardedRuns.slice(-200), runKey], pending: [...s.pending, pick(runPickType(result), runKey)] });
      },

      keep: (pickId, cardId) =>
        set((s) => {
          const p = s.pending.find((x) => x.id === pickId);
          if (!p || !p.cards.includes(cardId)) return {};
          const prev = s.owned[cardId];
          return {
            pending: s.pending.filter((x) => x.id !== pickId),
            owned: { ...s.owned, [cardId]: { count: (prev?.count ?? 0) + 1, firstDay: prev?.firstDay ?? s.lastDay ?? '' } },
          };
        }),
    }),
    { name: 'tendeep-collection', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
