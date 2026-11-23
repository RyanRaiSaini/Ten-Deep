import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { makeVerifier, type Provider } from './_auth';
import { makeHandler, type Store } from './account';

const AUD = { apple: ['app.tendeep'], google: ['web-client.apps.googleusercontent.com'] };
const ISS = { apple: 'https://appleid.apple.com', google: 'https://accounts.google.com' };
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let other: Awaited<ReturnType<typeof generateKeyPair>>;
let jwks: ReturnType<typeof createLocalJWKSet>;

const token = (p: Provider, sub: string, o: { aud?: string; iss?: string; exp?: string; key?: CryptoKey } = {}) =>
  new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setSubject(sub).setIssuer(o.iss ?? ISS[p])
    .setAudience(o.aud ?? AUD[p][0]).setIssuedAt().setExpirationTime(o.exp ?? '10m').sign(o.key ?? keys.privateKey);

function memory(): Store & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    read: async <T,>(p: string) => (data.has(p) ? (structuredClone(data.get(p)) as T) : null),
    write: async (p, v) => { data.set(p, structuredClone(v)); },
    remove: async (p) => { data.delete(p); },
  };
}
const sha = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const call = async (h: (r: Request) => Promise<Response>, body: unknown) => {
  const r = await h(new Request('https://x.test/api/account', { method: 'POST', body: JSON.stringify(body) }));
  return { status: r.status, body: await r.json() };
};

beforeAll(async () => {
  keys = await generateKeyPair('RS256');
  other = await generateKeyPair('RS256');
  jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(keys.publicKey)), kid: 'k1', alg: 'RS256' }] });
});

describe('ID token verification', () => {
  const verify = () => makeVerifier(() => jwks, (p) => AUD[p]);
  it('accepts a good Apple and Google token', async () => {
    expect(await verify()('apple', await token('apple', 'apple-user'))).toEqual({ sub: 'apple-user' });
    expect(await verify()('google', await token('google', 'g-user'))).toEqual({ sub: 'g-user' });
  });
  it('rejects a wrong audience, issuer, signature, expiry or provider mix-up', async () => {
    const v = verify();
    expect(await v('apple', await token('apple', 'u', { aud: 'com.someone.else' }))).toBeNull();
    expect(await v('apple', await token('apple', 'u', { iss: 'https://evil.example' }))).toBeNull();
    expect(await v('apple', await token('apple', 'u', { key: other.privateKey }))).toBeNull();
    expect(await v('apple', await token('apple', 'u', { exp: '-5m' }))).toBeNull();
    expect(await v('google', await token('apple', 'u'))).toBeNull(); // an Apple token isn't a Google one
    expect(await v('apple', 'not-a-jwt')).toBeNull();
  });
  it('a provider with no configured audience is off', async () => {
    expect(await makeVerifier(() => jwks, () => [])('google', await token('google', 'u'))).toBeNull();
  });
});

describe('account linking', () => {
  const PIN = 'K7Q2XM';
  const KEY = 'a'.repeat(40);
  const setup = async () => {
    const store = memory();
    store.data.set(`saves/${PIN}.json`, { keyHash: await sha(KEY), data: '{}' });
    store.data.set(`pins/${PIN}.json`, { keyHash: await sha(KEY), code: 'TD1x' });
    return { store, h: makeHandler(store, makeVerifier(() => jwks, (p) => AUD[p])) };
  };

  it('link on one device, sign in on another and get the PIN + key back', async () => {
    const { h } = await setup();
    const idToken = await token('apple', 'ryan');
    expect((await call(h, { op: 'signin', provider: 'apple', idToken })).body).toEqual({ linked: false });
    expect((await call(h, { op: 'link', provider: 'apple', idToken, pin: PIN, key: KEY })).status).toBe(200);
    expect((await call(h, { op: 'signin', provider: 'apple', idToken: await token('apple', 'ryan') })).body).toEqual({ linked: true, pin: PIN, key: KEY });
  });

  it('refuses a bad token, linking a PIN you do not own, and moving an account to another PIN', async () => {
    const { h } = await setup();
    expect((await call(h, { op: 'signin', provider: 'apple', idToken: 'junk' })).status).toBe(401);
    expect((await call(h, { op: 'link', provider: 'apple', idToken: await token('apple', 'thief'), pin: PIN, key: 'b'.repeat(40) })).body).toEqual({ error: 'not-yours' });
    await call(h, { op: 'link', provider: 'apple', idToken: await token('apple', 'ryan'), pin: PIN, key: KEY });
    expect((await call(h, { op: 'link', provider: 'apple', idToken: await token('apple', 'ryan'), pin: 'ABCDEF', key: 'c'.repeat(40) })).body).toEqual({ error: 'linked-elsewhere' });
  });

  it('a PIN belongs to one account at a time; unlink and erase clean up', async () => {
    const { h, store } = await setup();
    await call(h, { op: 'link', provider: 'apple', idToken: await token('apple', 'first'), pin: PIN, key: KEY });
    await call(h, { op: 'link', provider: 'google', idToken: await token('google', 'second'), pin: PIN, key: KEY });
    expect((await call(h, { op: 'signin', provider: 'apple', idToken: await token('apple', 'first') })).body).toEqual({ linked: false });
    expect((await call(h, { op: 'signin', provider: 'google', idToken: await token('google', 'second') })).body.linked).toBe(true);
    expect((await call(h, { op: 'erase', pin: PIN, key: 'z'.repeat(40) })).status).toBe(403);
    expect((await call(h, { op: 'erase', pin: PIN, key: KEY })).body).toEqual({ ok: true });
    expect([...store.data.keys()]).toEqual([]);
  });
});
