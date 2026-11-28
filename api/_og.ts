/**
 * What the two share images (api/pull.ts, api/run.ts) have in common: the Arena Night look (a dark arena with
 * spotlights and a hardwood floor, the app's own colors), the ball-and-wordmark, the fonts, and @vercel/og loading.
 * Files starting with "_" in api/ are not deployed as functions; vercel.json ships the font files with each image function.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ImageResponse as OgImageResponse } from '@vercel/og';

export type El = { type: string; props: Record<string, unknown> };
/** A flex box. Satori takes React-element-shaped objects; this keeps the files plain .ts (no JSX). */
export const h = (style: Record<string, unknown>, ...children: unknown[]): El =>
  ({ type: 'div', props: { style: { display: 'flex', ...style }, children: children.length === 1 ? children[0] : children } });
const el = (type: string, props: Record<string, unknown>): El => ({ type, props });

/** The app's Arena Night colors (src/ui/theme.ts). */
export const ARENA = {
  bg: '#0B0F17', surface: '#151B26', surface2: '#1E2633', line: '#2A3444', edge: '#070A10',
  text: '#F2F4F8', soft: '#C8D0DC', muted: '#9AA6B8', accent: '#FFB547', orange: '#FF7417', win: '#3DDC97', loss: '#FF6B5E',
} as const;

/**
 * @vercel/og is ESM-only, but Vercel compiles these functions to CommonJS, where a static import becomes require()
 * and crashes. A real import() (kept out of the compiler's reach) loads it; vercel.json ships its files.
 */
const esmImport = new Function('u', 'return import(u)') as (u: string) => Promise<{ ImageResponse: typeof OgImageResponse }>;
let og: Promise<{ ImageResponse: typeof OgImageResponse }> | null = null;
export const loadOg = () => (og ??= esmImport(pathToFileURL(join(process.cwd(), 'node_modules/@vercel/og/dist/index.node.js')).href));

/** Display: the sticker face (logo, ratings, names). Cond: the scoreboard face (titles, records). Body: everything else. */
export const FONT_FILES = {
  Display: '@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf',
  Cond: '@expo-google-fonts/barlow-condensed/800ExtraBold/BarlowCondensed_800ExtraBold.ttf',
  Body: '@expo-google-fonts/barlow/600SemiBold/Barlow_600SemiBold.ttf',
} as const;
type Font = { name: string; data: ArrayBuffer; weight: 400 | 600 | 800; style: 'normal' };
const WEIGHT: Record<keyof typeof FONT_FILES, Font['weight']> = { Display: 400, Cond: 800, Body: 600 };
let fonts: Font[] | null = null;
export function loadFonts(): Font[] {
  if (fonts) return fonts;
  const read = (p: string) => { const b = readFileSync(join(process.cwd(), 'node_modules', p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; };
  fonts = (Object.keys(FONT_FILES) as (keyof typeof FONT_FILES)[]).map((name) => ({ name, data: read(FONT_FILES[name]), weight: WEIGHT[name], style: 'normal' }));
  return fonts;
}

/** The ball from the app's logo. */
export const ball = (size: number): El => el('svg', {
  width: size, height: size, viewBox: '0 0 40 40',
  children: [
    el('circle', { cx: 20, cy: 20, r: 17, fill: ARENA.orange, stroke: ARENA.bg, strokeWidth: 2.5 }),
    el('path', { d: 'M3 20h34M20 3v34M8 8c6 6 6 18 0 24M32 8c-6 6-6 18 0 24', fill: 'none', stroke: ARENA.bg, strokeWidth: 2.5 }),
  ],
});

/** The wordmark: the ball, then TEN DEEP in white with the orange drop. */
export const wordmark = (size: number): El =>
  h({ alignItems: 'center', gap: Math.round(size * 0.3) },
    ball(Math.round(size * 1.1)),
    h({ fontFamily: 'Display', fontSize: size, color: '#FFFFFF', letterSpacing: 1, textShadow: `${Math.round(size * 0.07)}px ${Math.round(size * 0.07)}px 0 ${ARENA.orange}` }, 'TEN DEEP'));

/**
 * The arena behind a card: a glow in `glow` from the top, two spotlight beams, and (with `floor`) the hardwood
 * with its center-circle arc along the bottom. Absolute layers: put them first in a relative 1200×630 root.
 */
export function arena(glow: string, floor = false): El[] {
  const beam = (left: number, deg: number) => h({
    position: 'absolute', top: -160, left, width: 190, height: 980, transform: `rotate(${deg}deg)`,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0) 85%)',
  });
  const layers: El[] = [
    h({ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, backgroundImage: `radial-gradient(circle at 50% 0%, ${glow}66 0%, ${glow}1F 32%, ${ARENA.bg} 70%)` }),
    beam(130, -22),
    beam(880, 22),
  ];
  if (floor) {
    layers.push(
      h({ position: 'absolute', left: 0, bottom: 0, width: 1200, height: 64, backgroundImage: 'linear-gradient(180deg, #7A4A22 0%, #3A2210 100%)', borderTop: '3px solid rgba(242,211,168,0.55)' }),
      h({ position: 'absolute', left: 420, bottom: -120, width: 360, height: 180, borderRadius: 999, border: '3px solid rgba(242,211,168,0.45)' }),
    );
  }
  return layers;
}
