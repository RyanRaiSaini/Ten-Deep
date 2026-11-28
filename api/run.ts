/**
 * Shareable run results: a challenge link that unfurls into a picture of the run (record, result, the ten ratings).
 *   GET /run?s=..&p=..&w=..&l=..&n=..[&r=98.92...][&res=champion|round0-3|missed][&mt=Current Day]  → HTML with
 *       Open Graph tags, then straight into the app's challenge screen (/c with the same query).
 *   GET /api/run?...&img=1 → the 1200×630 PNG itself.
 * (vercel.json rewrites /run here.) Nothing is stored: everything comes from the URL, like api/pull.ts.
 */
import { ARENA, arena, h, loadFonts, loadOg, wordmark } from './_og';
import { rateLimit } from './_ratelimit';
import { parseChallenge } from '../src/engine/share';
import { squadRatingOf } from '../src/engine/rotation';
import { squadColor } from '../src/ui/squadColor';

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

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

/** Rating tile colors, as on the app's player rows: amber superstar, green great, blue good, slate role player. */
export const tileColor = (o: number) => (o >= 95 ? ARENA.accent : o >= 88 ? '#0FA876' : o >= 80 ? '#2F6BFF' : o >= 72 ? '#3A4558' : '#5C6678');

async function image(r: RunInfo) {
  const { ImageResponse } = await loadOg();
  const champ = r.result === RESULT.champion;
  const tile = (o: number, size: number) => h({
    width: size, height: size, borderRadius: Math.round(size * 0.24), backgroundColor: tileColor(o), alignItems: 'center', justifyContent: 'center',
    border: '2px solid rgba(255,255,255,0.22)', borderBottom: `6px solid ${ARENA.edge}`,
  }, h({ fontFamily: 'Display', fontSize: Math.round(size * 0.5), color: o >= 95 ? ARENA.bg : '#FFFFFF' }, String(o)));
  const root = h(
    { width: 1200, height: 630, position: 'relative', flexDirection: 'column', padding: '46px 56px', justifyContent: 'space-between', backgroundColor: ARENA.bg, color: ARENA.text, fontFamily: 'Body' },
    ...arena(champ ? ARENA.accent : '#3B4CA8'),
    h({ justifyContent: 'space-between', alignItems: 'center' },
      wordmark(40),
      r.mode ? h({ fontFamily: 'Cond', fontSize: 30, color: ARENA.muted, letterSpacing: 2, textTransform: 'uppercase' }, r.mode) : h({})),
    h({ alignItems: 'center', justifyContent: 'space-between' },
      h({ flexDirection: 'column', maxWidth: 560 },
        h({ fontSize: 32, color: ARENA.soft }, `${r.name}'s draft`),
        // The record as a scoreboard: wins in green (amber for a title), losses in red.
        h({ alignItems: 'center', fontFamily: 'Cond', lineHeight: 1 },
          h({ fontSize: 196, color: champ ? ARENA.accent : ARENA.win }, String(r.w)),
          h({ fontSize: 120, color: '#6B7689', margin: '0 14px' }, '–'),
          h({ fontSize: 196, color: ARENA.loss }, String(r.l))),
        r.result
          ? h({ marginTop: 10, alignSelf: 'flex-start', padding: '8px 22px', borderRadius: 14, fontFamily: 'Cond', fontSize: 32, letterSpacing: 1, textTransform: 'uppercase',
            backgroundColor: champ ? ARENA.accent : ARENA.surface2, color: champ ? ARENA.bg : ARENA.text, border: champ ? 'none' : `2px solid ${ARENA.line}` }, r.result)
          : h({})),
      r.ratings.length
        ? h({ flexDirection: 'column', gap: 16, alignItems: 'flex-end' },
          h({ alignItems: 'center', gap: 14, padding: '6px 20px', borderRadius: 14, backgroundColor: squadColor(r.squad ?? 0), borderBottom: '5px solid rgba(0,0,0,0.35)' },
            h({ fontFamily: 'Cond', fontSize: 24, color: 'rgba(255,255,255,0.9)', letterSpacing: 2 }, 'SQUAD RATING'),
            h({ fontFamily: 'Display', fontSize: 42, color: '#FFFFFF' }, String(r.squad ?? ''))),
          h({ gap: 14 }, ...r.ratings.slice(0, 5).map((o) => tile(o, 104))),
          h({ gap: 14 }, ...r.ratings.slice(5).map((o) => tile(o, 80))))
        : h({})),
    h({ alignItems: 'center', justifyContent: 'space-between' },
      h({ fontFamily: 'Cond', fontSize: 58, color: ARENA.accent, letterSpacing: 1 }, 'CAN YOU BEAT IT?'),
      h({ fontSize: 26, color: ARENA.muted }, r.fair ? 'Same spins. Same league.' : 'Same spins.')),
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
<body style="background:${ARENA.bg};color:${ARENA.text};font-family:sans-serif;text-align:center;padding:40px">
<img src="${esc(img)}" alt="${esc(title)}" style="max-width:100%;border-radius:16px"><p><a style="color:${ARENA.accent}" href="${esc(to)}">Take the challenge in Ten Deep</a></p>
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
