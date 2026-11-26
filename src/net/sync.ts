/**
 * Sync for signed-in players: your progress follows you between devices.
 *   - Push: a few seconds after anything changes (a pack opened, a run finished), and straight away when you leave
 *     the app, this device's progress is saved to your account.
 *   - Pull: when the app opens or comes back to the front, if your account has newer progress (saved on another
 *     device) and this device has nothing unsaved, it's loaded here.
 * Not signed in: nothing changes (the usual backup at most every 30 minutes).
 */
import { useAccount } from '../store/account';
import { backup, lastBackup, recoveryCode, remoteSavedAt, restore } from './save';

/** Wait this long after the last change before saving, so a burst of changes is one save. */
export const PUSH_DELAY_MS = 4000;

let started = false;
let dirty = false;
let restoring = false;
let timer: ReturnType<typeof setTimeout> | null = null;

const signedIn = () => !!useAccount.getState().provider;

/** Save now if anything changed since the last save. */
export async function flush(): Promise<void> {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!dirty || !signedIn()) return;
  dirty = false;
  if (!(await backup(true))) dirty = true; // offline: try again on the next change or the next time the app hides
}

/** Something changed: save it shortly. */
export function markChanged(): void {
  if (restoring || !signedIn()) return;
  dirty = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), PUSH_DELAY_MS);
}

/** Load the account's progress if another device saved something newer. Returns true if it did. */
export async function pullIfNewer(): Promise<boolean> {
  if (!signedIn() || dirty || restoring) return false;
  const remote = await remoteSavedAt();
  if (!remote) return false;
  if (remote <= (await lastBackup()) + 1000) return false;
  restoring = true;
  try {
    return (await restore(recoveryCode())) === 'ok';
  } finally {
    // Rehydrating the stores fires their change listeners; let those settle before watching again.
    setTimeout(() => { restoring = false; }, 500);
  }
}

/** Start watching the stores and the app's foreground state. Safe to call more than once. */
export function startSync(stores: readonly { subscribe: (fn: () => void) => () => void }[]): void {
  if (started) return;
  started = true;
  for (const s of stores) s.subscribe(markChanged);
  // Phones: save when the app goes to the background, check for newer progress when it comes back.
  void import('react-native').then(({ AppState }) => AppState.addEventListener('change', (state) => {
    if (state === 'active') void pullIfNewer();
    else void flush();
  })).catch(() => {});
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flush();
      else void pullIfNewer();
    });
    window.addEventListener('focus', () => void pullIfNewer());
  }
  void pullIfNewer();
}

/** Tests only. */
export function resetSyncForTests() {
  started = false; dirty = false; restoring = false;
  if (timer) clearTimeout(timer);
  timer = null;
}
