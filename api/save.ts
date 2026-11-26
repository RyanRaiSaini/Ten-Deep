/**
 * Cloud save: a private backup of a player's progress under their PIN, protected by their device key.
 *   POST /api/save { op: 'save', pin, key, data }  → { ok, at }
 *   POST /api/save { op: 'load', pin, key }        → { data, at } (key must match the one that saved it)
 *   POST /api/save { op: 'stat', pin, key }        → { at } (when the cloud copy was saved: devices check this before
 *                                                    pulling, so syncing doesn't download the whole save every time)
 * The recovery code shown in Settings is PIN + key, so it restores progress on any device.
 *   GET  /api/save?selftest=1 → runs save → load → wrong-code checks → delete against the real store,
 *                               under a reserved test PIN, and reports each step.
 */
import { del, get, put } from '@vercel/blob';

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

  if (b.op === 'stat') {
    return existing ? json({ at: existing.at }) : json({ error: 'not-found' }, 404);
  }
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

/** Reserved for the self-test (a real player landing on it is a 1-in-887-million draw, and it's cleaned up after). */
const TEST_PIN = 'ZZZZZZ';

async function selfTest(base: string) {
  const steps: { step: string; ok: boolean; detail?: unknown }[] = [];
  const hex = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => b.toString(16).padStart(2, '0')).join('');
  const key = hex();
  const other = hex();
  const data = JSON.stringify({ probe: hex(), stores: { 'tendeep-collection': { owned: { x: { count: 2 } } } } });
  const post = async (body: Record<string, unknown>) => {
    const r = await POST(new Request(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
    return { status: r.status, body: (await r.json()) as Record<string, unknown> };
  };
  const path = `saves/${TEST_PIN}.json`;
  await del(path).catch(() => {});
  const saved = await post({ op: 'save', pin: TEST_PIN, key, data });
  steps.push({ step: 'save', ok: saved.status === 200 && saved.body.ok === true, detail: saved.status });
  const loaded = await post({ op: 'load', pin: TEST_PIN, key });
  steps.push({ step: 'load with the right code', ok: loaded.status === 200 && loaded.body.data === data, detail: loaded.status });
  const wrongLoad = await post({ op: 'load', pin: TEST_PIN, key: other });
  steps.push({ step: 'load with a wrong code is refused', ok: wrongLoad.status === 403, detail: wrongLoad.body });
  const wrongSave = await post({ op: 'save', pin: TEST_PIN, key: other, data: '{}' });
  steps.push({ step: 'overwrite with a wrong code is refused', ok: wrongSave.status === 403, detail: wrongSave.body });
  const again = await post({ op: 'load', pin: TEST_PIN, key });
  steps.push({ step: 'save untouched after the refused overwrite', ok: again.body.data === data });
  const big = await post({ op: 'save', pin: TEST_PIN, key, data: 'x'.repeat(MAX + 1) });
  steps.push({ step: 'oversized save is refused', ok: big.status === 400, detail: big.body });
  await del(path).catch((e: unknown) => steps.push({ step: 'cleanup', ok: false, detail: String(e) }));
  const gone = await post({ op: 'load', pin: TEST_PIN, key });
  steps.push({ step: 'cleaned up', ok: gone.status === 404 });
  return { ok: steps.every((s) => s.ok), steps };
}

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get('selftest') !== '1') return json({ error: 'post-only' }, 405);
  return json(await selfTest(req.url));
}
