import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { SETS } from '../engine/collect/sets';
import { CARD_BY_ID } from '../data/cards';
import { cardLevel } from '../engine/collect/lineup';
import { newlyUnlocked, type Snapshot } from '../engine/progress/achievements';
import { dailyMissions, missionProgress, weekKey, weeklyMissions } from '../engine/progress/missions';
import { EMPTY_STATS, applyEvent, type GameEvent, type Stats } from '../engine/progress/stats';
import { useCollection } from './collection';
import { useProfile } from './profile';

export interface ProgressStore {
  stats: Stats;
  /** Day/week the bases were taken; missions count stats minus base. */
  day: string | null;
  week: string | null;
  dayBase: Stats;
  weekBase: Stats;
  /** Claimed missions as "<period>:<missionId>". */
  claimed: string[];
  /** Achievement id → day unlocked. */
  unlocked: Record<string, string>;
  /** Newly unlocked achievements waiting to be announced. */
  toasts: string[];
  track: (e: GameEvent) => void;
  rollover: (today: string) => void;
  claim: (missionId: string) => boolean;
  check: () => void;
  dismissToast: () => void;
}

/** Collection milestones, read live. */
export function snapshot(stats: Stats): Snapshot {
  const col = useCollection.getState();
  const ids = Object.keys(col.owned);
  const owned = new Set(ids);
  const tiers = new Set(ids.map((id) => CARD_BY_ID[id]?.tier));
  return {
    stats,
    owned: ids.length,
    hasEpic: tiers.has('epic') ? 1 : 0,
    hasMythic: tiers.has('mythic') ? 1 : 0,
    hasUltra: tiers.has('ultra') ? 1 : 0,
    sets: SETS.filter((s) => s.cards.every((c) => owned.has(c))).length,
    maxLevel: Math.max(0, ...Object.values(col.owned).map((o) => cardLevel(o.count))),
    gauntlet: col.gauntlet.cleared,
    streak: col.streak,
  };
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      stats: EMPTY_STATS,
      day: null,
      week: null,
      dayBase: EMPTY_STATS,
      weekBase: EMPTY_STATS,
      claimed: [],
      unlocked: {},
      toasts: [],

      track: (e) => {
        set((s) => ({ stats: applyEvent(s.stats, e) }));
        get().check();
      },

      rollover: (today) => {
        let s = get();
        if (s.day === today) return;
        if (s.day === null) {
          // Players from before missions existed keep credit for the seasons and titles they already have.
          const { draftsPlayed, titles } = useProfile.getState();
          set({ stats: { ...s.stats, runs: Math.max(s.stats.runs, draftsPlayed), titles: Math.max(s.stats.titles, titles) } });
          s = get();
        }
        const week = weekKey(today);
        const newWeek = s.week !== week;
        set({
          day: today,
          dayBase: s.stats,
          week,
          weekBase: newWeek ? s.stats : s.weekBase,
          // Claims are kept (capped), not pruned by week: moving the clock back must not re-open a paid mission.
          claimed: s.claimed.slice(-400),
        });
        get().check();
      },

      claim: (missionId) => {
        const s = get();
        if (!s.day || !s.week) return false;
        const isWeekly = missionId.startsWith('w-');
        const m = (isWeekly ? weeklyMissions(s.day) : dailyMissions(s.day)).find((x) => x.id === missionId);
        const key = `${isWeekly ? s.week : s.day}:${missionId}`;
        if (!m || s.claimed.includes(key)) return false;
        if (missionProgress(m, s.stats, isWeekly ? s.weekBase : s.dayBase) < m.target) return false;
        set({ claimed: [...s.claimed, key] });
        useCollection.getState().grant(m.reward, `mission:${key}`);
        return true;
      },

      check: () => {
        const s = get();
        const fresh = newlyUnlocked(snapshot(s.stats), s.unlocked);
        if (!fresh.length) return;
        const day = s.day ?? '';
        set({
          unlocked: { ...s.unlocked, ...Object.fromEntries(fresh.map((a) => [a.id, day])) },
          toasts: [...s.toasts, ...fresh.map((a) => a.id)].slice(-5),
        });
        for (const a of fresh) if (a.reward) useCollection.getState().grant(a.reward, `ach:${a.id}`);
      },

      dismissToast: () => set((s) => ({ toasts: s.toasts.slice(1) })),
    }),
    {
      name: 'tendeep-progress',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ toasts: _t, ...rest }) => rest,
    },
  ),
);

/** Report something that happened in the game. */
export const track = (e: GameEvent) => useProgress.getState().track(e);

/** Missions finished but not yet claimed (for the home badge). */
export function claimableCount(s: Pick<ProgressStore, 'day' | 'week' | 'stats' | 'dayBase' | 'weekBase' | 'claimed'>): number {
  if (!s.day || !s.week) return 0;
  const open = (ms: ReturnType<typeof dailyMissions>, period: string, base: Stats) =>
    ms.filter((m) => !s.claimed.includes(`${period}:${m.id}`) && missionProgress(m, s.stats, base) >= m.target).length;
  return open(dailyMissions(s.day), s.day, s.dayBase) + open(weeklyMissions(s.day), s.week, s.weekBase);
}
