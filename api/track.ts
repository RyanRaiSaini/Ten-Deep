/**
 * Campaign-link events from the game (public, no auth). Only visitors who opened a campaign link send these.
 *   POST /api/track { c: linkCode, v: visitorId, k: eventKind } → 204
 * Stored as one empty file per (code, event, visitor), so numbers are unique visitors and retries are harmless.
 * The visitor id is random and made on the device; no IP, email or name is stored. Unknown codes are ignored.
 */
import { blobStore, type OutreachStore } from './_outreachstore';
import { allCodes } from '../src/outreach/metrics';
import { EVENT_KINDS, LINK_CODE } from '../src/outreach/types';

const VISITOR = /^[a-z0-9]{16,40}$/;
const headers = { 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' };

export function makeTrack(store: OutreachStore, cacheMs = 60_000) {
  let codes: { at: number; set: Set<string> } | null = null;
  const known = async (code: string) => {
    if (!codes || Date.now() - codes.at > cacheMs || !codes.set.has(code)) {
      const db = await store.readDb();
      codes = { at: Date.now(), set: new Set(db ? allCodes(db) : []) };
    }
    return codes.set.has(code);
  };
  return async function POST(req: Request): Promise<Response> {
    let b: Record<string, unknown>;
    try { b = (await req.json()) as Record<string, unknown>; } catch { return new Response(null, { status: 400, headers }); }
    const c = String(b.c ?? '');
    const v = String(b.v ?? '');
    const k = String(b.k ?? '');
    if (!LINK_CODE.test(c) || !VISITOR.test(v) || !(EVENT_KINDS as readonly string[]).includes(k)) return new Response(null, { status: 400, headers });
    if (!(await known(c))) return new Response(null, { status: 204, headers });
    await store.putEvent(`outreach/events/${c}/${k}/${v}`);
    return new Response(null, { status: 204, headers });
  };
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...headers, 'access-control-allow-methods': 'POST, OPTIONS' } });
}

export const POST = makeTrack(blobStore());
