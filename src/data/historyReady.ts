/**
 * Whether the full history (data/fullHistory.ts) has loaded, as a store screens can wait on. Current Day never
 * needs it; the eras, All-Time, the franchises, Management Crisis (its cards offer All-Time players) and Career do.
 */
import { create } from 'zustand';
import { fullHistoryLoaded, loadFullHistory } from './fullHistory';

export const useHistory = create<{ ready: boolean }>(() => ({ ready: fullHistoryLoaded() }));

/** Load it (once) and flip `ready`. */
export function ensureHistory(): Promise<void> {
  if (useHistory.getState().ready) return Promise.resolve();
  return loadFullHistory().then(() => useHistory.setState({ ready: true }));
}

/** Does a run in this state touch the history? */
export function runNeedsHistory(s: { poolId: string; crisis: unknown; career: boolean; phase: string }): boolean {
  if (s.phase === 'idle') return false;
  return s.poolId !== 'current-2026' || !!s.crisis || s.career;
}

/** Does this mode's pool live in the history? */
export const modeNeedsHistory = (poolId: string | undefined) => !!poolId && poolId !== 'current-2026';
