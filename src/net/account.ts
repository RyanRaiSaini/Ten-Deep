/**
 * Accounts (api/account.ts). Signing in links this device's PIN + key to an Apple/Google account; signing in on
 * another device finds that PIN + key and restores its cloud save there.
 */
import { CONFIG } from '../config';
import { useAccount, type Provider } from '../store/account';
import { useFriends } from '../store/friends';
import { backup, restore } from './save';

const URL_ = typeof document !== 'undefined' ? '/api/account' : `${CONFIG.webUrl}/api/account`;

async function post(body: Record<string, unknown>): Promise<{ ok: boolean; j: Record<string, unknown> } | null> {
  try {
    const r = await fetch(URL_, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = (r.headers.get('content-type') ?? '').includes('json') ? await r.json() : {};
    return { ok: r.ok, j };
  } catch {
    return null;
  }
}

export type ConnectResult =
  | { kind: 'linked' }                                      // this device's progress is now on the account
  | { kind: 'found'; pin: string; key: string }             // the account has other progress: ask before loading it
  | { kind: 'offline' }
  | { kind: 'failed' };

/** Step 1 after the provider hands us a token: link this device, or find the account's existing progress. */
export async function connect(provider: Provider, idToken: string): Promise<ConnectResult> {
  const { pin, key } = useFriends.getState();
  const found = await post({ op: 'signin', provider, idToken });
  if (!found) return { kind: 'offline' };
  if (!found.ok) return { kind: 'failed' };
  if (found.j.linked && found.j.pin !== pin) return { kind: 'found', pin: String(found.j.pin), key: String(found.j.key) };
  if (!found.j.linked) {
    const linked = await post({ op: 'link', provider, idToken, pin, key });
    if (!linked) return { kind: 'offline' };
    if (!linked.ok) return { kind: 'failed' };
  }
  useAccount.getState().set(provider);
  void backup(true); // make sure the account has something to restore
  return { kind: 'linked' };
}

/** Step 2 (if the player agrees): load the account's progress onto this device. */
export async function loadFromAccount(provider: Provider, pin: string, key: string) {
  const r = await restore(`${pin}-${key}`);
  if (r === 'ok' || r === 'not-found') useAccount.getState().set(provider);
  return r;
}

/** Delete account: erase this player's server data (cloud save, friend-code entry, account link). Best effort. */
export async function eraseServerData(): Promise<boolean> {
  const { pin, key } = useFriends.getState();
  const r = await post({ op: 'erase', pin, key });
  return !!r?.ok;
}
