/**
 * Private outreach workspace API. Every request needs the `x-admin-key` header to match the ADMIN_KEY
 * environment variable (server-only). Without ADMIN_KEY set, the API answers 503 and stores nothing.
 *
 *   POST /api/admin { op: 'load' }                          → { db, status }
 *   POST /api/admin { op: 'save', db, baseRev }             → { rev } | 409 { error: 'conflict', db }
 *   POST /api/admin { op: 'generate', contactId, kind, ... }→ { draft } | { error }   (AI draft for review, never sent)
 *   POST /api/admin { op: 'report' }                        → { byCode, truncated }   (recorded campaign-link events)
 *   POST /api/admin { op: 'checkUrl', url }                 → { status }              (game links only)
 *
 * Nothing here sends email. Incoming messages stored in the db are data, passed to the AI only inside a
 * block it is told not to take instructions from.
 */
import { blobStore, type OutreachStore } from './_outreachstore';
import { overLimit, rateLimit } from './_ratelimit';
import { landingUrl } from '../src/outreach/links';
import { buildPrompt, parseDraftJson, PRESETS, type Preset } from '../src/outreach/prompt';
import { EVENT_KINDS, GAME_URL, type Db, type DraftKind, type EventKind } from '../src/outreach/types';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const MAX_DB = 3_000_000;

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
/** Compare two secrets without leaking where they differ. */
async function sameSecret(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}

export type Ai = (system: string, user: string, req: Request) => Promise<string>;

export class AiError extends Error {
  constructor(public code: 'ai-not-configured' | 'ai-failed', public detail = '') { super(code); }
}

/** Vercel AI Gateway, OpenAI-compatible chat endpoint. Auth: AI_GATEWAY_API_KEY, else the deployment's OIDC token. */
export const gatewayAi: Ai = async (system, user, req) => {
  const model = process.env.AI_GATEWAY_MODEL;
  const token = process.env.AI_GATEWAY_API_KEY || req.headers.get('x-vercel-oidc-token') || process.env.VERCEL_OIDC_TOKEN;
  if (!model) throw new AiError('ai-not-configured', 'Set AI_GATEWAY_MODEL to a model ID from the AI Gateway catalog.');
  if (!token) throw new AiError('ai-not-configured', 'No AI Gateway credential: enable OIDC for the project or set AI_GATEWAY_API_KEY.');
  const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 1200, temperature: 0.7, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    signal: AbortSignal.timeout(60_000),
  }).catch((e: unknown) => { throw new AiError('ai-failed', String(e)); });
  if (!r.ok) throw new AiError('ai-failed', `${r.status} ${(await r.text()).slice(0, 300)}`);
  const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? '';
};

export interface Deps {
  store: OutreachStore;
  adminKey: () => string | undefined;
  ai: Ai;
  /** Fetch a game URL and return its HTTP status (0 on network failure). */
  probe: (url: string) => Promise<number>;
}

const probe = async (url: string) => {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
    return r.status;
  } catch {
    return 0;
  }
};

/** Integration states shown honestly in the admin. */
export function integrationStatus() {
  return {
    storage: !!process.env.BLOB_READ_WRITE_TOKEN,
    ai: { model: process.env.AI_GATEWAY_MODEL ?? null, configured: !!process.env.AI_GATEWAY_MODEL },
    gmail: { connected: false, note: 'No email integration is connected. Copy drafts or open them in your mail app, send them yourself, then mark them sent.' },
  };
}

function validDb(x: unknown): x is Db {
  const d = x as Db;
  return !!d && typeof d === 'object' && ['contacts', 'campaigns', 'drafts', 'messages', 'ideas', 'evidence'].every((k) => Array.isArray((d as unknown as Record<string, unknown>)[k]));
}

export function makeHandler(deps: Deps) {
  return async function POST(req: Request): Promise<Response> {
    const want = deps.adminKey();
    if (!want || want.length < 24) return json({ error: 'admin-not-configured' }, 503);
    // Locked out after too many wrong keys from this IP; only wrong keys count toward it.
    const locked = await overLimit(req, 'adminFail');
    if (locked) return locked;
    const got = req.headers.get('x-admin-key') ?? '';
    if (!got || !(await sameSecret(got, want))) {
      await rateLimit(req, 'adminFail');
      return json({ error: 'unauthorized' }, 401);
    }
    const busy = await rateLimit(req, 'admin');
    if (busy) return busy;

    let b: Record<string, unknown>;
    try { b = (await req.json()) as Record<string, unknown>; } catch { return json({ error: 'bad-json' }, 400); }

    if (b.op === 'load') {
      const db = await deps.store.readDb();
      return json({ db, status: integrationStatus() });
    }

    if (b.op === 'save') {
      if (!validDb(b.db)) return json({ error: 'bad-db' }, 400);
      const raw = JSON.stringify(b.db);
      if (raw.length > MAX_DB) return json({ error: 'too-big' }, 413);
      const next = b.db;
      // Emails need a public source; an unverified address stays missing.
      const bad = next.contacts.find((c) => c.email && !c.emailSource?.url);
      if (bad) return json({ error: 'email-needs-source', contact: bad.name }, 400);
      const current = await deps.store.readDb();
      const baseRev = Number(b.baseRev ?? 0);
      if ((current?.rev ?? 0) !== baseRev) return json({ error: 'conflict', db: current }, 409);
      const saved: Db = { ...next, rev: baseRev + 1, updatedAt: new Date().toISOString() };
      await deps.store.writeDb(saved);
      return json({ rev: saved.rev, updatedAt: saved.updatedAt });
    }

    if (b.op === 'generate') {
      const db = await deps.store.readDb();
      const contact = db?.contacts.find((c) => c.id === b.contactId);
      if (!db || !contact) return json({ error: 'not-found' }, 404);
      if (contact.status === 'Declined' || contact.status === 'Do not contact') return json({ error: 'closed' }, 409);
      const kind = (['first', 'reply', 'follow-up'] as const).includes(b.kind as DraftKind) ? (b.kind as DraftKind) : 'first';
      const campaign = db.campaigns.find((c) => c.id === b.campaignId) ?? null;
      const code = campaign ? contact.links[campaign.id] ?? campaign.code : '';
      const link = landingUrl(campaign?.landing ?? '/', code);
      const preset = PRESETS[b.preset as Preset];
      const instruction = [preset, typeof b.instruction === 'string' ? b.instruction.slice(0, 500) : ''].filter(Boolean).join(' ');
      const current = b.current && typeof b.current === 'object' ? (b.current as { subject: string; text: string }) : undefined;
      const thread = db.messages.filter((m) => m.contactId === contact.id).sort((x, y) => x.at.localeCompare(y.at));
      const { system, user } = buildPrompt({ settings: db.settings, contact, campaign, kind, link, thread, current, instruction });
      try {
        const out = parseDraftJson(await deps.ai(system, user, req));
        if (!out) return json({ error: 'ai-failed', detail: 'The model did not return a usable draft. Try again.' }, 502);
        return json({ draft: out, link });
      } catch (e) {
        if (e instanceof AiError) return json({ error: e.code, detail: e.detail }, e.code === 'ai-not-configured' ? 503 : 502);
        throw e;
      }
    }

    if (b.op === 'report') {
      const { paths, truncated } = await deps.store.listEvents('outreach/events/');
      const byCode: Record<string, Partial<Record<EventKind, number>>> = {};
      for (const p of paths) {
        const [, , code, kind] = p.split('/');
        if (!code || !(EVENT_KINDS as readonly string[]).includes(kind)) continue;
        const k = kind as EventKind;
        byCode[code] = { ...byCode[code], [k]: (byCode[code]?.[k] ?? 0) + 1 };
      }
      return json({ byCode, truncated, at: new Date().toISOString() });
    }

    if (b.op === 'checkUrl') {
      const url = String(b.url ?? '');
      if (!url.startsWith(`${GAME_URL}/`) && url !== GAME_URL) return json({ error: 'not-a-game-url' }, 400);
      return json({ status: await deps.probe(url) });
    }

    return json({ error: 'bad-op' }, 400);
  };
}

export const POST = makeHandler({ store: blobStore(), adminKey: () => process.env.ADMIN_KEY, ai: gatewayAi, probe });
