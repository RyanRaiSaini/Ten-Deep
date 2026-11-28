/**
 * Shareable run results: a challenge link that unfurls into a picture of the run (record, result, the ten ratings).
 *   GET /run?s=..&p=..&w=..&l=..&n=..[&r=98.92...][&res=champion|round0-3|missed][&mt=Current Day]  → HTML with
 *       Open Graph tags, then straight into the app's challenge screen (/c with the same query).
 *   GET /api/run?...&img=1 → the 1200×630 PNG itself.
 * (vercel.json rewrites /run here.) Nothing is stored: everything comes from the URL, like api/pull.ts.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ImageResponse as OgImageResponse } from '@vercel/og';
import { rateLimit } from './_ratelimit';
import { parseChallenge } from '../src/engine/share';
import { squadRatingOf } from '../src/engine/rotation';
import { squadColor } from '../src/ui/squadColor';

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
type El = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };
const h = (style: Record<string, unknown>, ...children: unknown[]): El => ({ type: 'div', props: { style: { display: 'flex', ...style }, children: children.length === 1 ? children[0] : children } });

/** @vercel/og is ESM-only; see api/pull.ts for why it's loaded this way. */
const esmImport = new Function('u', 'return import(u)') as (u: string) => Promise<{ ImageResponse: typeof OgImageResponse }>;
let og: Promise<{ ImageResponse: typeof OgImageResponse }> | null = null;
const loadOg = () => (og ??= esmImport(pathToFileURL(join(process.cwd(), 'node_modules/@vercel/og/dist/index.node.js')).href));
let fonts: { name: string; data: ArrayBuffer; weight: 400 | 800; style: 'normal' }[] | null = null;
function loadFonts() {
  if (fonts) return fonts;
  const read = (p: string) => { const b = readFileSync(join(process.cwd(), p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; };
  fonts = [
    { name: 'Display', data: read('node_modules/@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'), weight: 400, style: 'normal' },
    { name: 'Body', data: read('node_modules/@expo-google-fonts/montserrat/800ExtraBold/Montserrat_800ExtraBold.ttf'), weight: 800, style: 'normal' },
  ];
  return fonts;
}

const RESULT: Record<string, string> = {
  champion: 'Champions', round0: 'Out in the first round', round1: 'Out in the second round', round2: 'Out in the conference finals',
  round3: 'Lost in the Finals', playin: 'Out in the play-in', missed: 'Missed the playoffs',
};

export interface RunInfo {
  name: string; w: number; l: number; fair: boolean;
  ratings: number[]; result: string | null; mode: string | null;
  /** Squad Rating from the ten ratings (null without them). */
  squad: number | null;
}

/** Everything the card shows, validated from the query (null if it isn't a valid challenge link). */
export function runInfo(q: URLSearchParams): RunInfo | null {
  const c = parseChallenge(Object.fromEntries(q));
  if (!c) return null;
  const ratings = (q.get('r') ?? '').split('.').map(Number).filter((n) => Number.isInteger(n) && n >= 40 && n <= 99).slice(0, 10);
  const res = q.get('res') ?? '';
  const mode = (q.get('mt') ?? '').replace(/[^\p{L}\p{N} '’.&-]/gu, '').trim().slice(0, 28) || null;
  const ten = ratings.length === 10 ? ratings : [];
  return { name: c.name, w: c.w, l: c.l, fair: c.fair, ratings: ten, result: RESULT[res] ?? null, mode, squad: ten.length ? Math.round(squadRatingOf(ten)) : null };
}

export const tileColor = (o: number) => (o >= 95 ? '#FFC53D' : o >= 88 ? '#2BC07A' : o >= 80 ? '#3B6CF0' : '#5A6378');

async function image(r: RunInfo) {
  const { ImageResponse } = await loadOg();
  const champ = r.result === RESULT.champion;
  const tile = (o: number, size: number) => h({
    width: size, height: size, borderRadius: size * 0.22, backgroundColor: tileColor(o), alignItems: 'center', justifyContent: 'center',
    border: '5px solid #0B1020', boxShadow: '0 6px 0 rgba(0,0,0,0.45)',
  }, h({ fontFamily: 'Display', fontSize: size * 0.5, color: o >= 95 ? '#17121E' : '#FFFFFF' }, String(o)));
  const root = h(
    { width: 1200, height: 630, flexDirection: 'column', padding: 56, justifyContent: 'space-between', backgroundImage: 'linear-gradient(135deg, #2A1F5C 0%, #1C2448 45%, #0B1020 100%)', color: '#FFFFFF', fontFamily: 'Body' },
    h({ justifyContent: 'space-between', alignItems: 'center' },
      h({ fontFamily: 'Display', fontSize: 44, color: '#FF9A3D', letterSpacing: 3 }, 'TEN DEEP'),
      h({ fontSize: 26, color: '#AEB6CC' }, r.mode ?? '')),
    h({ alignItems: 'center', justifyContent: 'space-between' },
      h({ flexDirection: 'column', maxWidth: 520 },
        h({ fontSize: 34, color: '#D9DEEA' }, `${r.name}'s draft`),
        h({ fontFamily: 'Display', fontSize: 168, lineHeight: 1, color: champ ? '#FFC53D' : '#FFFFFF' }, `${r.w}-${r.l}`),
        r.result ? h({ marginTop: 12, alignSelf: 'flex-start', padding: '8px 22px', borderRadius: 999, backgroundColor: champ ? '#FFC53D' : 'rgba(255,255,255,0.14)', fontSize: 28, color: champ ? '#17121E' : '#FFFFFF' }, r.result) : h({})),
      r.ratings.length
        ? h({ flexDirection: 'column', gap: 18, alignItems: 'flex-end' },
          h({ alignItems: 'center', gap: 12, padding: '6px 20px', borderRadius: 999, backgroundColor: squadColor(r.squad ?? 0) },
            h({ fontSize: 20, color: 'rgba(255,255,255,0.85)', letterSpacing: 2 }, 'SQUAD RATING'),
            h({ fontFamily: 'Display', fontSize: 40, color: '#FFFFFF' }, String(r.squad ?? ''))),
          h({ gap: 14 }, ...r.ratings.slice(0, 5).map((o) => tile(o, 104))),
          h({ gap: 14 }, ...r.ratings.slice(5).map((o) => tile(o, 80))))
        : h({})),
    h({ alignItems: 'center', justifyContent: 'space-between' },
      h({ fontFamily: 'Display', fontSize: 46 }, 'Can you beat it?'),
      h({ fontSize: 26, color: '#AEB6CC' }, r.fair ? 'Same spins. Same league.' : 'Same spins.')),
  );
  return new ImageResponse(root as never, {
    width: 1200, height: 630, fonts: loadFonts(),
    headers: { 'cache-control': 'public, max-age=86400, s-maxage=31536000, immutable' },
  });
}

function page(url: URL, r: RunInfo) {
  const origin = url.origin;
  const q = new URLSearchParams(url.searchParams);
  q.delete('img');
  const title = `${r.name} went ${r.w}-${r.l} in Ten Deep`;
  const desc = `${r.result ? `${r.result}. ` : ''}${r.fair ? 'Same spins, same league' : 'Same spins'}: can you beat it?`;
  const img = `${origin}/api/run?${q.toString()}&img=1`;
  const to = `${origin}/c?${q.toString()}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta property="og:type" content="website"><meta property="og:site_name" content="Ten Deep">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:image" content="${esc(img)}">
<meta http-equiv="refresh" content="0;url=${esc(to)}"></head>
<body style="background:#0B1020;color:#fff;font-family:sans-serif;text-align:center;padding:40px">
<img src="${esc(img)}" alt="${esc(title)}" style="max-width:100%;border-radius:16px"><p><a style="color:#FFC53D" href="${esc(to)}">Take the challenge in Ten Deep</a></p>
</body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600, s-maxage=86400' } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const r = runInfo(url.searchParams);
  if (!r) return Response.redirect(`${url.origin}/`, 302);
  if (!url.searchParams.get('img')) return page(url, r);
  return (await rateLimit(req, 'image')) ?? image(r);
}
