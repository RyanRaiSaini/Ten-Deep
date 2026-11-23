/** The online PIN directory (api/pin.ts): publish your friend code under your PIN, look up a friend's by theirs. */
import { Platform } from 'react-native';
import { CONFIG } from '../config';
import { decodeFriend, encodeFriend, newPin, type FriendSnapshot } from '../engine/friends/code';
import { mySnapshot, useFriends } from '../store/friends';

// Same origin on the web (so local builds never touch the live directory); the live site from the apps.
const URL_ = Platform.OS === 'web' ? '/api/pin' : `${CONFIG.webUrl}/api/pin`;
const okJson = async (r: Response) => r.ok && (r.headers.get('content-type') ?? '').includes('json') && (await r.json().catch(() => null))?.ok === true;
const DAY = 24 * 3600 * 1000;

export type Lookup = { ok: true; snap: FriendSnapshot } | { ok: false; reason: 'not-found' | 'offline' };

export async function lookupPin(pin: string): Promise<Lookup> {
  try {
    const r = await fetch(`${URL_}?pin=${encodeURIComponent(pin)}`);
    if (r.status === 404 || r.status === 400) return { ok: false, reason: 'not-found' };
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return { ok: false, reason: 'offline' };
    const snap = decodeFriend(String((await r.json()).code ?? ''));
    return snap ? { ok: true, snap } : { ok: false, reason: 'not-found' };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}

let inFlight: Promise<void> | null = null;

/** Publish your current code if it changed (or a day passed). Quiet on failure: it retries next time. */
export function publishMe(force = false): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const s = useFriends.getState();
      const code = encodeFriend(mySnapshot());
      if (!force && s.published?.code === code && Date.now() - s.published.at < DAY) return;
      const r = await fetch(URL_, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin: s.pin, code, key: s.key }) });
      if (r.status === 409) {
        // Someone else already holds this PIN: take a fresh one and try once more.
        useFriends.setState({ pin: newPin(), published: null });
        const again = useFriends.getState();
        const code2 = encodeFriend(mySnapshot());
        const r2 = await fetch(URL_, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin: again.pin, code: code2, key: again.key }) });
        if (await okJson(r2)) useFriends.setState({ published: { code: code2, at: Date.now() } });
        return;
      }
      if (await okJson(r)) useFriends.setState({ published: { code, at: Date.now() } });
    } catch {
      // Offline: friend links still work; we'll publish next time.
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Pull a friend's latest code by PIN and update their card (their team and collection stay current). */
export async function refreshFriend(pin: string): Promise<boolean> {
  const r = await lookupPin(pin);
  if (!r.ok || r.snap.pin !== pin) return false;
  useFriends.getState().add(r.snap);
  return true;
}
