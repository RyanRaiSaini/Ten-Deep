/**
 * Screenshots of chosen screens for design review.
 *   node scripts/shots.mjs <outDir> <phone|laptop> <route,route,...>
 * Routes are paths ("/", "/collection"); "draft" starts a Current Day draft and spins once;
 * "season" drafts ten and starts the season. Needs a web build in dist/.
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const [out = 'shots', size = 'phone', list = '/'] = process.argv.slice(2);
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

const viewport = size === 'laptop' ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(base);
await page.getByTestId('welcome-skip').click({ timeout: 10000 }).catch(() => {});
await page.waitForTimeout(400);

const draftTen = async () => {
  await page.goto(base);
  await page.getByTestId('mode-current').click();
  for (let i = 0; i < 10; i++) {
    await page.getByTestId('spin').click();
    await page.locator('[data-testid="option"], [data-testid="fallback"], [data-testid="respin"]').first().waitFor({ timeout: 15000 });
    if (!(await page.locator('[data-testid="option"]:not([aria-disabled="true"])').count()) && (await page.getByTestId('respin').count())) {
      await page.getByTestId('respin').click();
      await page.locator('[data-testid="option"], [data-testid="fallback"]').first().waitFor({ timeout: 15000 });
    }
    if (i === 0) await page.screenshot({ path: `${out}/${size}-draft.png` });
    const opt = page.locator('[data-testid="option"]:not([aria-disabled="true"])');
    if (await opt.count()) await opt.first().click();
    else await page.getByTestId('fallback').click();
    const choose = page.locator('[data-testid^="choose-"]');
    if (await choose.count()) await choose.first().click();
    if (i === 4) await page.screenshot({ path: `${out}/${size}-draft-mid.png` });
  }
};

for (const r of list.split(',')) {
  const name = r === '/' ? 'home' : r.replace(/^\//, '').replace(/\//g, '-');
  try {
    if (r === 'draft') {
      await draftTen();
      await page.screenshot({ path: `${out}/${size}-draft-full.png` });
      continue;
    }
    await page.goto(base + r);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${out}/${size}-${name}.png` });
  } catch (e) {
    console.log(`FAIL ${r}: ${e.message.split('\n')[0]}`);
  }
}
if (errors.length) console.log('page errors:', [...new Set(errors)].slice(0, 5).join(' | '));
await browser.close();
server.close();
console.log('done');
