/**
 * Renders the Ten Deep mark to every icon/splash PNG Expo needs.
 *   npx tsx scripts/make-icons.mts
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { iconSvg } from '../src/ui/iconSvg';

// Playwright is pre-installed globally, not a project dependency.
const { chromium } = createRequire(import.meta.url)('playwright');

const OUT = new URL('../assets/', import.meta.url).pathname;
const jobs: { file: string; svg: string; size: number; transparent: boolean }[] = [
  { file: 'icon.png', svg: iconSvg({ scale: 0.92 }), size: 1024, transparent: false },
  { file: 'favicon.png', svg: iconSvg({ scale: 1 }), size: 48, transparent: false },
  { file: 'splash-icon.png', svg: iconSvg({ tile: false, scale: 0.9 }), size: 1024, transparent: true },
  { file: 'android-icon-foreground.png', svg: iconSvg({ tile: false, scale: 0.62 }), size: 1024, transparent: true },
  { file: 'android-icon-monochrome.png', svg: iconSvg({ tile: false, scale: 0.62, mono: true }), size: 1024, transparent: true },
  { file: 'android-icon-background.png', svg: iconSvg({ scale: 0.0001 }), size: 1024, transparent: false },
];
// Embed Lilita One so the "10" renders in the game's display font.
const lilita = readFileSync(new URL('../node_modules/@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf', import.meta.url)).toString('base64');
const fontCss = `@font-face { font-family: 'Lilita One'; src: url(data:font/ttf;base64,${lilita}); }`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const j of jobs) {
  await page.setViewportSize({ width: j.size, height: j.size });
  const svg = j.svg.replace('width="1024" height="1024"', `width="${j.size}" height="${j.size}"`);
  await page.setContent(`<html><head><style>${fontCss}</style></head><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: OUT + j.file, omitBackground: j.transparent, clip: { x: 0, y: 0, width: j.size, height: j.size } });
  console.log('wrote', j.file);
}
await browser.close();
