/**
 * PIN directory for friends: maps a 6-character PIN to that player's latest friend code.
 *   GET  /api/pin?pin=K7Q2XM          → { code, updated } or 404
 *   POST /api/pin { pin, code, key }  → publishes your code; `key` (a secret kept on your device) proves
 *                                       you own the PIN, so nobody else can overwrite it.
 * Stored privately in Vercel Blob (BLOB_READ_WRITE_TOKEN is set on the project by the store connection).
 */
import { get, put } from '@vercel/blob';

const PIN = /^[A-HJKMNP-Z2-9]{6}$/;
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS } });
const path = (pin: string) => `pins/${pin}.json`;

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function read(pin: string): Promise<{ code: string; keyHash: string; updated: string } | null> {
  const r = await get(path(pin), { access: 'private', useCache: false }).catch(() => null);
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(req: Request) {
  const pin = (new URL(req.url).searchParams.get('pin') ?? '').toUpperCase();
  if (!PIN.test(pin)) return json({ error: 'bad-pin' }, 400);
  const rec = await read(pin);
  return rec ? json({ code: rec.code, updated: rec.updated }) : json({ error: 'not-found' }, 404);
}

export async function POST(req: Request) {
  let body: { pin?: unknown; code?: unknown; key?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'bad-json' }, 400); }
  const { pin, code, key } = body;
  if (typeof pin !== 'string' || !PIN.test(pin)) return json({ error: 'bad-pin' }, 400);
  if (typeof code !== 'string' || !code.startsWith('TD1') || code.length > 6000 || !/^TD1[A-Za-z0-9_-]+$/.test(code)) return json({ error: 'bad-code' }, 400);
  if (typeof key !== 'string' || key.length < 16 || key.length > 128) return json({ error: 'bad-key' }, 400);
  const keyHash = await sha256(key);
  const existing = await read(pin);
  if (existing && existing.keyHash !== keyHash) return json({ error: 'taken' }, 409);
  const updated = new Date().toISOString();
  await put(path(pin), JSON.stringify({ code, keyHash, updated }), {
    access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json',
  });
  return json({ ok: true, updated });
}
