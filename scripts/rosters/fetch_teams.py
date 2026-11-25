#!/usr/bin/env python3
"""
Fetch every team-season page (its roster and salary table) for the seasons in the stats cache, politely:
one request every 4 s, under Basketball Reference's 20-per-minute limit. Cached; safe to rerun.
    python3 scripts/rosters/fetch_teams.py <statsCacheDir> <teamCacheDir>
"""
import os, re, subprocess, sys, time

stats, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
jobs = []
for f in sorted(os.listdir(stats)):
    m = re.match(r'per_game-(\d{4})\.html$', f)
    if not m: continue
    y = int(m.group(1))
    codes = set(re.findall(r'href="/teams/([A-Z]{3})/%d\.html"' % y, open(os.path.join(stats, f), encoding='utf-8').read()))
    jobs += [(c, y) for c in sorted(codes)]
todo = [(c, y) for c, y in jobs if not os.path.exists(os.path.join(out, f'team-{c}-{y}.html'))]
print(f'{len(jobs)} team-seasons, {len(todo)} to fetch (~{len(todo) * 4 // 60} min)', flush=True)
failed = 0
for i, (c, y) in enumerate(todo):
    path = os.path.join(out, f'team-{c}-{y}.html')
    code = subprocess.run(['curl', '-s', '-m', '60', '-A', 'Mozilla/5.0 (compatible; research script; one-time salary lookup)',
                           '-o', path, '-w', '%{http_code}', f'https://www.basketball-reference.com/teams/{c}/{y}.html'],
                          capture_output=True, text=True).stdout
    if code != '200' or os.path.getsize(path) < 2000:
        failed += 1
        print(f'HTTP {code} {c} {y}', flush=True)
        if os.path.exists(path): os.remove(path)
        if code == '429': time.sleep(60)
    if (i + 1) % 50 == 0: print(f'{i + 1}/{len(todo)}', flush=True)
    time.sleep(4)
print(f'done, {failed} failed', flush=True)
