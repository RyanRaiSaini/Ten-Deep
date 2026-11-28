/**
 * Small JSON documents in private Vercel Blob storage (the PIN directory, friend challenges and mailboxes), with
 * an in-memory stand-in for local end-to-end tests (scripts/duel-e2e.mts). BLOB_READ_WRITE_TOKEN is set on the
 * project by the store connection. Files starting with "_" in api/ are not deployed as functions.
 */
import { get, put } from '@vercel/blob';

export interface JsonStore {
  read<T>(path: string): Promise<T | null>;
  write(path: string, data: unknown): Promise<void>;
}

export function blobStore(): JsonStore {
  return {
    async read<T>(path: string) {
      const r = await get(path, { access: 'private', useCache: false }).catch(() => null);
      if (!r || r.statusCode !== 200) return null;
      return JSON.parse(await new Response(r.stream).text()) as T;
    },
    async write(path, data) {
      await put(path, JSON.stringify(data), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' });
    },
  };
}

export function memoryJsonStore(): JsonStore {
  const m = new Map<string, string>();
  return {
    async read<T>(path: string) { const v = m.get(path); return v === undefined ? null : (JSON.parse(v) as T); },
    async write(path, data) { m.set(path, JSON.stringify(data)); },
  };
}

let store: JsonStore | null = null;
/** Tests swap in a memory store. */
export const useJsonStore = (s: JsonStore) => { store = s; };
export const jsonStore = (): JsonStore => (store ??= blobStore());

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** A PIN's directory entry (api/pin.ts): the latest friend code and the hash of the device secret that owns it. */
export interface PinRecord { code: string; keyHash: string; updated: string }
export const pinPath = (pin: string) => `pins/${pin}.json`;
export const readPin = (pin: string) => jsonStore().read<PinRecord>(pinPath(pin));

/** True when `key` is the secret that published `pin`: proves the caller is that player. */
export async function ownsPin(pin: string, key: unknown): Promise<boolean> {
  if (typeof key !== 'string' || key.length < 16 || key.length > 128) return false;
  const rec = await readPin(pin);
  return !!rec && rec.keyHash === (await sha256(key));
}
