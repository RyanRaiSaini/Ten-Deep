/** Cloud save client: back up every persisted store, and restore them on another device with a recovery code. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import { useFriends } from '../store/friends';

const URL_ = typeof document !== 'undefined' ? '/api/save' : `${CONFIG.webUrl}/api/save`;
/** Every store's persisted key (see src/store/*.ts). */
export const SAVE_KEYS = [
  'tendeep-run', 'tendeep-profile', 'tendeep-settings', 'tendeep-daily', 'tendeep-duel', 'tendeep-career', 'tendeep-collection',
  'tendeep-progress', 'tendeep-league', 'tendeep-friends', 'tendeep-shop', 'tendeep-form', 'tendeep-weekly', 'tendeep-challenges',
];
/** Stores that describe this device, not the player: never backed up or restored (e.g. which sign-in it uses). */
export const DEVICE_ONLY_KEYS = ['tendeep-account'];
const LAST = 'tendeep-backup-at';
const EVERY_MS = 30 * 60_000;

/** "K7Q2XM-<device key>": the PIN plus the secret that owns it. */
export const recoveryCode = () => { const { pin, key } = useFriends.getState(); return `${pin}-${key}`; };
export function parseRecovery(text: string): { pin: string; key: string } | null {
  const m = text.trim().replace(/\s+/g, '').match(/^([A-HJKMNP-Z2-9]{6})-([0-9a-f]{16,128})$/i);
  return m ? { pin: m[1].toUpperCase(), key: m[2].toLowerCase() } : null;
}

async function post(body: Record<string, unknown>) {
  const r = await fetch(URL_, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = (r.headers.get('content-type') ?? '').includes('json') ? await r.json() : { error: 'unavailable' };
  return { ok: r.ok, j };
}

/** Back up now (or, unless forced, only if the last backup is over 30 minutes old). Returns the backup time. */
export async function backup(force = false): Promise<string | null> {
  try {
    const last = Number((await AsyncStorage.getItem(LAST)) ?? 0);
    if (!force && Date.now() - last < EVERY_MS) return null;
    const pairs = await Promise.all(SAVE_KEYS.map(async (k) => [k, await AsyncStorage.getItem(k)] as const));
    const { pin, key } = useFriends.getState();
    const { ok, j } = await post({ op: 'save', pin, key, data: JSON.stringify(Object.fromEntries(pairs.filter(([, v]) => v !== null))) });
    if (!ok) return null;
    // The server's clock, not this device's: sync compares it with the cloud copy's time (net/sync.ts).
    await AsyncStorage.setItem(LAST, String(Date.parse(String(j.at)) || Date.now()));
    return j.at as string;
  } catch {
    return null;
  }
}

export const lastBackup = async (): Promise<number> => Number((await AsyncStorage.getItem(LAST)) ?? 0);

/** When the cloud copy was last saved (ms), null if there isn't one, undefined if the server can't be reached. */
export async function remoteSavedAt(): Promise<number | null | undefined> {
  try {
    const { pin, key } = useFriends.getState();
    const { ok, j } = await post({ op: 'stat', pin, key });
    if (!ok) return j.error === 'not-found' ? null : undefined;
    return Date.parse(String(j.at));
  } catch {
    return undefined;
  }
}

/** Restore from a recovery code: writes the saved stores back and reloads them. */
export async function restore(code: string): Promise<'ok' | 'bad-code' | 'not-found' | 'wrong-code' | 'offline'> {
  const parsed = parseRecovery(code);
  if (!parsed) return 'bad-code';
  try {
    const { ok, j } = await post({ op: 'load', ...parsed });
    if (!ok) return j.error === 'wrong-code' ? 'wrong-code' : j.error === 'not-found' ? 'not-found' : 'offline';
    const saved = JSON.parse(j.data) as Record<string, string>;
    await Promise.all(Object.entries(saved).filter(([k]) => SAVE_KEYS.includes(k)).map(([k, v]) => AsyncStorage.setItem(k, v)));
    const { STORES } = await import('../store/all');
    for (const s of STORES) await (s as unknown as { persist: { rehydrate: () => Promise<void> } }).persist.rehydrate();
    await AsyncStorage.setItem(LAST, String(Date.parse(String(j.at)) || Date.now()));
    return 'ok';
  } catch {
    return 'offline';
  }
}
