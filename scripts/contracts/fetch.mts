/**
 * Fetch the Basketball Reference pages behind real contracts (cached; polite: one request every 4 s,
 * under their 20-per-minute limit; robots.txt allows /teams/ and /contracts/).
 *   npx tsx scripts/contracts/fetch.mts <cacheDir>
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { current2026 } from '../../src/data/current2026';
import { HISTORY } from '../../src/data/modes';
import { bbrefCode, endYear } from './teams';

const dir = process.argv[2];
mkdirSync(dir, { recursive: true });
const BASE = 'https://www.basketball-reference.com';
const jobs: { file: string; url: string }[] = [{ file: 'caphist.html', url: `${BASE}/contracts/salary-cap-history.html` }];
const cur = new Set<string>();
for (const t of current2026.teams) {
  const code = bbrefCode(t.id.split('-')[0], 2027);
  cur.add(code);
  jobs.push({ file: `con-${code}.html`, url: `${BASE}/contracts/${code}.html` });
  jobs.push({ file: `team-${code}-2027.html`, url: `${BASE}/teams/${code}/2027.html` });
}
for (const t of HISTORY) {
  if (t.season.includes('-')) continue;
  const y = endYear(t.season), code = bbrefCode(t.franchise ?? t.id.split('-')[0], y);
  jobs.push({ file: `team-${code}-${y}.html`, url: `${BASE}/teams/${code}/${y}.html` });
}
const todo = jobs.filter((j) => !existsSync(join(dir, j.file)));
console.log(`${jobs.length} pages, ${todo.length} to fetch (~${Math.ceil((todo.length * 4) / 60)} min)`);
let failed = 0;
for (const [i, j] of todo.entries()) {
  // curl, not fetch: Node's fetch ignores the sandbox's HTTPS proxy.
  const out = join(dir, j.file);
  try {
    const code = execFileSync('curl', ['-s', '-m', '40', '-A', 'Mozilla/5.0 (compatible; research script; one-time salary lookup)', '-o', out, '-w', '%{http_code}', j.url]).toString();
    if (code !== '200') {
      failed++; console.log(`HTTP ${code} ${j.url}`);
      if (existsSync(out)) unlinkSync(out);
      if (code === '429') await new Promise((ok) => setTimeout(ok, 60_000));
    } else if (statSync(out).size < 2000) { failed++; console.log(`tiny page ${j.url}`); unlinkSync(out); }
  } catch (e) { failed++; console.log(`ERR ${j.url} ${String(e).slice(0, 80)}`); }
  if ((i + 1) % 25 === 0) console.log(`${i + 1}/${todo.length}`);
  await new Promise((ok) => setTimeout(ok, 4000));
}
console.log(`done, ${failed} failed`);
