#!/usr/bin/env python3
"""Birth country of every player on the cached Basketball-Reference team pages (the roster table flag).
    python3 scripts/rosters/nations_extract.py <teamPagesDir> <out.json>
"""
import json, os, re, sys, unicodedata
D = sys.argv[1]
OUT = sys.argv[2]
def norm(n):
    n = unicodedata.normalize('NFKD', n).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z]', '', n)
people = {}  # bbref id -> {name, country, seasons: [(year, team)]}
for f in sorted(os.listdir(D)):
    m = re.match(r'team-([A-Z]{3})-(\d{4})\.html$', f)
    if not m: continue
    team, year = m.group(1), int(m.group(2))
    s = open(os.path.join(D, f), encoding='utf-8', errors='ignore').read()
    i = s.find('id="roster"')
    if i < 0: continue
    j = s.find('</table>', i)
    for row in re.findall(r'<tr[^>]*>(.*?)</tr>', s[i:j], re.S):
        pm = re.search(r'data-stat="player"[^>]*>\s*<a href=["\']/players/./([a-z0-9]+)\.html["\']>([^<]+)</a>', row)
        if not pm: continue
        fm = re.search(r'data-stat="flag"\s*>(?:<span class="f-i f-([a-z]{2})")?', row)
        code = fm.group(1) if fm and fm.group(1) else None
        pid, name = pm.group(1), pm.group(2)
        p = people.setdefault(pid, {'name': name, 'country': code, 'seasons': []})
        if code and not p['country']: p['country'] = code
        p['seasons'].append([year, team])
json.dump(people, open(OUT, 'w'))
codes = {}
for p in people.values(): codes[p['country']] = codes.get(p['country'], 0) + 1
print(len(people), 'people;', sum(v for k, v in codes.items() if k and k != 'us'), 'born outside the US;', codes.get(None, 0), 'unknown', file=sys.stderr)
print(sorted(((v, k) for k, v in codes.items() if k), reverse=True)[:25], file=sys.stderr)
