import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ADS_PER_DAY, MAX_REROLLS } from '../engine/shop';

export interface ShopStore {
  /** Rerolls you hold: each spins the wheel again once your free respins are gone. */
  rerolls: number;
  /** Day the free daily reroll was last claimed. */
  freeDay: string | null;
  /** Ad breaks watched today. */
  ads: { day: string | null; n: number };
  claimFree: (today: string) => boolean;
  adWatched: (today: string) => boolean;
  /** Spend one reroll; false if you have none. */
  spend: () => boolean;
  add: (n: number) => void;
}

export const adsLeft = (s: Pick<ShopStore, 'ads'>, today: string) => (s.ads.day === today ? Math.max(0, ADS_PER_DAY - s.ads.n) : ADS_PER_DAY);

export const useShop = create<ShopStore>()(
  persist(
    (set, get) => ({
      // A starter gift so the feature is discoverable from the first draft.
      rerolls: 3,
      freeDay: null,
      ads: { day: null, n: 0 },
      claimFree: (today) => {
        if (get().freeDay === today) return false;
        set((s) => ({ freeDay: today, rerolls: Math.min(MAX_REROLLS, s.rerolls + 1) }));
        return true;
      },
      adWatched: (today) => {
        const s = get();
        if (adsLeft(s, today) <= 0) return false;
        set({ ads: { day: today, n: (s.ads.day === today ? s.ads.n : 0) + 1 }, rerolls: Math.min(MAX_REROLLS, s.rerolls + 1) });
        return true;
      },
      spend: () => {
        if (get().rerolls <= 0) return false;
        set((s) => ({ rerolls: s.rerolls - 1 }));
        return true;
      },
      add: (n) => set((s) => ({ rerolls: Math.min(MAX_REROLLS, s.rerolls + Math.max(0, n)) })),
    }),
    { name: 'tendeep-shop', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
