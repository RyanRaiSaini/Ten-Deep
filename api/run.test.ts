import { describe, expect, it } from 'vitest';
import { GET, runInfo, tileColor } from './run';

const q = (s: string) => new URLSearchParams(s);

describe('run share page', () => {
  it('reads a run from the link and ignores junk', () => {
    expect(runInfo(q('s=abc&p=current-2026&w=66&l=16&n=Ryan&v=2&r=97.92.88.86.84.83.80.78.74.70&res=champion&mt=Current+Day'))).toEqual({
      name: 'Ryan', w: 66, l: 16, fair: true, ratings: [97, 92, 88, 86, 84, 83, 80, 78, 74, 70], result: 'Champions', mode: 'Current Day',
    });
    const junk = runInfo(q('s=abc&p=current-2026&w=40&l=42&n=Jo&r=1.2.3&res=hacked&mt=<b>x</b>'))!;
    expect(junk.ratings).toEqual([]);
    expect(junk.result).toBeNull();
    expect(junk.mode).toBe('bxb');
    expect(runInfo(q('s=<x>&p=a&w=1&l=1'))).toBeNull();
    expect(tileColor(95)).not.toBe(tileColor(94));
  });

  it('serves preview tags with everything escaped, then forwards to the challenge screen with the same query', async () => {
    const r = await GET(new Request('https://ten-deep.vercel.app/run?s=abc&p=current-2026&w=61&l=21&n=%3Cscript%3E&v=2&res=round3'));
    const html = await (r as Response).text();
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt; went 61-21 in Ten Deep');
    expect(html).toContain('Lost in the Finals. Same spins, same league: can you beat it?');
    expect(html).toContain('content="0;url=https://ten-deep.vercel.app/c?s=abc&amp;p=current-2026');
    expect(html).toContain('og:image" content="https://ten-deep.vercel.app/api/run?s=abc');
  });

  it('a broken link goes to the home page', async () => {
    const r = (await GET(new Request('https://ten-deep.vercel.app/run?s=x'))) as Response;
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('https://ten-deep.vercel.app/');
  });
});
