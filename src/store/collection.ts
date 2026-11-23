import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ALL_CARDS } from '../data/cards';
import { generatePick, runPickType, type PickType } from '../engine/collect/picks';
import { autoFill, canPlace, cardLevel, stageReward, starterSquad, type Lineup } from '../engine/collect/lineup';
import { newlyCompleted, setReward } from '../engine/collect/sets';
import { advanceStreak, streakRewards } from '../engine/collect/streak';
import type { SlotId } from '../engine/types';

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
  /** Your card lineup (slot → card id). */
  lineup: Lineup;
  /** Gauntlet progress: stages cleared (0–10) and which reward stages have paid out. */
  gauntlet: { cleared: number; rewarded: number[] };
  checkIn: (today: string) => void;
  awardRun: (runKey: string, result: { wins: number; champion: boolean; madePlayoffs: boolean }) => void;
  keep: (pickId: string, cardId: string) => void;
  setSlot: (slot: SlotId, cardId: string | null) => void;
  autoFillLineup: () => void;
  recordStage: (stage: number, won: boolean) => void;
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
      lineup: {},
      gauntlet: { cleared: 0, rewarded: [] },

      /** Opening the app on a new day: advance the streak and grant that day's picks. */
      checkIn: (today) => {
        const s = get();
        if (s.lastDay === today) return;
        const streak = advanceStreak(s.lastDay, today, s.streak);
        const earned = streakRewards(streak).map((type) => pick(type, `${today}:day-${streak}`));
        // First visit ever: a 10-card starter squad so the lineup and Gauntlet are playable from day one.
        const welcome = s.lastDay === null && Object.keys(s.owned).length === 0 ? starterSquad(today) : [];
        const owned = { ...s.owned };
        for (const id of welcome) owned[id] = { count: 1, firstDay: today };
        set({
          streak, lastDay: today, pending: [...s.pending, ...earned], owned,
          lineup: welcome.length ? autoFill(welcome) : s.lineup,
        });
      },

      awardRun: (runKey, result) => {
        const s = get();
        if (s.awardedRuns.includes(runKey)) return;
        set({ awardedRuns: [...s.awardedRuns.slice(-200), runKey], pending: [...s.pending, pick(runPickType(result), runKey)] });
      },

      setSlot: (slot, cardId) =>
        set((s) => {
          const lineup = { ...s.lineup };
          if (!cardId) delete lineup[slot];
          else if (s.owned[cardId] && canPlace(lineup, cardId, slot)) lineup[slot] = cardId;
          else return {};
          return { lineup };
        }),
      autoFillLineup: () => set((s) => ({ lineup: autoFill(Object.keys(s.owned)) })),
      recordStage: (stage, won) =>
        set((s) => {
          if (!won || stage !== s.gauntlet.cleared) return {};
          const reward = stageReward(stage);
          const pay = reward && !s.gauntlet.rewarded.includes(stage);
          return {
            gauntlet: { cleared: stage + 1, rewarded: pay ? [...s.gauntlet.rewarded, stage] : s.gauntlet.rewarded },
            pending: pay ? [...s.pending, pick(reward, `gauntlet-${stage}-${s.lastDay ?? ''}`)] : s.pending,
          };
        }),

      keep: (pickId, cardId) =>
        set((s) => {
          const p = s.pending.find((x) => x.id === pickId);
          if (!p || !p.cards.includes(cardId)) return {};
          const prev = s.owned[cardId];
          const owned = { ...s.owned, [cardId]: { count: (prev?.count ?? 0) + 1, firstDay: prev?.firstDay ?? s.lastDay ?? '' } };
          // Completing a team-season set pays its own pick.
          const sets = newlyCompleted(new Set(Object.keys(s.owned)), new Set(Object.keys(owned)));
          const setPicks = sets.map((set) => pick(setReward(set), `set:${set.id}`));
          return { pending: [...s.pending.filter((x) => x.id !== pickId), ...setPicks], owned };
        }),
    }),
    { name: 'tendeep-collection', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Card id → level (from duplicates), for lineup rosters. */
export const levelsOf = (owned: CollectionStore['owned']): Record<string, number> =>
  Object.fromEntries(Object.entries(owned).map(([id, o]) => [id, cardLevel(o.count)]));
