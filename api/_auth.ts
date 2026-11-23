/**
 * Verifies Sign in with Apple / Google ID tokens: signature against the provider's published keys (JWKS),
 * issuer, audience (our app's IDs from CONFIG.auth) and expiry. Returns the stable account id (`sub`).
 */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { JWTVerifyGetKey } from 'jose';
import { CONFIG } from '../src/config';

/**
 * jose is ESM-only and Vercel compiles functions to CommonJS, whose require() can't load it (same issue as
 * @vercel/og in api/pull.ts). A real import() kept away from the compiler loads it; vercel.json ships its files.
 */
type Jose = typeof import('jose');
const esmImport = new Function('u', 'return import(u)') as (u: string) => Promise<Jose>;
let jose: Promise<Jose> | null = null;
const loadJose = () => (jose ??= esmImport(pathToFileURL(join(process.cwd(), 'node_modules/jose/dist/webapi/index.js')).href)
  // Test runners (vitest's sandbox) have no loader for that kind of import(); a plain one works there.
  .catch(() => import('jose')));

export type Provider = 'apple' | 'google';
export const PROVIDERS: Provider[] = ['apple', 'google'];

const SOURCES: Record<Provider, { jwks: string; issuer: string[] }> = {
  apple: { jwks: 'https://appleid.apple.com/auth/keys', issuer: ['https://appleid.apple.com'] },
  google: { jwks: 'https://www.googleapis.com/oauth2/v3/certs', issuer: ['https://accounts.google.com', 'accounts.google.com'] },
};

export function audiences(p: Provider): string[] {
  if (p === 'apple') return CONFIG.auth.appleAudiences;
  return Object.values(CONFIG.auth.google).filter((x): x is string => !!x);
}

export { loadJose };
export const JWKS_URLS: Record<Provider, string> = { apple: SOURCES.apple.jwks, google: SOURCES.google.jwks };

const remote: Partial<Record<Provider, JWTVerifyGetKey>> = {};
const keysFor = async (p: Provider) => (remote[p] ??= (await loadJose()).createRemoteJWKSet(new URL(SOURCES[p].jwks)));

export type Verified = { sub: string };
export type Verifier = (provider: Provider, token: string) => Promise<Verified | null>;

/** Real verifier; `keys` / `aud` are injectable for tests. */
export function makeVerifier(keys: (p: Provider) => JWTVerifyGetKey | Promise<JWTVerifyGetKey> = keysFor, aud: (p: Provider) => string[] = audiences): Verifier {
  return async (provider, token) => {
    const audience = aud(provider);
    if (!PROVIDERS.includes(provider) || !audience.length || typeof token !== 'string' || token.length > 8192) return null;
    try {
      const { jwtVerify } = await loadJose();
      const { payload } = await jwtVerify(token, await keys(provider), { issuer: SOURCES[provider].issuer, audience, clockTolerance: 60 });
      return typeof payload.sub === 'string' && payload.sub ? { sub: payload.sub } : null;
    } catch {
      return null;
    }
  };
}
