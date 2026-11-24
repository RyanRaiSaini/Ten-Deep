/**
 * Browser smoke test against the static web build.
 *   npm run build:web && node scripts/smoke.mjs [outDir]
 * Serves dist/ with SPA fallback, drives the app with Playwright, saves screenshots.
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');

const out = process.argv[2] ?? 'smoke-shots';
mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.ttf': 'font/ttf' };

const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  let file = join('dist', path);
  if (!existsSync(file) || path.endsWith('/')) file = join('dist', 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
let current = 'boot'; // tag each error with the step it happened in
page.on('pageerror', (e) => errors.push(`[${current}] ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`[${current}] ${m.text()}`));
const warnings = [];
page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text().slice(0, 160)));

const shot = (name) => page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
const step = async (name, fn) => {
  current = name;
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message.split('\n')[0]}`);
    await shot(`fail-${name}`);
    process.exitCode = 1;
  }
};

await step('first launch: welcome slides, then home', async () => {
  await page.goto(base);
  await page.getByTestId('welcome-next').click();
  await page.waitForTimeout(500); // let the slide fade in
  await shot('00-welcome');
  await page.getByTestId('welcome-next').click();
  await page.getByTestId('welcome-start').click();
  await page.getByTestId('tab-bar').waitFor();
  await page.getByTestId('mode-current').waitFor();
  await shot('01-home');
});

const flow = process.env.SMOKE_FLOW ?? 'full';
if (flow === 'full') {
  const { runFlow } = await import('./smoke-flow.mjs');
  await runFlow({ page, base, step, shot });
}

await step('how it works: reachable from the draft screen, every rule shown', async () => {
  await page.goto(base);
  await page.getByTestId('mode-current').click();
  await page.getByTestId('how-link').click();
  for (const k of ['spin', 'roster', 'cap', 'rules', 'season', 'playoffs', 'challenge']) await page.getByTestId(`how-${k}`).waitFor();
  await shot('38-how');
  if (await page.getByTestId('how-play').count()) throw new Error('start button shown while a draft is in progress');
});

await step('arabic is right-to-left', async () => {
  await page.goto(`${base}/settings`);
  await page.getByText('Language').click();
  await page.getByTestId('lang-ar').click();
  await page.goto(base);
  await page.getByText('أنماط اللعب').waitFor();
  const dir = await page.evaluate(() => document.documentElement.dir);
  if (dir !== 'rtl') throw new Error(`dir=${dir}`);
  await shot('09-home-ar');
});

if (process.env.SMOKE_WARNINGS && warnings.length) {
  const counts = {};
  for (const w of warnings) counts[w] = (counts[w] ?? 0) + 1;
  console.log('warnings:\n  ' + Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([w, n]) => `${n}× ${w}`).join('\n  '));
}
if (errors.length) {
  console.log('page errors:\n  ' + [...new Set(errors)].slice(0, 10).join('\n  '));
  process.exitCode = 1;
}
await browser.close();
server.close();
