import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryOutreachStore } from '../../api/_outreachstore';
import { LIMITS, clientIp, memoryCounter, overLimit, rateLimit, useCounter, withLimit } from '../../api/_ratelimit';
import { makeHandler } from '../../api/admin';

const req = (ip = '203.0.113.7', headers: Record<string, string> = {}) =>
  new Request('https://x.test/api/thing', { method: 'POST', headers: { 'x-real-ip': ip, ...headers }, body: '{}' });

beforeEach(() => useCounter(memoryCounter()));

describe('rate limits', () => {
  it('lets requests through up to the limit, then answers 429 with Retry-After', async () => {
    for (let i = 0; i < LIMITS.pinWrite.max; i++) expect(await rateLimit(req(), 'pinWrite')).toBeNull();
    const r = await rateLimit(req(), 'pinWrite', { 'access-control-allow-origin': '*' });
    expect(r?.status).toBe(429);
    expect(Number(r?.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(r?.headers.get('access-control-allow-origin')).toBe('*');
    expect(await r?.json()).toMatchObject({ error: 'rate-limited' });
  });

  it('counts each IP and each bucket separately', async () => {
    for (let i = 0; i < LIMITS.pinWrite.max; i++) await rateLimit(req('198.51.100.1'), 'pinWrite');
    expect(await rateLimit(req('198.51.100.1'), 'pinWrite')).not.toBeNull();
    expect(await rateLimit(req('198.51.100.2'), 'pinWrite')).toBeNull();
    expect(await rateLimit(req('198.51.100.1'), 'pinRead')).toBeNull();
  });

  it('a global bucket is shared by everyone', async () => {
    for (let i = 0; i < LIMITS.selftest.max; i++) await rateLimit(req(`10.0.0.${i}`), 'selftest');
    expect((await rateLimit(req('10.9.9.9'), 'selftest'))?.status).toBe(429);
  });

  it('overLimit only looks; it never counts', async () => {
    for (let i = 0; i < 50; i++) expect(await overLimit(req(), 'adminFail')).toBeNull();
    for (let i = 0; i < LIMITS.adminFail.max; i++) await rateLimit(req(), 'adminFail');
    expect((await overLimit(req(), 'adminFail'))?.status).toBe(429);
  });

  it('a broken store lets requests through instead of breaking the game', async () => {
    useCounter({ hit: async () => { throw new Error('down'); }, peek: async () => { throw new Error('down'); } });
    expect(await rateLimit(req(), 'pinWrite')).toBeNull();
  });

  it('the memory counter counts hits, answers peeks, and forgets a key once its window has passed', async () => {
    vi.useFakeTimers();
    try {
      const c = memoryCounter();
      expect(await c.hit('k', 60)).toBe(1);
      expect(await c.hit('k', 60)).toBe(2);
      expect(await c.peek('k')).toBe(2);
      expect(await c.peek('other')).toBe(0);
      vi.advanceTimersByTime(61_000);
      expect(await c.peek('k')).toBe(0);
      expect(await c.hit('k', 60)).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reads the client IP from x-real-ip, else the first x-forwarded-for hop', () => {
    expect(clientIp(req('1.2.3.4'))).toBe('1.2.3.4');
    expect(clientIp(new Request('https://x.test', { headers: { 'x-forwarded-for': '5.6.7.8, 10.0.0.1' } }))).toBe('5.6.7.8');
  });

  it('withLimit runs the handler until the bucket is spent', async () => {
    let calls = 0;
    const h = withLimit('weeklyWrite', async () => { calls++; return new Response('ok'); });
    for (let i = 0; i < LIMITS.weeklyWrite.max + 3; i++) await h(req());
    expect(calls).toBe(LIMITS.weeklyWrite.max);
  });
});

describe('admin key brute force', () => {
  it('locks an IP out after too many wrong keys, even if it then sends the right one', async () => {
    const KEY = 'k'.repeat(32);
    const handler = makeHandler({ store: memoryOutreachStore(), adminKey: () => KEY, ai: async () => '', probe: async () => 200 });
    const call = (key: string, ip = '192.0.2.50') => handler(req(ip, { 'x-admin-key': key }));
    // Right keys never count toward the lockout.
    for (let i = 0; i < 20; i++) expect((await call(KEY)).status).not.toBe(429);
    for (let i = 0; i < LIMITS.adminFail.max; i++) expect((await call('x'.repeat(32))).status).toBe(401);
    expect((await call(KEY)).status).toBe(429);
    // Another IP is unaffected.
    expect((await call(KEY, '192.0.2.51')).status).not.toBe(429);
  });
});
