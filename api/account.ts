/**
 * Accounts: link a Sign in with Apple / Google identity to a player's PIN + device key, so signing in on a new
 * device brings their cloud save, collection and friends back (no recovery code needed).
 *   POST /api/account { op: 'signin', provider, idToken }        → { linked: false } | { linked: true, pin, key }
 *   POST /api/account { op: 'link', provider, idToken, pin, key } → { ok } (the key must own the PIN's data)
 *   POST /api/account { op: 'unlink', provider, idToken }         → { ok }
 *   POST /api/account { op: 'erase', pin, key }                   → deletes the cloud save, PIN entry and account
 *                                                                    link (Settings → Delete account)
 * Records live in the private Blob store, keyed by a hash of provider + subject (no email or name is stored).
 */
import { del, get, put } from '@vercel/blob';
import { JWKS_URLS, loadJose, makeVerifier, PROVIDERS, type Provider, type Verifier } from './_auth';

const PIN = /^[A-HJKMNP-Z2-9]{6}$/;

export type Store = {
  read: <T>(path: string) => Promise<T | null>;
  write: (path: string, value: unknown) => Promise<void>;
  remove: (path: string) => Promise<void>;
};

const blobStore: Store = {
  async read<T>(path: string) {
    const r = await get(path, { access: 'private', useCache: false }).catch(() => null);
    if (!r || r.statusCode !== 200) return null;
    return JSON.parse(await new Response(r.stream).text()) as T;
  },
  async write(path, value) {
    await put(path, JSON.stringify(value), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' });
  },
  async remove(path) {
    await del(path).catch(() => {});
  },
};

type Account = { pin: string; key: string; provider: Provider; linked: string };
type Owned = { keyHash: string };

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' } });

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' } });
}

/** The request handler, with storage and token checks injectable for tests. */
export function makeHandler(store: Store, verify: Verifier) {
  const accountPath = async (p: Provider, sub: string) => `accounts/${await sha256(`${p}:${sub}`)}.json`;
  const byPin = (pin: string) => `accounts-by-pin/${pin}.json`;
  /** The key must own whatever already exists under the PIN (its friend-code entry and cloud save). */
  const owns = async (pin: string, key: string) => {
    const h = await sha256(key);
    const [p, s] = await Promise.all([store.read<Owned>(`pins/${pin}.json`), store.read<Owned>(`saves/${pin}.json`)]);
    return (!p || p.keyHash === h) && (!s || s.keyHash === h);
  };

  return async function POST(req: Request): Promise<Response> {
    let b: Record<string, unknown>;
    try { b = await req.json(); } catch { return json({ error: 'bad-json' }, 400); }
    const pin = String(b.pin ?? '');
    const key = String(b.key ?? '');
    const validIdentity = PIN.test(pin) && key.length >= 16 && key.length <= 128;

    if (b.op === 'erase') {
      if (!validIdentity) return json({ error: 'bad-identity' }, 400);
      if (!(await owns(pin, key))) return json({ error: 'not-yours' }, 403);
      const link = await store.read<{ path: string }>(byPin(pin));
      await Promise.all([
        store.remove(`saves/${pin}.json`), store.remove(`pins/${pin}.json`), store.remove(byPin(pin)),
        link ? store.remove(link.path) : Promise.resolve(),
      ]);
      return json({ ok: true });
    }

    const provider = b.provider as Provider;
    if (!PROVIDERS.includes(provider)) return json({ error: 'bad-provider' }, 400);
    const who = await verify(provider, String(b.idToken ?? ''));
    if (!who) return json({ error: 'bad-token' }, 401);
    const path = await accountPath(provider, who.sub);
    const account = await store.read<Account>(path);

    switch (b.op) {
      case 'signin':
        return json(account ? { linked: true, pin: account.pin, key: account.key } : { linked: false });
      case 'link': {
        if (!validIdentity) return json({ error: 'bad-identity' }, 400);
        if (account && account.pin !== pin) return json({ error: 'linked-elsewhere' }, 409);
        if (!(await owns(pin, key))) return json({ error: 'not-yours' }, 403);
        // A PIN belongs to at most one account: drop any older link from this PIN.
        const old = await store.read<{ path: string }>(byPin(pin));
        if (old && old.path !== path) await store.remove(old.path);
        await store.write(path, { pin, key, provider, linked: new Date().toISOString() } satisfies Account);
        await store.write(byPin(pin), { path });
        return json({ ok: true });
      }
      case 'unlink':
        if (account) await Promise.all([store.remove(path), store.remove(byPin(account.pin))]);
        return json({ ok: true });
      default:
        return json({ error: 'bad-op' }, 400);
    }
  };
}

export const POST = makeHandler(blobStore, makeVerifier());

/**
 * GET /api/account?selftest=1: proves the deployed function works end to end. Loads jose, fetches Apple's and
 * Google's real signing keys, then runs link → sign in → erase against the real store with a token signed by a
 * throwaway key (so no real account is involved), under a reserved test PIN.
 */
async function selfTest() {
  const steps: { step: string; ok: boolean; detail?: unknown }[] = [];
  const jose = await loadJose();
  steps.push({ step: 'jose loads', ok: typeof jose.jwtVerify === 'function' });
  for (const p of PROVIDERS) {
    const r = await fetch(JWKS_URLS[p]).then((x) => x.json()).catch(() => null) as { keys?: unknown[] } | null;
    steps.push({ step: `${p} signing keys reachable`, ok: !!r?.keys?.length, detail: r?.keys?.length });
  }
  const real = makeHandler(blobStore, makeVerifier());
  const junk = await real(new Request('https://x/api/account', { method: 'POST', body: JSON.stringify({ op: 'signin', provider: 'apple', idToken: 'junk' }) }));
  steps.push({ step: 'a junk token is refused', ok: junk.status === 401 });

  const pair = await jose.generateKeyPair('RS256');
  const jwks = jose.createLocalJWKSet({ keys: [{ ...(await jose.exportJWK(pair.publicKey)), kid: 't', alg: 'RS256' }] });
  const h = makeHandler(blobStore, makeVerifier(() => jwks, () => ['selftest']));
  const tok = () => new jose.SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 't' }).setSubject('selftest-user')
    .setIssuer('https://appleid.apple.com').setAudience('selftest').setIssuedAt().setExpirationTime('5m').sign(pair.privateKey);
  const call = async (body: Record<string, unknown>) => {
    const r = await h(new Request('https://x/api/account', { method: 'POST', body: JSON.stringify(body) }));
    return { status: r.status, body: (await r.json()) as Record<string, unknown> };
  };
  const pin = 'ZZZZZY';
  const key = Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => b.toString(16).padStart(2, '0')).join('');
  await call({ op: 'erase', pin, key });
  const link = await call({ op: 'link', provider: 'apple', idToken: await tok(), pin, key });
  steps.push({ step: 'link', ok: link.status === 200, detail: link.body });
  const back = await call({ op: 'signin', provider: 'apple', idToken: await tok() });
  steps.push({ step: 'sign in finds the PIN and key', ok: back.body.pin === pin && back.body.key === key });
  const erased = await call({ op: 'erase', pin, key });
  const after = await call({ op: 'signin', provider: 'apple', idToken: await tok() });
  steps.push({ step: 'erase removes the link', ok: erased.status === 200 && after.body.linked === false });
  return { ok: steps.every((x) => x.ok), steps };
}

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get('selftest') !== '1') return json({ error: 'post-only' }, 405);
  return json(await selfTest());
}
