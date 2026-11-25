import { describe, expect, it } from 'vitest';
import { entryPath, parseEntry, sortBoard, weeklyPrize, type WeeklyEntry } from '../../src/engine/weekly';
import { makeHandler, type Store } from '../../api/weekly';

function memory(owners: Record<string, string> = {}): Store & { files: Map<string, { body: string; at: string }> } {
  const files = new Map<string, { body: string; at: string }>();
  let t = 0;
  return {
    files,
    list: async (prefix) => [...files].filter(([p]) => p.startsWith(prefix)).map(([pathname, f]) => ({ pathname, uploadedAt: f.at })),
    write: async (p, body) => { files.set(p, { body, at: new Date(Date.UTC(2026, 10, 25, 12, 0, t++)).toISOString() }); },
    pinOwner: async (pin) => owners[pin] ?? null,
  };
}
const sha = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const NOW = () => new Date('2026-11-25T15:00:00Z'); // a Wednesday: the week of Monday 2026-11-23
const KEY = 'device-secret-key-1234';
const post = (h: ReturnType<typeof makeHandler>, body: Record<string, unknown>) =>
  h.POST(new Request('https://x.test/api/weekly', { method: 'POST', body: JSON.stringify({ week: '2026-11-23', key: KEY, depth: 0, sr: 84, ...body }) })).then(async (r) => ({ status: r.status, body: await r.json() }));
const getBoard = (h: ReturnType<typeof makeHandler>, q: string) => h.GET(new Request(`https://x.test/api/weekly?${q}`)).then((r) => r.json());

describe('weekly entries', () => {
  it('a row round-trips through its stored path, unicode names included', () => {
    const e = { pin: 'K7Q2XM', name: 'José Ñ 🏀', w: 64, l: 18, depth: 3 as const, sr: 88 };
    expect(parseEntry(entryPath('2026-11-23', e), 't')).toEqual({ ...e, name: 'José Ñ', at: 't' });
  });

  it('sorts by wins, then playoff depth, then fewer losses, then who finished first', () => {
    const e = (pin: string, w: number, depth: number, at: string): WeeklyEntry => ({ pin, name: pin, w, l: 82 - w, depth: depth as WeeklyEntry['depth'], sr: 85, at });
    const sorted = sortBoard([e('AAAAAA', 60, 2, '2'), e('BBBBBB', 64, 0, '3'), e('CCCCCC', 60, 5, '4'), e('DDDDDD', 60, 2, '1')]);
    expect(sorted.map((x) => x.pin)).toEqual(['BBBBBB', 'CCCCCC', 'DDDDDD', 'AAAAAA']);
  });

  it('prizes: #1 a Mythic, top 10 a Weekly Pick, top 25% a Good Pick', () => {
    expect(weeklyPrize(1, 200)).toBe('mythic');
    expect(weeklyPrize(10, 200)).toBe('weekly');
    expect(weeklyPrize(50, 200)).toBe('good');
    expect(weeklyPrize(51, 200)).toBeNull();
    expect(weeklyPrize(3, 3)).toBe('weekly');
  });
});

describe('weekly API', () => {
  it('takes one entry per PIN per week and ranks it', async () => {
    const h = makeHandler(memory(), NOW);
    expect((await post(h, { pin: 'K7Q2XM', name: 'Ryan', w: 61, l: 21, depth: 4 })).body).toEqual({ ok: true, rank: 1, total: 1 });
    expect((await post(h, { pin: 'M2N3P4', name: 'Sam', w: 66, l: 16 })).body).toEqual({ ok: true, rank: 1, total: 2 });
    // A second try from the same PIN doesn't replace the first.
    expect((await post(h, { pin: 'K7Q2XM', name: 'Ryan', w: 80, l: 2 })).body).toEqual({ ok: true, rank: 2, total: 2 });
    const b = await getBoard(h, 'week=2026-11-23&pin=K7Q2XM');
    expect(b.total).toBe(2);
    expect(b.top.map((r: { name: string }) => r.name)).toEqual(['Sam', 'Ryan']);
    expect(b.me).toMatchObject({ name: 'Ryan', w: 61, rank: 2 });
    expect(JSON.stringify(b)).not.toContain('K7Q2XM');
  });

  it('refuses bad weeks, impossible records and someone else\'s PIN', async () => {
    const h = makeHandler(memory({ K7Q2XM: await sha('another-device-secret-99') }), NOW);
    expect((await post(h, { pin: 'K7Q2XM', name: 'x', w: 60, l: 22 })).status).toBe(403);
    expect((await post(h, { pin: 'M2N3P4', name: 'x', w: 60, l: 20 })).status).toBe(400);
    expect((await post(h, { pin: 'M2N3P4', name: 'x', w: 60, l: 22, week: '2026-10-05' })).status).toBe(400);
    expect((await post(h, { pin: 'M2N3P4', name: 'x', w: 60, l: 22, week: '2026-11-24' })).status).toBe(400);
    expect((await post(h, { pin: 'M2N3P4', name: 'x', w: 60, l: 22, depth: 9 })).status).toBe(400);
    expect((await post(h, { pin: 'M2N3P4', name: 'x', w: 60, l: 22 })).status).toBe(200);
  });
});
