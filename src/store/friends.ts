import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CARD_BY_ID } from '../data/cards';
import { cardLevel } from '../engine/collect/lineup';
import { newPin, type FriendSnapshot } from '../engine/friends/code';
import type { FriendMode, Outcome } from '../engine/friends/match';
import { ALL_SLOTS } from '../engine/types';
import { dailyKey } from '../engine/daily';
import { useCollection } from './collection';
import { useLeague } from './league';
import { useProfile } from './profile';
import { track } from './progress';

export interface FriendGame { mode: FriendMode; outcome: Outcome; score: string; at: string }

export interface Friend {
  pin: string;
  snap: FriendSnapshot;
  added: string;
  updated: string;
  record: { w: number; l: number; d: number };
  /** Newest first, capped. */
  log: FriendGame[];
}

export interface FriendsStore {
  /** Your PIN: made once per install. */
  pin: string;
  /** Your last finished drafted team (what friends play in a Finals showdown). */
  lastTeam: FriendSnapshot['team'];
  friends: Friend[];
  /** Your finished race drafts by seed, so a friend's reply link settles without replaying. */
  races: Record<string, { w: number; l: number; depth: number }>;
  /** "seed:pin" races already counted. */
  settled: string[];
  saveRace: (seed: string, r: { w: number; l: number; depth: number }) => void;
  /** Count a race once; false if it was already counted. */
  settle: (seed: string, pin: string, outcome: Outcome, score: string) => boolean;
  /** Add or refresh a friend from their code. */
  add: (snap: FriendSnapshot) => 'added' | 'updated' | 'self';
  remove: (pin: string) => void;
  /** Record a finished game against a friend (updates the W/L/D tally). */
  result: (pin: string, mode: FriendMode, outcome: Outcome, score: string) => void;
  setLastTeam: (team: FriendSnapshot['team']) => void;
}

export const MAX_FRIENDS = 100;

export const useFriends = create<FriendsStore>()(
  persist(
    (set, get) => ({
      pin: newPin(),
      lastTeam: null,
      friends: [],
      races: {},
      settled: [],
      saveRace: (seed, r) => set((s) => ({ races: Object.fromEntries([...Object.entries(s.races), [seed, r]].slice(-50)) })),
      settle: (seed, pin, outcome, score) => {
        const key = `${seed}:${pin}`;
        if (get().settled.includes(key) || !get().friends.some((f) => f.pin === pin)) return false;
        set((s) => ({ settled: [...s.settled, key].slice(-200) }));
        get().result(pin, 'race', outcome, score);
        return true;
      },
      add: (snap) => {
        if (snap.pin === get().pin) return 'self';
        const today = dailyKey();
        const existing = get().friends.find((f) => f.pin === snap.pin);
        if (existing) {
          set((s) => ({ friends: s.friends.map((f) => (f.pin === snap.pin ? { ...f, snap, updated: today } : f)) }));
          return 'updated';
        }
        set((s) => ({
          friends: [{ pin: snap.pin, snap, added: today, updated: today, record: { w: 0, l: 0, d: 0 }, log: [] }, ...s.friends].slice(0, MAX_FRIENDS),
        }));
        track({ type: 'friend', added: true });
        return 'added';
      },
      remove: (pin) => set((s) => ({ friends: s.friends.filter((f) => f.pin !== pin) })),
      result: (pin, mode, outcome, score) => {
        if (!get().friends.some((f) => f.pin === pin)) return;
        set((s) => ({
          friends: s.friends.map((f) => (f.pin !== pin ? f : {
            ...f,
            record: { ...f.record, [outcome]: f.record[outcome] + 1 },
            log: [{ mode, outcome, score, at: dailyKey() }, ...f.log].slice(0, 20),
          })),
        }));
        track({ type: 'friendGame', outcome, sweep: outcome === 'w' && /^\d+-0$/.test(score) });
      },
      setLastTeam: (lastTeam) => set({ lastTeam }),
    }),
    { name: 'tendeep-friends', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Your own snapshot, read live, for your friend code. */
export function mySnapshot(): FriendSnapshot {
  const profile = useProfile.getState();
  const col = useCollection.getState();
  const { pin, lastTeam } = useFriends.getState();
  const lineup: FriendSnapshot['lineup'] = {};
  for (const k of ALL_SLOTS) {
    const id = col.lineup[k];
    if (id && CARD_BY_ID[id]) lineup[k] = { id, lv: cardLevel(col.owned[id]?.count ?? 1) };
  }
  const showcase = Object.keys(col.owned).filter((id) => CARD_BY_ID[id]).sort((a, b) => CARD_BY_ID[b].ovr - CARD_BY_ID[a].ovr);
  return {
    pin,
    name: profile.name || 'Coach',
    avatar: profile.avatarId,
    stats: { drafts: profile.draftsPlayed, titles: profile.titles, streak: col.streak, cards: showcase.length, tier: useLeague.getState().tier },
    lineup,
    showcase,
    team: lastTeam,
  };
}
