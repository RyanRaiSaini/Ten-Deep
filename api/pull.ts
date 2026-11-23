/**
 * Shareable pulls: a link that unfurls into a picture of the card in Messages, Discord, X, etc.
 *   GET /pull/<cardId>/<finish>          → tiny HTML page with Open Graph tags, then into the app's card page
 *   GET /api/pull?c=<cardId>&f=<finish>&img=1 → the 1200×630 PNG itself
 * (vercel.json rewrites /pull/... here.) No player data is stored or read: everything comes from the URL.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from '@vercel/og';
import { CARD_BY_ID } from '../src/data/cards';
import { FINISHES, ONE_IN, type Finish } from '../src/engine/collect/finishes';
import type { Card } from '../src/engine/collect/tiers';
import { FINISH_STYLE } from '../src/ui/finishStyle';
import { TIER_STYLE } from '../src/ui/tierStyle';

const FINISH_NAME: Record<Finish, string> = { base: 'Base', holo: 'Holo', chrome: 'Chrome', gold: 'Gold', violet: 'Violet', rainbow: 'Rainbow', cosmic: 'Cosmic' };
const TIER_NAME: Record<Card['tier'], string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', mythic: 'Mythic', ultra: 'Ultra' };

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const grad = (colors: readonly string[], deg = 135) => `linear-gradient(${deg}deg, ${colors.join(', ')})`;

type El = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };
/** Satori takes React-element-shaped objects; this keeps the file plain .ts (no JSX). */
const h = (style: Record<string, unknown>, ...children: unknown[]): El => ({ type: 'div', props: { style: { display: 'flex', ...style }, children: children.length === 1 ? children[0] : children } });

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

function parse(url: URL): { card: Card; finish: Finish } | null {
  const card = CARD_BY_ID[url.searchParams.get('c') ?? ''];
  const f = (url.searchParams.get('f') ?? 'base') as Finish;
  if (!card || !FINISHES.includes(f)) return null;
  return { card, finish: f };
}

/** The card itself, drawn to match the in-app card: frame, team gradient, rating, jersey, name. */
function cardEl(card: Card, finish: Finish) {
  const fs = FINISH_STYLE[finish];
  const tier = TIER_STYLE[card.tier];
  const W = 330, H = 462;
  return h(
    { width: W, height: H, padding: fs.frame ? 10 : 7, borderRadius: 26, backgroundImage: grad(fs.frame ?? tier.frame), boxShadow: `0 0 60px ${fs.frame ? fs.chip[0] : tier.accent}` },
    h(
      { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: 22, borderRadius: 18, border: `3px solid ${tier.accent}`, backgroundImage: grad([card.colors[0], card.colors[1]], 160), position: 'relative', overflow: 'hidden' },
      fs.tint ? h({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: grad(fs.tint) }) : '',
      h({ alignSelf: 'flex-start', flexDirection: 'column' },
        h({ fontFamily: 'Display', fontSize: 74, color: '#FFFFFF', lineHeight: 1 }, String(card.ovr)),
        h({ fontFamily: 'Body', fontSize: 22, color: '#FFFFFF' }, card.pos2 ? `${card.pos}/${card.pos2}` : card.pos)),
      h({ width: 150, height: 150, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: card.colors[0], border: `8px solid ${card.colors[1]}` },
        h({ fontFamily: 'Display', fontSize: 64, color: '#FFFFFF' }, initials(card.name))),
      h({ flexDirection: 'column', alignItems: 'center' },
        h({ fontFamily: 'Display', fontSize: 34, color: '#FFFFFF', textAlign: 'center' }, card.name),
        h({ fontFamily: 'Body', fontSize: 20, color: 'rgba(255,255,255,0.85)' }, card.team)),
    ),
  );
}

function image(card: Card, finish: Finish) {
  const fs = FINISH_STYLE[finish];
  const accent = fs.frame ? fs.chip[0] : TIER_STYLE[card.tier].accent;
  const title = finish === 'base' ? `${TIER_NAME[card.tier].toUpperCase()} PULL` : `${FINISH_NAME[finish].toUpperCase()} PULL!`;
  const odds = finish === 'base' ? `${TIER_NAME[card.tier]} card` : `1 in ${ONE_IN[finish].toLocaleString('en-US')}`;
  const root = h(
    { width: 1200, height: 630, alignItems: 'center', justifyContent: 'space-around', padding: 60, backgroundImage: 'linear-gradient(180deg, #07051A 0%, #1A0F45 60%, #3A1E10 100%)', fontFamily: 'Body' },
    cardEl(card, finish),
    h({ flexDirection: 'column', maxWidth: 620 },
      h({ fontFamily: 'Display', fontSize: 84, lineHeight: 1, backgroundImage: grad(fs.frame ? fs.frame.slice(1, -1) : [accent, '#FFFFFF'], 90), backgroundClip: 'text', color: 'transparent' }, title),
      h({ fontFamily: 'Display', fontSize: 58, color: '#FFFFFF', marginTop: 12 }, card.name),
      h({ fontSize: 30, color: 'rgba(255,255,255,0.8)', marginTop: 4 }, `${card.team} · ${card.ovr} OVR`),
      h({ marginTop: 26, alignSelf: 'flex-start', padding: '10px 26px', borderRadius: 999, backgroundImage: grad(finish === 'base' ? [accent, accent] : fs.chip, 90), border: '3px solid #FFFFFF' },
        h({ fontFamily: 'Display', fontSize: 40, color: '#FFFFFF' }, odds)),
      h({ marginTop: 40, fontFamily: 'Display', fontSize: 40, color: '#FFFFFF', letterSpacing: 4 }, 'TEN DEEP')),
  );
  return new ImageResponse(root as never, {
    width: 1200, height: 630, fonts: loadFonts(),
    headers: { 'cache-control': 'public, max-age=86400, s-maxage=31536000, immutable' },
  });
}

function page(url: URL, card: Card, finish: Finish) {
  const origin = url.origin;
  const title = finish === 'base' ? `${card.name} · ${TIER_NAME[card.tier]}` : `${FINISH_NAME[finish]} ${card.name} · 1 in ${ONE_IN[finish].toLocaleString('en-US')}`;
  const desc = `Pulled in Ten Deep: ${card.team}, ${card.ovr} OVR. Draft ten, sim a season, open packs.`;
  const img = `${origin}/api/pull?c=${encodeURIComponent(card.id)}&f=${finish}&img=1`;
  const to = `${origin}/card/${encodeURIComponent(card.id)}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta property="og:type" content="website"><meta property="og:site_name" content="Ten Deep">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:image" content="${esc(img)}">
<meta http-equiv="refresh" content="0;url=${esc(to)}"></head>
<body style="background:#07051A;color:#fff;font-family:sans-serif;text-align:center;padding:40px">
<img src="${esc(img)}" alt="${esc(title)}" style="max-width:100%;border-radius:16px"><p><a style="color:#FFD86B" href="${esc(to)}">Open in Ten Deep</a></p>
</body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600, s-maxage=86400' } });
}

export function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = parse(url);
  if (!parsed) return new Response('Not found', { status: 404 });
  return url.searchParams.get('img') ? image(parsed.card, parsed.finish) : page(url, parsed.card, parsed.finish);
}
