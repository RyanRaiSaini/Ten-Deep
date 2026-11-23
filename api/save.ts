/**
 * Cloud save: a private backup of a player's progress under their PIN, protected by their device key.
 *   POST /api/save { op: 'save', pin, key, data }  → { ok, at }
 *   POST /api/save { op: 'load', pin, key }        → { data, at } (key must match the one that saved it)
 * The recovery code shown in Settings is PIN + key, so it restores progress on any device.
 */
import { get, put } from '@vercel/blob';

const PIN = /^[A-HJKMNP-Z2-9]{6}$/;
const MAX = 1_500_000;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' } });

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

type Saved = { keyHash: string; at: string; data: string };
async function read(pin: string): Promise<Saved | null> {
  const r = await get(`saves/${pin}.json`, { access: 'private', useCache: false }).catch(() => null);
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text()) as Saved;
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' } });
}

export async function POST(req: Request) {
  let b: { op?: unknown; pin?: unknown; key?: unknown; data?: unknown };
  try { b = await req.json(); } catch { return json({ error: 'bad-json' }, 400); }
  const pin = String(b.pin ?? '');
  const key = String(b.key ?? '');
  if (!PIN.test(pin) || key.length < 16 || key.length > 128) return json({ error: 'bad-identity' }, 400);
  const keyHash = await sha256(key);
  const existing = await read(pin);
  if (existing && existing.keyHash !== keyHash) return json({ error: 'wrong-code' }, 403);

  if (b.op === 'load') {
    return existing ? json({ data: existing.data, at: existing.at }) : json({ error: 'not-found' }, 404);
  }
  if (b.op === 'save') {
    if (typeof b.data !== 'string' || b.data.length > MAX) return json({ error: 'bad-data' }, 400);
    const at = new Date().toISOString();
    await put(`saves/${pin}.json`, JSON.stringify({ keyHash, at, data: b.data } satisfies Saved), {
      access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json',
    });
    return json({ ok: true, at });
  }
  return json({ error: 'bad-op' }, 400);
}
