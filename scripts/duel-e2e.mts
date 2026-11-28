/**
 * Friend challenges end to end, locally: serves the web build plus api/pin.ts and api/duel.ts (on in-memory
 * storage), then two browsers become friends, challenge each other and check they both see the same face-off.
 *   npx expo export -p web && npx tsx scripts/duel-e2e.mts [outDir]
 * Covers: adding by PIN makes the friendship two-way, a Card Clash challenge (send, incoming badge, accept, both
 * sides see the same series and records), a Draft Duel (both draft the same spins, then a best-of-7), a decline.
 */
import { createServer, type IncomingMessage } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';
import { memoryJsonStore, useJsonStore as setJsonStore } from '../api/_jsonstore';
import { memoryCounter, useCounter as setCounter } from '../api/_ratelimit';
import * as pinApi from '../api/pin';
import * as duelApi from '../api/duel';

setJsonStore(memoryJsonStore());
setCounter(memoryCounter());
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] ?? 'duel-shots';
mkdirSync(out, { recursive: true });
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
const SECURITY = Object.fromEntries((JSON.parse(readFileSync('vercel.json', 'utf8')).headers[0].headers as { key: string; value: string }[])
  .map((h) => [h.key, h.value.replace(/;\s*upgrade-insecure-requests/, '')]));
const API: Record<string, { GET?: (r: Request) => Promise<Response>; POST?: (r: Request) => Promise<Response> }> = { '/api/pin': pinApi, '/api/duel': duelApi };
const bodyOf = (req: IncomingMessage) => new Promise<string>((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => ok(b)); });

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://local');
  const api = API[url.pathname];
  if (api) {
    const fn = req.method === 'POST' ? api.POST : api.GET;
    if (!fn) { res.writeHead(405); res.end(); return; }
    const body = req.method === 'POST' ? await bodyOf(req) : undefined;
    const r = await fn(new Request(url, { method: req.method, body, headers: { 'content-type': 'application/json' } }));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(await r.text());
    return;
  }
  if (url.pathname.startsWith('/api/')) { res.writeHead(204); res.end(); return; }
  let file = join('dist', url.pathname);
  if (!existsSync(file) || url.pathname.endsWith('/')) file = join('dist', 'index.html');
  res.writeHead(200, { ...SECURITY, 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(0);
const base = `http://localhost:${(server.address() as { port: number }).port}`;

const browser = await chromium.launch();
const errors: string[] = [];
type Page = Awaited<ReturnType<Awaited<ReturnType<typeof browser.newContext>>['newPage']>>;
async function player(name: string): Promise<Page> {
  const page: Page = await (await browser.newContext({ viewport: { width: 420, height: 900 } })).newPage();
  page.on('pageerror', (e: Error) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m: { type(): string; text(): string }) => { if (m.type() === 'error' && !/Failed to load resource.*(404|204)/.test(m.text())) errors.push(`${name} console: ${m.text().slice(0, 200)}`); });
  await page.goto(base);
  await page.getByTestId('welcome-skip').click({ timeout: 15000 });
  await page.goto(`${base}/profile`);
  await page.getByTestId('profile-name').fill(name);
  await page.goto(`${base}/duel`);
  await page.getByTestId('my-pin').waitFor();
  return page;
}
const pinOf = async (p: Page) => ((await p.getByTestId('my-pin').innerText()).match(/([A-Z2-9]{3})-([A-Z2-9]{3})/) ?? []).slice(1).join('');
let failed = false;
const step = async (label: string, fn: () => Promise<void>) => {
  try { await fn(); console.log(`ok   ${label}`); } catch (e) { failed = true; console.log(`FAIL ${label}: ${(e as Error).message.split('\n')[0]}`); }
};
/** Draft all ten on the duel draft screen: the first affordable player each spin, his first open spot. */
async function draftTen(p: Page) {
  for (let i = 0; i < 40 && !(await p.getByTestId('vs-draft-done').count()); i++) {
    const opt = p.getByTestId('vs-option').first();
    const any = p.locator('[data-testid="vs-option"], [data-testid="vs-fallback"], [data-testid="vs-draft-done"]').first();
    await any.waitFor({ timeout: 8000 });
    if (await p.getByTestId('vs-draft-done').count()) break;
    if (await opt.count()) {
      const before = await p.getByTestId('vs-spin-team').textContent();
      await opt.click();
      // Two or more open spots for him: pick the first one the board highlights.
      if ((await p.getByTestId('vs-spin-team').count()) && (await p.getByTestId('vs-spin-team').textContent()) === before && !(await p.getByTestId('vs-draft-done').count())) {
        for (const slot of ['PG', 'SG', 'SF', 'PF', 'C', 'B1', 'B2', 'B3', 'B4', 'B5']) {
          await p.getByTestId(`slot-${slot}`).last().click().catch(() => undefined);
          if (!(await p.getByText(/Where does he play/).count())) break;
        }
      }
    } else await p.getByTestId('vs-fallback').click();
    await p.waitForTimeout(150);
  }
}
/** The face-off's final line, after skipping to the end. */
async function finalLine(p: Page) {
  if (await p.getByTestId('vs-sim').count()) await p.getByTestId('vs-sim').click();
  await p.getByTestId('vs-winner').waitFor({ timeout: 20000 });
  const games: string[] = await p.locator('[data-testid^="vs-game-"]').allInnerTexts();
  return { winner: (await p.getByTestId('vs-winner').innerText()).replace(/\s+/g, ' ').trim(), games: games.map((g: string) => g.replace(/\s+/g, ' ').trim()) };
}
const mirror = (g: string) => { const m = g.match(/^G(\d+) (\d+) – (\d+)/); return m ? `G${m[1]} ${m[3]} – ${m[2]}` : g; };

const a = await player('Ryan');
const b = await player('Jordan');
const pinA = await pinOf(a);
const pinB = await pinOf(b);
console.log('pins', pinA, pinB);

await step('adding by PIN works both ways: Jordan adds Ryan, Ryan gets Jordan too', async () => {
  await b.getByTestId('add-friend').click();
  await b.getByTestId('friend-pin').fill(pinA);
  await b.getByTestId('friend-pin-add').click();
  await b.waitForURL(/friends\/[A-Z2-9]{6}/);
  await a.goto(`${base}/duel`);
  await a.getByTestId(`friend-${pinB}`).waitFor({ timeout: 15000 });
});

let clashId = '';
await step('Ryan challenges Jordan to a Card Clash (best of 3) from the challenge page', async () => {
  await a.getByTestId('to-challenge').click();
  await a.getByTestId(`pick-${pinB}`).click();
  await a.getByTestId('format-clash').click();
  await a.getByText('Best of 3').click();
  await a.screenshot({ path: `${out}/1-challenge-page.png`, fullPage: true });
  await a.getByTestId('challenge-send').click();
  await a.waitForURL(/\/vs\/[a-z2-9]{10}/);
  clashId = a.url().split('/').pop()!;
  await a.getByTestId('vs-waiting').waitFor();
  await a.screenshot({ path: `${out}/2-waiting.png`, fullPage: true });
});

await step('Jordan sees it waiting on the Duels tab (badge + incoming row), accepts, and they face off', async () => {
  await b.goto(`${base}/duel`);
  await b.getByTestId(`challenge-${clashId}`).waitFor({ timeout: 15000 });
  await b.getByTestId('tab-duels-badge').waitFor();
  await b.screenshot({ path: `${out}/3-incoming.png`, fullPage: true });
  await b.getByTestId(`challenge-${clashId}`).click();
  await b.getByTestId('vs-incoming').waitFor();
  await b.screenshot({ path: `${out}/4-accept.png`, fullPage: true });
  await b.getByTestId('vs-accept').click();
  await b.getByTestId('vs-next').waitFor();
  await b.getByTestId('vs-next').click();
  await b.getByTestId('vs-game-0').waitFor();
});

await step('both see the same series: one wins, the other loses, every score mirrored, records updated on both sides', async () => {
  const jb = await finalLine(b);
  await b.screenshot({ path: `${out}/5-result-jordan.png`, fullPage: true });
  // Ryan never left the waiting screen: it picks the result up by itself.
  await a.getByTestId('vs-next').waitFor({ timeout: 20000 });
  const ra = await finalLine(a);
  await a.screenshot({ path: `${out}/6-result-ryan.png`, fullPage: true });
  console.log('   Ryan sees:', ra.winner, ra.games.join(' | '));
  console.log('   Jordan sees:', jb.winner, jb.games.join(' | '));
  const ryanWon = /^You win/.test(ra.winner);
  if (ryanWon === /^You win/.test(jb.winner)) throw new Error('both sides claim the same outcome');
  if (!ryanWon && !ra.winner.includes('Jordan')) throw new Error(`Ryan's loss doesn't name Jordan: ${ra.winner}`);
  if (JSON.stringify(ra.games) !== JSON.stringify(jb.games.map(mirror))) throw new Error('the games differ between the two sides');
  for (const [p, friendPin, w] of [[a, pinB, ryanWon], [b, pinA, !ryanWon]] as const) {
    await p.goto(`${base}/duel`);
    const rec = (await p.getByTestId(`friend-${friendPin}`).innerText()).replace(/\s+/g, '');
    if (!rec.includes(w ? '1-0' : '0-1')) throw new Error(`record not updated: ${rec}`);
  }
});

let draftId = '';
await step('Jordan challenges Ryan to a Draft Duel: drafts ten first, then it goes out', async () => {
  await b.goto(`${base}/challenge?to=${pinA}`);
  await b.getByTestId('format-draft').click();
  await b.getByTestId('challenge-send').click();
  await b.waitForURL(/\/vs\/draft/);
  await draftTen(b);
  await b.screenshot({ path: `${out}/7-draft-jordan.png`, fullPage: true });
  await b.getByTestId('vs-draft-done').click();
  await b.waitForURL(/\/vs\/[a-z2-9]{10}/);
  draftId = b.url().split('/').pop()!;
  await b.getByTestId('vs-waiting').waitFor();
});

await step('Ryan accepts, drafts the same spins, and the two drafted teams play a best-of-7 both see', async () => {
  await a.goto(`${base}/duel`);
  await a.getByTestId(`challenge-${draftId}`).waitFor({ timeout: 20000 });
  await a.getByTestId(`challenge-${draftId}`).click();
  await a.getByTestId('vs-accept').click();
  await a.waitForURL(/\/vs\/draft/);
  const first = await a.getByTestId('vs-spin-team').textContent();
  await draftTen(a);
  await a.getByTestId('vs-draft-done').click();
  await a.waitForURL(new RegExp(`/vs/${draftId}`));
  const ra = await finalLine(a);
  const four = ra.games.filter((g: string) => g).length;
  if (four < 4 || four > 7) throw new Error(`a best-of-7 had ${four} games`);
  await b.getByTestId('vs-next').waitFor({ timeout: 20000 });
  const jb = await finalLine(b);
  await a.screenshot({ path: `${out}/8-draft-result.png`, fullPage: true });
  console.log('   first spin for Ryan:', first, '| Ryan sees:', ra.winner, '| Jordan sees:', jb.winner);
  if (JSON.stringify(ra.games) !== JSON.stringify(jb.games.map(mirror))) throw new Error('the draft duel games differ between the two sides');
});

await step('a declined challenge shows as declined to the challenger', async () => {
  await a.goto(`${base}/challenge?to=${pinB}&mode=clash`);
  await a.getByTestId('challenge-send').click();
  await a.waitForURL(/\/vs\/[a-z2-9]{10}/);
  const id = a.url().split('/').pop()!;
  await b.goto(`${base}/vs/${id}`);
  await b.getByTestId('vs-decline').click();
  await b.getByTestId('vs-declined').waitFor();
  await a.getByTestId('vs-declined').waitFor({ timeout: 20000 });
});

console.log(errors.length ? `\npage errors:\n${errors.join('\n')}` : '\nno page errors');
await browser.close();
server.close();
process.exit(failed || errors.length ? 1 : 0);
