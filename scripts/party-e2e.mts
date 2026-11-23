/**
 * Live Party end to end, locally: serves the web build plus api/party.ts (on an in-memory store), then two
 * browsers create and join a room, draft all ten rounds live, and check they see identical final standings.
 *   npx expo export -p web && npx tsx scripts/party-e2e.mts
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
await a.getByTestId('party-create').click();
await a.waitForURL(/\/party\/[A-Z]{5}/);
const code = a.url().split('/').pop()!;
console.log('room', code);
await b.goto(`${base}/party/${code}`);
await a.getByText('Players (2/8)').waitFor({ timeout: 15000 });
await a.screenshot({ path: `${out}/1-lobby.png` });
await a.getByTestId('room-start').click();

let taken = 0;
async function draftAll(page: typeof a, who: string) {
  for (let r = 0; r < 10; r++) {
    // Wait for this round to open (the header shows it), then pick; if someone beat us to him, pick again.
    await page.getByText(`Round ${r + 1}/10`).first().waitFor({ timeout: 30000 });
    // My pick landed: I'm locked in, or (if I was last) the next round or the season already began.
    const done = page.getByText(new RegExp(`Locked in|Everyone's in|Round ${r + 2}/10|Game \\d+ of 82|Tipping off`)).first();
    for (let attempt = 0; ; attempt++) {
      if (attempt > 6) {
        console.log(`${who} round ${r} stuck. Screen says:`, (await page.locator('body').innerText()).slice(0, 600));
        await page.screenshot({ path: `${out}/stuck-${who}-${r}.png` });
        throw new Error(`${who} could not pick in round ${r}`);
      }
      const opt = page.locator('[data-testid="party-option"], [data-testid="party-fallback"]').first();
      // A slow pick may have landed since the last check: then there are no options left to wait for.
      const ready = await Promise.race([
        opt.waitFor({ timeout: 20000 }).then(() => 'opt' as const),
        done.waitFor({ timeout: 20000 }).then(() => 'done' as const),
      ]).catch(async (e) => {
        console.log(`${who} round ${r} attempt ${attempt}: nothing to do. Screen says:`, (await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 500));
        await page.screenshot({ path: `${out}/idle-${who}-${r}.png` });
        throw e;
      });
      if (ready === 'done') break;
      await opt.click().catch(() => {});
      const choose = page.locator('[data-testid^="choose-"]').first();
      // Multi-position players open a slot chooser on the card.
      await Promise.race([done.waitFor({ timeout: 4000 }), choose.waitFor({ timeout: 4000 })]).catch(() => {});
      if (await choose.isVisible().catch(() => false)) await choose.click().catch(() => {});
      if (await done.waitFor({ timeout: 4000 }).then(() => true, () => false)) break;
      if (await page.getByText('Someone grabbed him first!').isVisible().catch(() => false)) taken++;
    }
    if (r === 2 && who === 'a') await page.screenshot({ path: `${out}/2-draft.png` });
  }
}
await Promise.all([draftAll(a, 'a'), draftAll(b, 'b')]);
await a.getByTestId('party-game').waitFor({ timeout: 30000 });
await a.waitForTimeout(6000);
await a.screenshot({ path: `${out}/3-season.png` });
for (const p of [a, b]) { await p.getByTestId('party-skip').click(); await p.getByTestId('party-results').waitFor(); }
await a.screenshot({ path: `${out}/4-results.png` });
const [ra, rb] = await Promise.all([a.getByTestId('party-results').innerText(), b.getByTestId('party-results').innerText()]);
const head = (s: string) => s.split('\n').slice(0, 6).join(' | ');
console.log('A:', head(ra));
console.log('B:', head(rb));
console.log(head(ra) === head(rb) ? 'SAME RESULTS on both phones' : 'MISMATCH');
console.log('picks lost to the other player (first come, first served):', taken);
console.log('errors', errors);
await browser.close();
server.close();
process.exit(errors.length || head(ra) !== head(rb) ? 1 : 0);
