/**
 * Renders the Ten Deep mark to every icon/splash PNG Expo needs.
 *   npx tsx scripts/make-icons.mts
 */
import { createRequire } from 'node:module';
import { logoSvg } from '../src/ui/logoSvg';

// Playwright is pre-installed globally, not a project dependency.
const { chromium } = createRequire(import.meta.url)('playwright');

const OUT = new URL('../assets/', import.meta.url).pathname;
const jobs: { file: string; svg: string; size: number; transparent: boolean }[] = [
  { file: 'icon.png', svg: logoSvg({ tile: true, scale: 0.7 }), size: 1024, transparent: false },
  { file: 'favicon.png', svg: logoSvg({ tile: true, scale: 0.86 }), size: 48, transparent: false },
  { file: 'splash-icon.png', svg: logoSvg({ scale: 0.95 }), size: 1024, transparent: true },
  { file: 'android-icon-foreground.png', svg: logoSvg({ scale: 0.56 }), size: 1024, transparent: true },
  { file: 'android-icon-monochrome.png', svg: logoSvg({ scale: 0.56, mono: true }), size: 1024, transparent: true },
  { file: 'android-icon-background.png', svg: logoSvg({ tile: true, scale: 0.0001 }), size: 1024, transparent: false },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const j of jobs) {
  await page.setViewportSize({ width: j.size, height: j.size });
  const svg = j.svg.replace('width="1024" height="1024"', `width="${j.size}" height="${j.size}"`);
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({ path: OUT + j.file, omitBackground: j.transparent, clip: { x: 0, y: 0, width: j.size, height: j.size } });
  console.log('wrote', j.file);
}
await browser.close();
