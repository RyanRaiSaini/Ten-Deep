import AsyncStorage from '@react-native-async-storage/async-storage';
import { dailyKey } from '../engine/daily';
import { useCareer } from './career';
import { useCollection } from './collection';
import { useDaily } from './daily';
import { useDuel } from './duel';
import { useFriends } from './friends';
import { useShop } from './shop';
import { useGame } from './game';
import { useLeague } from './league';
import { useProfile } from './profile';
import { useProgress } from './progress';
import { useSettings } from './settings';

/** Every persisted store. The root layout waits on all of them; delete-account resets all of them. */
export const STORES = [useGame, useProfile, useSettings, useDaily, useDuel, useCareer, useCollection, useProgress, useLeague, useFriends, useShop] as const;

/** Delete account: reset every store in memory (so nothing is re-saved) and clear storage. */
export async function wipeAll() {
  for (const s of STORES) (s.setState as (v: unknown, replace: true) => void)(s.getInitialState(), true);
  await AsyncStorage.clear();
  startDay();
}

/** A new day (or a fresh account): daily check-in picks, streak, and mission rollover. Safe to call often. */
export function startDay() {
  useCollection.getState().checkIn(dailyKey());
  useProgress.getState().rollover(dailyKey());
  useLeague.getState().rollover(dailyKey());
  // Persist the PIN and its key on first run (an untouched initial state is never written), then go online.
  useFriends.setState((s) => ({ pin: s.pin, key: s.key }));
  void import('../net/pins').then((m) => m.publishMe());
}
