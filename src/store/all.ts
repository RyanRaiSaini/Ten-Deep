import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCareer } from './career';
import { useCollection } from './collection';
import { useDaily } from './daily';
import { useDuel } from './duel';
import { useGame } from './game';
import { useProfile } from './profile';
import { useProgress } from './progress';
import { useSettings } from './settings';

/** Every persisted store. The root layout waits on all of them; delete-account resets all of them. */
export const STORES = [useGame, useProfile, useSettings, useDaily, useDuel, useCareer, useCollection, useProgress] as const;

/** Delete account: reset every store in memory (so nothing is re-saved) and clear storage. */
export async function wipeAll() {
  for (const s of STORES) (s.setState as (v: unknown, replace: true) => void)(s.getInitialState(), true);
  await AsyncStorage.clear();
}
