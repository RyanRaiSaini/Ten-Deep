#!/usr/bin/env python3
"""
Ratings review for 1957-58 to 1982-83 (the classic formula): each season's top ten, plus every rating that
disagrees with that season's real honors, for the owner to skim.
    python3 scripts/rosters/review_classic.py <bbrefCacheDir> [out.md] [known.json]
Flags: an MVP winner under 93, an MVP top-3 under 90, All-NBA First Team under 89, an All-Star under 80, and a
90+ rating with no All-Star or All-NBA selection that season. Hand-set ratings are marked (they were never changed
by the formula).
"""
import json
import os
import re
import sys

sys.argv = [sys.argv[0], sys.argv[1], '-'] + sys.argv[2:]
CACHE = sys.argv[1]
REPORT = sys.argv[3] if len(sys.argv) > 3 else 'docs/ratings-review/classic-1958-1983.md'
exec(open(os.path.join(os.path.dirname(__file__), 'build.py')).read().split('def main')[0])  # season(), norm(), num()

# Hand-set ratings by season (scripts/rosters/export-known.mts output), and the stats site's other names for players.
KNOWN = sys.argv[4] if len(sys.argv) > 4 else None
HAND = set()
if KNOWN:
    for t in json.load(open(KNOWN)):
        if '-' not in t['season']:
            for pl in t['players']: HAND.add((int(t['season']), norm(pl['name'])))
ALIAS = {'tinyarchibald': 'natearchibald', 'hotrodhundley': 'rodhundley', 'embryant': 'emmettebryant', 'buckybockhorn': 'arlenbockhorn',
         'dannyschayes': 'danschayes', 'garheard': 'garfieldheard', 'chuckshare': 'charlieshare'}


def roster(y):
    src = open(f'src/data/history/full/{y}.ts', encoding='utf-8').read()
    out = []
    for m in re.finditer(r'^  \["([^"]+)", "([^"]*)", "([^"]*)", \[[^\]]*\], (".*")\],$', src, re.M):
        for line in json.loads(m.group(4)).split('\n'):
            f = line.split('|')
            out.append({'name': f[0], 'pos': f[1], 'ovr': int(f[2]), 'team': f'{m.group(2)} {m.group(3)}'})
    return out


def honors(r):
    aw = [a.strip() for a in (r.get('awards') or '').split(',') if a.strip()]
    mvp = next((int(a[4:]) for a in aw if re.fullmatch(r'MVP-\d+', a)), None)
    return {'mvp': mvp, 'star': 'AS' in aw, 'nba1': 'NBA1' in aw, 'nba': any(a in aw for a in ('NBA1', 'NBA2', 'NBA3'))}


lines = ['# Ratings review: 1957-58 to 1982-83', '',
         'Each season\'s top ten, then any rating that disagrees with that season\'s real honors. ',
         '★ = hand-set rating (kept exactly). Say which to raise or lower and I\'ll change them.', '']
all_flags = []
for y in range(1958, 1984):
    rows, total = season(y)
    hon = {ALIAS.get(norm(r['name_display']), norm(r['name_display'])): honors(r) for r in total.values()}
    players = roster(y)
    for p in players:
        p['h'] = hon.get(norm(p['name']), {'mvp': None, 'star': False, 'nba1': False, 'nba': False})
        p['hand'] = (y, norm(p['name'])) in HAND
    label = f'{y - 1}-{str(y)[2:]}'
    flags = []
    for p in players:
        h = p['h']
        why = None
        if h['mvp'] == 1 and p['ovr'] < 93: why = f"MVP, rated {p['ovr']}"
        elif h['mvp'] and h['mvp'] <= 3 and p['ovr'] < 90: why = f"MVP vote #{h['mvp']}, rated {p['ovr']}"
        elif h['nba1'] and p['ovr'] < 89: why = f"All-NBA First Team, rated {p['ovr']}"
        elif h['star'] and p['ovr'] < 80: why = f"All-Star, rated {p['ovr']}"
        elif p['ovr'] >= 90 and not h['star'] and not h['nba']: why = f"rated {p['ovr']} with no All-Star or All-NBA"
        if why: flags.append(f"- {p['name']}{' ★' if p['hand'] else ''} ({p['team']}): {why}")
    all_flags += [f'{label}: {f[2:]}' for f in flags]
    top = sorted(players, key=lambda p: -p['ovr'])[:10]
    lines.append(f'## {label}')
    lines.append('')
    lines.append(', '.join(f"{p['name']}{' ★' if p['hand'] else ''} {p['ovr']}" for p in top))
    lines.append('')
    if flags:
        lines += ['**Check:**', ''] + flags + ['']
lines[4:4] = ['## Everything flagged', '', *[f'- {f}' for f in all_flags], '']
os.makedirs(os.path.dirname(REPORT), exist_ok=True)
open(REPORT, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print(f'wrote {REPORT}: {len(all_flags)} flagged', file=sys.stderr)
