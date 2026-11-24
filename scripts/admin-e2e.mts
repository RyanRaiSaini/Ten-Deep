/**
 * End-to-end check of the private outreach admin against the real web build, with the API handlers running
 * locally on an in-memory store and a stand-in AI (no network, nothing sent anywhere).
 *   npx expo export -p web && npx tsx scripts/admin-e2e.mts [outDir]
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';
import { memoryOutreachStore } from '../api/_outreachstore';
import { makeHandler } from '../api/admin';
import { makeTrack } from '../api/track';

const KEY = 'e2e-admin-key-0123456789abcdef';
const store = memoryOutreachStore();
const prompts: string[] = [];
const admin = makeHandler({
  store, adminKey: () => KEY, probe: async () => 200,
  ai: async (_system, user) => {
    prompts.push(user);
    return JSON.stringify({
      subject: 'A basketball draft game',
      text: "Hi Sam,\n\nI'm Ryan, a math student at Waterloo, and I built a basketball game called Ten Deep. Your rebuild-from-one-random-season series seemed like a fit: you spin a team-season, draft ten players under a $200M cap where everyone costs his real contract, then sim 82 games and the playoffs.\n\nWould you try one draft and tell me what feels off? If it ever fits a video, great, but feedback is the main thing.\n\nLINK",
      basis: { fact: 'Series rebuilding a team from one random season', relevance: 'Same spin-a-season loop', ask: 'Try one draft, share what feels off' },
    }).replace('LINK', /Game link to use exactly: (\S+)/.exec(user)?.[1] ?? '');
  },
});
const track = makeTrack(store, 0);

const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] ?? 'admin-shots';
mkdirSync(out, { recursive: true });
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf', '.jpg': 'image/jpeg' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://local');
  const fn = url.pathname === '/api/admin' ? admin : url.pathname === '/api/track' ? track : null;
  if (fn) {
    const body = await new Promise<string>((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => ok(b)); });
    const headers = new Headers({ 'content-type': 'application/json' });
    if (req.headers['x-admin-key']) headers.set('x-admin-key', String(req.headers['x-admin-key']));
    const r = await fn(new Request(url, { method: 'POST', body, headers }));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(await r.text());
    return;
  }
  let file = join('dist', url.pathname);
  if (!existsSync(file) || url.pathname.endsWith('/')) file = join('dist', 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(0);
const base = `http://localhost:${(server.address() as { port: number }).port}`;

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errors: string[] = [];
page.on('pageerror', (e: Error) => errors.push(e.message));
let failed = 0;
const step = async (name: string, fn: () => Promise<void>) => {
  try { await fn(); console.log('ok  ', name); } catch (e) { failed++; console.log('FAIL', name, '\n     ', (e as Error).message.split('\n')[0]); await page.screenshot({ path: `${out}/fail-${failed}.png` }); }
};
const shot = (n: string) => page.screenshot({ path: `${out}/${n}.png`, fullPage: true });
const db = async () => (await store.readDb())!;

await step('the admin is locked; a wrong key is refused and shows nothing', async () => {
  await page.goto(`${base}/admin`);
  await page.getByTestId('admin-key').fill('x'.repeat(30));
  await page.getByTestId('admin-unlock').click();
  await page.getByTestId('admin-error').getByText('That admin key is not right.').waitFor();
  if (await page.getByTestId('admin-tabs').count()) throw new Error('dashboard visible with a wrong key');
});

await step('the right key opens the workspace', async () => {
  await page.getByTestId('admin-key').fill(KEY);
  await page.getByTestId('admin-unlock').click();
  await page.getByTestId('admin-tabs').waitFor();
  await shot('01-contacts-empty');
});

const CSV = [
  'name,channel,platform,profile_url,email,email_source_url,source_url,checked_on,category,status,notes,content_example,content_source_url',
  'Sam Lee,Hoops Lab,YouTube,https://www.youtube.com/@hoopslab-e2e,biz@hoopslab.example,https://www.youtube.com/@hoopslab-e2e/about,https://www.youtube.com/@hoopslab-e2e,2026-11-24,Basketball gaming,Ready to draft,,A series rebuilding a team from one random season,https://www.youtube.com/watch?v=e2e',
  'Sam Lee (dup),Hoops Lab,YouTube,youtube.com/@HoopsLab-E2E/,,,,,,,',
  'Jo Park,Box Score Pod,Podcast,https://pod.example/boxscore,jo@pod.example,,,,Podcast / analyst / journalist,,',
].join('\n');

await step('CSV import: in-file duplicate merged, email without a source kept out', async () => {
  await page.getByTestId('csv-input').fill(CSV);
  await page.getByTestId('csv-import').click();
  await page.getByTestId('csv-result').getByText('2 added, 1 matched existing contacts, 0 skipped.').waitFor();
  const d = await db();
  if (d.contacts.length !== 2) throw new Error(`${d.contacts.length} contacts`);
  if (d.contacts.find((c) => c.name === 'Jo Park')!.email !== '') throw new Error('unverified email was stored');
});

await step('importing the same file again adds nobody', async () => {
  await page.getByTestId('csv-import').click();
  await page.getByTestId('csv-result').getByText('0 added, 3 matched existing contacts, 0 skipped.').waitFor();
  if ((await db()).contacts.length !== 2) throw new Error('duplicates created');
  await shot('02-contacts-imported');
});

await step('a campaign with its own link code', async () => {
  await page.getByText('Campaigns', { exact: true }).click();
  await page.getByTestId('campaign-name').fill('Early feedback from basketball creators');
  await page.getByTestId('campaign-create').click();
  await page.waitForURL(/\/admin\/campaign\//);
  await page.getByText('Add a contact').waitFor();
  await page.getByText('Sam Lee', { exact: true }).click();
  await page.getByText(/early-feedback-f-[a-z0-9]{4}-[a-z0-9]{4}/).first().waitFor();
  await shot('03-campaign');
});

await step('research: an email needs its public source', async () => {
  await page.goto(`${base}/admin`);
  await page.getByTestId('admin-tabs').waitFor();
  await page.getByText('Jo Park', { exact: true }).click();
  await page.getByTestId('f-email').fill('jo@pod.example');
  await page.getByTestId('research-save').click();
  await page.getByTestId('research-msg').getByText(/public page where this email is listed/).waitFor();
});

await step('AI first draft for Sam: research beside it, checks pass, unsaved until saved', async () => {
  await page.goto(`${base}/admin`);
  await page.getByText('Sam Lee', { exact: true }).click();
  await page.getByTestId('draft-new-first').click();
  await page.getByTestId('draft-ai').click();
  await page.getByTestId('draft-info').getByText(/not saved yet/).waitFor();
  const text = await page.getByTestId('draft-text').inputValue();
  if (!/\?c=early-feedback-f-/.test(text)) throw new Error('personal campaign link missing from draft');
  if (!prompts[0].includes('Documented connection: none')) throw new Error('brief did not forbid familiarity');
  await page.getByTestId('draft-check-links').click();
  await page.getByTestId('draft-checks').getByText('OK: All checks pass.').waitFor({ timeout: 5000 });
  await page.getByTestId('draft-save').click();
  await page.getByText(/AI: first draft/).waitFor();
  const d = await db();
  if (d.drafts[0].state !== 'draft' || d.messages.length !== 0) throw new Error('draft not kept unsent');
  if (d.contacts.find((c) => c.name === 'Sam Lee')!.status !== 'Draft ready') throw new Error('status not Draft ready');
  await shot('04-draft');
});

await step('invented familiarity is flagged before saving', async () => {
  const t = await page.getByTestId('draft-text').inputValue();
  await page.getByTestId('draft-text').fill(t.replace('Your rebuild', "I've been watching your videos for years. Your rebuild"));
  await page.getByTestId('draft-checks').getByText(/personal connection .* isn't documented/).waitFor();
  await page.getByTestId('draft-text').fill(t);
});

await step('mark as sent (after sending it yourself) logs it and sets Contacted', async () => {
  await page.getByTestId('draft-mark-sent').click();
  await page.getByText(/Read-only/).waitFor();
  const d = await db();
  const sam = d.contacts.find((c) => c.name === 'Sam Lee')!;
  if (sam.status !== 'Contacted' || d.messages.filter((m) => m.direction === 'out').length !== 1) throw new Error('not logged');
});

await step('their reply: intents shown, reply draft must answer their question', async () => {
  await page.getByTestId('thread-body').fill('Looks fun, thanks. Does it work on phones? I would rather keep this over email.');
  await page.getByTestId('thread-add').click();
  await page.getByTestId('thread-message').nth(1).getByText('prefers-email').waitFor();
  await page.goto(`${base}/admin`);
  await page.getByText('Follow-ups', { exact: true }).click();
  await page.getByText('Reply needed', { exact: true }).waitFor();
  if (await page.getByText('Follow-up', { exact: true }).count()) throw new Error('follow-up suggested while they wait for a reply');
  await page.getByText('Open contact').click();
  await page.getByTestId('draft-new-reply').click();
  await page.getByTestId('draft-text').fill('Hi Sam, want to hop on a call next week?');
  await page.getByTestId('draft-checks').getByText(/Their question may be unanswered/).waitFor();
  await page.getByTestId('draft-checks').getByText(/keep it to email/).waitFor();
  await page.getByTestId('draft-text').fill('Hi Sam, thanks. Yes, it works on phones in the browser, nothing to download. Email is perfect.');
  await page.getByTestId('draft-checks').getByText('OK: All checks pass.').waitFor();
  await shot('05-reply');
});

await step('a decline stops follow-ups and drafting', async () => {
  await page.getByTestId('thread-body').fill('Thanks, but this is not a fit for my channel.');
  await page.getByTestId('thread-add').click();
  await page.getByText('decline', { exact: true }).waitFor();
  await page.getByText('Set status to "Declined"').click();
  await page.getByText(/is marked "Declined"/).first().waitFor();
  const d = await db();
  if (d.contacts.find((c) => c.name === 'Sam Lee')!.status !== 'Declined') throw new Error('not declined');
  await page.goto(`${base}/admin`);
  await page.getByText('Follow-ups', { exact: true }).click();
  await page.getByText('Nothing due.').waitFor();
});

await step('campaign link visits are recorded once per visitor; report shows denominators', async () => {
  const d = await db();
  const code = d.contacts.find((c) => c.name === 'Sam Lee')!.links[d.campaigns[0].id];
  const visitor = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await visitor.goto(`${base}/?c=${code}`);
  await visitor.waitForTimeout(2500);
  await visitor.goto(`${base}/?c=${code}`);
  await visitor.waitForTimeout(1500);
  const events = [...store.events];
  if (events.filter((e) => e.endsWith('/visit/' + e.split('/').pop())).length !== 1) throw new Error(`visit events: ${events.join(', ')}`);
  await page.getByText('Report', { exact: true }).click();
  await page.getByText('Refresh website numbers').click();
  await page.getByText('Started a draft: 0 drafts started / 1 campaign visitors = 0%').waitFor();
  await page.getByText('0 replied / 1 messaged = 0%', { exact: false }).or(page.getByText('1 replied / 1 messaged = 100%')).first().waitFor();
  await page.getByText('Email opens: unknown (not tracked).').waitFor();
  await shot('06-report');
});

await step('nothing private is in the public bundle', async () => {
  const js = readFileSync(join('dist', 'index.html'), 'utf8');
  if (js.includes('hoopslab')) throw new Error('contact data in index.html');
});

console.log(errors.length ? `page errors: ${errors.join(' | ')}` : 'no page errors');
await browser.close();
server.close();
process.exit(failed || errors.length ? 1 : 0);
