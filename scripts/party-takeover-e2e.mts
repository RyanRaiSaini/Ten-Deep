/**
 * Party Takeover end to end, locally: serves the web build plus api/party.ts (on an in-memory store), then two
 * browsers create and join a Takeover room and rebuild the same team live: both go for the same player at the first
 * spot (a bidding war), then one makes moves while the other keeps. Checks both phones see the same final standings.
 *   npx expo export -p web && npx tsx scripts/party-takeover-e2e.mts
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';
import { memoryStore } from '../api/_memstore';
import * as party from '../api/party';

party.useStore(memoryStore());
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] ?? 'party-shots';
const tag = 'tk';
mkdirSync(out, { recursive: true });
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf' };

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://local');
  if (url.pathname === '/api/party') {
    const body = req.method === 'POST' ? await new Promise<string>((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => ok(b)); }) : undefined;
    const r = await (req.method === 'POST' ? party.POST : party.GET)(new Request(url, { method: req.method, body, headers: { 'content-type': 'application/json' } }));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(await r.text());
    return;
  }
  let file = join('dist', url.pathname);
  if (!existsSync(file) || url.pathname.endsWith('/')) { const h = join('dist', `${url.pathname}.html`); file = existsSync(h) ? h : join('dist', 'index.html'); }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(0);
const base = `http://localhost:${(server.address() as { port: number }).port}`;

const browser = await chromium.launch();
const errors: string[] = [];
async function player(name: string) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  page.on('pageerror', (e: Error) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m: { text(): string }) => { if (m.text().includes('party pick rejected')) console.log(name, m.text()); });
  await page.goto(base);
  await page.getByTestId('welcome-skip').click({ timeout: 15000 }).catch(() => {});
  await page.goto(`${base}/profile`);
  await page.getByTestId('profile-name').fill(name);
  return page;
}

const a = await player('Ryan');
const b = await player('Jordan');
await a.goto(`${base}/party`);
await a.getByTestId('party-create-takeover').click();
await a.waitForURL(/\/party\/[A-Z]{5}/);
const code = a.url().split('/').pop()!;
console.log('room', code);
await b.goto(`${base}/party/${code}`);
await a.getByText('Players (2/8)').waitFor({ timeout: 15000 });
await a.getByTestId('tk-lobby-team').waitFor();
await a.screenshot({ path: `${out}/${tag}-1-lobby.png` });
await a.getByTestId('room-start').click();

let wars = 0;
async function play(page: typeof a, who: 'a' | 'b') {
  for (let guard = 0; guard < 400; guard++) {
    const what = await Promise.race([
      page.getByTestId('tk-keep').waitFor({ timeout: 45000 }).then(() => 'choose' as const),
      page.getByTestId('tk-war').waitFor({ timeout: 45000 }).then(() => 'war' as const),
      page.getByTestId('party-game').waitFor({ timeout: 45000 }).then(() => 'season' as const),
    ]).catch(async (e) => {
      console.log(`${who}: nothing to do. Screen says:`, (await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 500));
      throw e;
    });
    if (what === 'season') return;
    if (what === 'war') {
      wars++;
      if (who === 'a') await page.screenshot({ path: `${out}/${tag}-3-war.png` });
      await page.getByText(/^\+1$/).click().catch(() => {});
      await page.getByTestId('tk-bid').click();
      await page.getByTestId('tk-war').waitFor({ state: 'detached', timeout: 20000 });
      continue;
    }
    const header = await page.locator('body').innerText();
    const first = /spot 1 of 10/i.test(header); // titles render in caps
    if (first && who === 'a') await page.screenshot({ path: `${out}/${tag}-2-choose.png` });
    // Spot 1: both go for the bench option (always affordable) to start a bidding war. Later: A buys bargains, B keeps.
    const pickBench = page.getByTestId('tk-pick-bench');
    const pickLow = page.getByTestId('tk-pick-low');
    if (first && (await pickBench.isEnabled().catch(() => false))) await pickBench.click();
    else if (who === 'a' && (await pickLow.isEnabled().catch(() => false))) await pickLow.click();
    else await page.getByTestId('tk-keep').click();
    await page.getByTestId('tk-keep').waitFor({ state: 'detached', timeout: 20000 });
  }
}
await Promise.all([play(a, 'a'), play(b, 'b')]);
await a.waitForTimeout(4000);
await a.screenshot({ path: `${out}/${tag}-4-season.png` });
for (const p of [a, b]) { await p.getByTestId('party-skip').click(); await p.getByTestId('party-results').waitFor(); }
await a.screenshot({ path: `${out}/${tag}-5-results.png` });
const [ra, rb] = await Promise.all([a.getByTestId('party-results').innerText(), b.getByTestId('party-results').innerText()]);
const head = (s: string) => s.split('\n').slice(0, 6).join(' | ');
console.log('A:', head(ra));
console.log('B:', head(rb));
console.log(head(ra) === head(rb) ? 'SAME RESULTS on both phones' : 'MISMATCH');
console.log('bidding wars seen:', wars);
console.log('errors', errors);
await browser.close();
server.close();
process.exit(errors.length || head(ra) !== head(rb) || wars < 2 ? 1 : 0);
