import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { nextType, tapUpgrades } from '../engine/collect/powerup';
import { finishFor, type Finish } from '../engine/collect/finishes';
import { ALL_CARDS } from '../data/cards';
import { generatePick, runRewards, type PickType, type RunOutcome } from '../engine/collect/picks';
import { autoFill, canPlace, cardLevel, stageReward, starterSquad, type Lineup } from '../engine/collect/lineup';
import { newlyCompleted, setReward } from '../engine/collect/sets';
import { MAX_FREEZES, advanceWithFreezes, freezeEarned, streakRewards } from '../engine/collect/streak';
import type { SlotId } from '../engine/types';
import { track } from './progress';

export interface PendingPick {
  id: string;
  type: PickType;
  /** Card ids on offer (5), fixed when the pick is earned so reopening shows the same cards. */
  cards: string[];
  /** What earned it, e.g. "day-7" or a run seed. */
  source: string;
  /** Power-up taps used on it. */
  taps?: number;
}

export interface CollectionStore {
  /** Card id → copies, first day, and how many of each finish you've pulled. */
  owned: Record<string, { count: number; firstDay: string; finishes?: Partial<Record<Finish, number>> }>;
  pending: PendingPick[];
  streak: number;
  lastDay: string | null;
  /** Run keys already rewarded (one pick per run). */
  awardedRuns: string[];
  /** Your card lineup (slot → card id). */
  lineup: Lineup;
  /** Gauntlet progress: stages cleared (0–10) and which reward stages have paid out. */
  gauntlet: { cleared: number; rewarded: number[] };
  /** Streak freezes held (earned every 7 days, max 2); a missed day spends one. */
  freezes: number;
  /** Freezes spent at the last check-in (to tell the player). */
  freezesUsed: number;
  /** The day today's power-up was used (one a day, on any pick); null if never. */
  powerDay: string | null;
  checkIn: (today: string) => void;
  /** A finished run's picks (a season pick, plus a playoff pick for a deep run). Once per run. */
  awardRun: (runKey: string, result: RunOutcome) => void;
  keep: (pickId: string, cardId: string) => void;
  setSlot: (slot: SlotId, cardId: string | null) => void;
  autoFillLineup: () => void;
  recordStage: (stage: number, won: boolean) => void;
  /** Today's power-up on an unopened pick: 'up' if it upgraded, 'miss' if not, null if already used today. */
  powerUp: (pickId: string, today: string) => 'up' | 'miss' | null;
  /** Add a pick from elsewhere (missions, achievements). Idempotent per source. */
  grant: (type: PickType, source: string) => void;
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
      freezes: 0,
      freezesUsed: 0,
      powerDay: null,

      /** Opening the app on a new day: advance the streak and grant that day's picks. */
      checkIn: (today) => {
        const s = get();
        if (s.lastDay === today) return;
        const adv = advanceWithFreezes(s.lastDay, today, s.streak, s.freezes ?? 0);
        const streak = adv.streak;
        const freezes = Math.min(MAX_FREEZES, adv.freezes + (freezeEarned(streak) ? 1 : 0));
        const earned = streakRewards(streak).map((type) => pick(type, `${today}:day-${streak}`));
        // First visit ever: a 10-card starter squad so the lineup and Gauntlet are playable from day one.
        const welcome = s.lastDay === null && Object.keys(s.owned).length === 0 ? starterSquad(today) : [];
        const owned = { ...s.owned };
        for (const id of welcome) owned[id] = { count: 1, firstDay: today };
        set({
          streak, freezes, freezesUsed: adv.used, lastDay: today, pending: [...s.pending, ...earned], owned,
          lineup: welcome.length ? autoFill(welcome) : s.lineup,
        });
      },

      awardRun: (runKey, result) => {
        const s = get();
        if (s.awardedRuns.includes(runKey)) return;
        const picks = runRewards(result).map((type, i) => pick(type, i === 0 ? runKey : `${runKey}:playoffs`));
        set({ awardedRuns: [...s.awardedRuns.slice(-200), runKey], pending: [...s.pending, ...picks] });
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

      powerUp: (pickId, today) => {
        const s = get();
        const p = s.pending.find((x) => x.id === pickId);
        if (!p || s.powerDay === today) return null;
        const taps = p.taps ?? 0;
        const next = nextType(p.type);
        if (!next) return null;
        const hit = tapUpgrades(p.id, today);
        const upgraded: PendingPick = hit
          ? { ...p, type: next, taps: taps + 1, cards: generatePick(ALL_CARDS, next, `${p.source}:up${taps}`).map((c) => c.id) }
          : { ...p, taps: taps + 1 };
        set((st) => ({ powerDay: today, pending: st.pending.map((x) => (x.id === pickId ? upgraded : x)) }));
        if (hit) track({ type: 'pickUpgrade' });
        return hit ? 'up' : 'miss';
      },

      grant: (type, source) =>
        set((s) => {
          const p = pick(type, source);
          return s.pending.some((x) => x.id === p.id) ? {} : { pending: [...s.pending, p] };
        }),

      keep: (pickId, cardId) =>
        set((s) => {
          const p = s.pending.find((x) => x.id === pickId);
          if (!p || !p.cards.includes(cardId)) return {};
          const prev = s.owned[cardId];
          const finish = finishFor(pickId, cardId);
          const finishes = { ...prev?.finishes, [finish]: (prev?.finishes?.[finish] ?? 0) + 1 };
          const owned = { ...s.owned, [cardId]: { count: (prev?.count ?? 0) + 1, firstDay: prev?.firstDay ?? s.lastDay ?? '', finishes } };
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
