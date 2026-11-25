#!/usr/bin/env python3
"""
Full rosters for every NBA team in every season, 1984 through 2025-26 ("2026" in the game's history years).

Input:  Basketball Reference per-game and advanced season pages (scripts/rosters/fetch.mts) and the ratings the
        game already has (scripts/rosters/export-known.mts: curated history + the 2026-27 rosters).
Output: src/data/history/full/<year>.ts, one module per season: every team, its 13 players with the most minutes.

Ratings:
  - Every rating already in the game is kept exactly (curated history players, matched by name, season and team).
  - Everyone else gets an overall from our own formula on their season stats (box plus-minus, minutes, efficiency,
    usage, win shares) and honors (All-Star, All-NBA, All-Defense, MVP voting), fitted to the game's existing ratings: last season's stats against the hand-checked 2026-27
    ratings (stars to end of bench), plus the historical stars already rated.
  - Archetype from how they played (3-point rate, assist, rebound and block rates, usage, defense);
    durability from games played.

    python3 scripts/rosters/build.py <bbrefCacheDir> <known.json> [outDir]
"""
import html
import json
import os
import re
import sys
import unicodedata
from collections import defaultdict

import numpy as np

CACHE, KNOWN = sys.argv[1], sys.argv[2]
OUT = sys.argv[3] if len(sys.argv) > 3 else 'src/data/history/full'
FIRST, LAST = 1984, 2026
ROSTER = 13
MIN_OVR, MAX_OVR = 64, 99

# Basketball Reference team code → (franchise key in the game, city, nickname) by season (end year).
TEAMS = {
    'ATL': ('atl', 'Atlanta', 'Hawks'), 'BOS': ('bos', 'Boston', 'Celtics'), 'NJN': ('bkn', 'New Jersey', 'Nets'),
    'BRK': ('bkn', 'Brooklyn', 'Nets'), 'CHI': ('chi', 'Chicago', 'Bulls'), 'CHH': ('cha', 'Charlotte', 'Hornets'),
    'CHA': ('cha', 'Charlotte', 'Bobcats'), 'CHO': ('cha', 'Charlotte', 'Hornets'), 'CLE': ('cle', 'Cleveland', 'Cavaliers'),
    'DAL': ('dal', 'Dallas', 'Mavericks'), 'DEN': ('den', 'Denver', 'Nuggets'), 'DET': ('det', 'Detroit', 'Pistons'),
    'GSW': ('gsw', 'Golden State', 'Warriors'), 'HOU': ('hou', 'Houston', 'Rockets'), 'IND': ('ind', 'Indiana', 'Pacers'),
    'KCK': ('sac', 'Kansas City', 'Kings'), 'SAC': ('sac', 'Sacramento', 'Kings'), 'SDC': ('lac', 'San Diego', 'Clippers'),
    'LAC': ('lac', 'Los Angeles', 'Clippers'), 'LAL': ('lal', 'Los Angeles', 'Lakers'), 'VAN': ('mem', 'Vancouver', 'Grizzlies'),
    'MEM': ('mem', 'Memphis', 'Grizzlies'), 'MIA': ('mia', 'Miami', 'Heat'), 'MIL': ('mil', 'Milwaukee', 'Bucks'),
    'MIN': ('min', 'Minnesota', 'Timberwolves'), 'NOH': ('nop', 'New Orleans', 'Hornets'), 'NOK': ('nop', 'New Orleans', 'Hornets'),
    'NOP': ('nop', 'New Orleans', 'Pelicans'), 'NYK': ('nyk', 'New York', 'Knicks'), 'SEA': ('okc', 'Seattle', 'SuperSonics'),
    'OKC': ('okc', 'Oklahoma City', 'Thunder'), 'ORL': ('orl', 'Orlando', 'Magic'), 'PHI': ('phi', 'Philadelphia', '76ers'),
    'PHO': ('phx', 'Phoenix', 'Suns'), 'POR': ('por', 'Portland', 'Trail Blazers'), 'SAS': ('sas', 'San Antonio', 'Spurs'),
    'TOR': ('tor', 'Toronto', 'Raptors'), 'UTA': ('uta', 'Utah', 'Jazz'), 'WSB': ('was', 'Washington', 'Bullets'),
    'WAS': ('was', 'Washington', 'Wizards'),
}
# Games in a team's regular season (lockouts and the 2020 bubble were short).
SEASON_GAMES = defaultdict(lambda: 82, {1999: 50, 2012: 66, 2020: 72, 2021: 72})


def norm(name):
    s = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z]', '', re.sub(r'\b(jr|sr|ii|iii|iv)\b\.?', '', s))


def cells(row):
    out = {}
    for stat, val in re.findall(r'data-stat="([a-z_0-9]+)"[^>]*>(.*?)</t[dh]>', row, re.S):
        out[stat] = html.unescape(re.sub(r'<[^>]+>', '', val)).strip()
    m = re.search(r'href="/players/./([a-z0-9]+)\.html"', row)
    out['pid'] = m.group(1) if m else None
    return out


def table(path, tid):
    h = open(path, encoding='utf-8').read()
    i = h.index(f'id="{tid}"')
    t = h[i:]
    body = t[t.index('<tbody>'):t.index('</tbody>')]
    rows = [cells(r) for r in re.findall(r'<tr[^>]*>(.*?)</tr>', body, re.S)]
    return [r for r in rows if r.get('pid') and r.get('name_display')]


def num(r, k, d=0.0):
    try:
        return float(r.get(k, '') or d)
    except ValueError:
        return d


def season(y):
    """Every player-team row of season y, plus each player's whole-season (TOT) line."""
    pg = table(os.path.join(CACHE, f'per_game-{y}.html'), 'per_game_stats')
    adv = {(r['pid'], r['team_name_abbr']): r for r in table(os.path.join(CACHE, f'advanced-{y}.html'), 'advanced')}
    total, rows = {}, []
    for r in pg:
        a = adv.get((r['pid'], r['team_name_abbr']), {})
        row = {**a, **r}
        team = r['team_name_abbr']
        if team == 'TOT' or re.fullmatch(r'\d+TM', team):
            total[r['pid']] = row
        else:
            rows.append(row)
    for r in rows:
        total.setdefault(r['pid'], r)
    return rows, total


def by_year_name_keys(curated, y):
    return {norm(p['name']) for (cy, _), t in curated.items() if cy == y for p in t['players']}


def features(r, y):
    g = max(1.0, num(r, 'games'))
    mpg = num(r, 'mp_per_g')
    mp = g * mpg
    shrink = lambda v, prior, k=400: (v * mp + prior * k) / (mp + k)
    bpm = shrink(num(r, 'bpm', -2), -2.5)
    obpm = shrink(num(r, 'obpm', -1.5), -1.5)
    dbpm = shrink(num(r, 'dbpm', -0.5), -1.0)
    ws48 = shrink(num(r, 'ws_per_48', 0.05), 0.04)
    per = shrink(num(r, 'per', 11), 10)
    usg = num(r, 'usg_pct', 18)
    ts = num(r, 'ts_pct', 0.53)
    share = min(1.0, g / SEASON_GAMES[y])
    # Honors the league gave that season: All-Star, All-NBA (1st = 3), All-Defense (1st = 2), MVP voting place.
    aw = [a.strip() for a in (r.get('awards') or '').split(',')]
    star = 1.0 if 'AS' in aw else 0.0
    allnba = 3.0 if 'NBA1' in aw else 2.0 if 'NBA2' in aw else 1.0 if 'NBA3' in aw else 0.0
    alldef = 2.0 if 'DEF1' in aw else 1.0 if 'DEF2' in aw else 0.0
    mvp = next((max(0.0, (11 - int(a[4:])) / 10) for a in aw if re.fullmatch(r'MVP-\d+', a)), 0.0)
    return [1.0, bpm, max(bpm, 0) ** 2, obpm, dbpm, ws48 * 10, per, mpg, mpg ** 2 / 36, usg, ts * 10, share, star, allnba, alldef, mvp]


def archetype(r, pos):
    three = num(r, 'fg3a_per_fga_pct', 0.0)
    ast = num(r, 'ast_pct', 10)
    trb = num(r, 'trb_pct', 9)
    blk = num(r, 'blk_pct', 1)
    usg = num(r, 'usg_pct', 18)
    dbpm = num(r, 'dbpm', 0)
    fta = num(r, 'fta_per_fga_pct', 0.25)
    big = pos in ('C', 'PF')
    if big:
        if ast >= 22 and trb >= 14: return 'point'
        if three >= 0.25 and blk >= 3.5: return 'unicorn'
        if three >= 0.3: return 'stretch'
        if blk >= 4 and usg < 20: return 'rim'
        if pos == 'C' or trb >= 15: return 'big'
    if ast >= 32: return 'playmaker'
    if usg >= 28: return 'scorer'
    if dbpm >= 2 and usg < 20: return 'defender'
    if three >= 0.42: return 'wing3d' if dbpm >= 0.5 else 'shooter'
    if three < 0.18 and fta >= 0.35: return 'slasher'
    if usg >= 24: return 'scorer'
    return 'twoway'


def positions(r):
    ps = [p for p in re.split(r'[-,/ ]+', r.get('pos', '') or '') if p in ('PG', 'SG', 'SF', 'PF', 'C')]
    if not ps: ps = ['SF']
    if ps[0] == 'G': ps[0] = 'SG'
    if ps[0] == 'F': ps[0] = 'SF'
    return ps[0], (ps[1] if len(ps) > 1 and ps[1] != ps[0] else None)


def main():
    known = json.load(open(KNOWN))
    years = [y for y in range(FIRST, LAST + 1) if os.path.exists(os.path.join(CACHE, f'per_game-{y}.html'))]
    data = {y: season(y) for y in years}

    # Curated ratings by (year, franchise) and by (year, name) for training and to keep them exactly.
    curated = {}
    by_year_name = {}
    current = None
    for t in known:
        if '-' in t['season']:
            current = current or {}
            for p in t['players']: current[norm(p['name'])] = p
            continue
        y = int(t['season'])
        curated[(y, t['franchise'])] = t
        for p in t['players']: by_year_name[(y, norm(p['name']))] = p

    # Training pairs: historical curated players, and last season's stats against the 2026-27 ratings.
    X, Y, W = [], [], []
    for y, (rows, total) in data.items():
        for pid, r in total.items():
            n = norm(r['name_display'])
            if (y, n) in by_year_name:
                X.append(features(r, y)); Y.append(by_year_name[(y, n)]['ovr']); W.append(1.0)
            elif y == 2026 and current and n in current and num(r, 'games') >= 15:
                X.append(features(r, y)); Y.append(current[n]['ovr']); W.append(1.5)
    X, Y, W = np.array(X), np.array(Y), np.array(W)
    lam = np.eye(X.shape[1]) * 2.0
    lam[0, 0] = 0
    sw = np.sqrt(W)[:, None]
    coef = np.linalg.solve((X * sw).T @ (X * sw) + lam, (X * sw).T @ (Y * sw[:, 0]))
    pred = X @ coef
    mae = float(np.mean(np.abs(pred - Y)))
    print(f'fit on {len(Y)} rated players: mean error {mae:.2f} points', file=sys.stderr)

    rate = lambda r, y: int(round(min(MAX_OVR, max(MIN_OVR, float(np.array(features(r, y)) @ coef)))))

    # One person, one name: when a hand-rated player goes by another name in the stats (Penny / Anfernee
    # Hardaway), the stats name maps to the game's in every season, so he's never two people.
    # Players who changed their names (the stats list them by the later one).
    alias = {'mettaworldpeace': 'Ron Artest', 'mettasandifordartest': 'Ron Artest', 'enesfreedom': 'Enes Kanter', 'bisondele': 'Brian Williams'}
    last = lambda n: norm(n.split(' ')[-1]) if n.split(' ')[-1].lower().rstrip('.') not in ('jr', 'sr', 'ii', 'iii', 'iv') else norm(n.split(' ')[-2])
    for (y, fr), t in curated.items():
        if y not in data: continue
        rows = [r for r in data[y][0] if TEAMS.get(r['team_name_abbr'], ('',))[0] == fr]
        stat_names = {norm(r['name_display']): r['name_display'] for r in rows}
        for p in t['players']:
            if norm(p['name']) in stat_names: continue
            same = [nm for k, nm in stat_names.items() if last(nm) == last(p['name']) and k not in by_year_name_keys(curated, y)]
            if len(same) == 1: alias[norm(same[0])] = p['name']
    if alias: print(f'{len(alias)} name variants matched, e.g. ' + ', '.join(f'{k} -> {v}' for k, v in list(alias.items())[:6]), file=sys.stderr)
    for y, (rows, total) in data.items():
        for r in list(rows) + list(total.values()):
            if norm(r['name_display']) in alias: r['name_display'] = alias[norm(r['name_display'])]

    # Team colors: the game's own for that franchise and nickname when it has them, else today's.
    colors = {}
    for t in known:
        colors.setdefault((t['franchise'], t['name']), t['colors'])
        if '-' in t['season']: colors[(t['franchise'], '*')] = t['colors']

    os.makedirs(OUT, exist_ok=True)
    stats = {'teams': 0, 'players': 0, 'kept': 0}
    index = []
    for y, (rows, total) in data.items():
        by_team = defaultdict(list)
        # A player traded mid-season appears once, on the team he played the most minutes for.
        best_team = {}
        for r in rows:
            mp = num(r, 'games') * num(r, 'mp_per_g')
            if r['pid'] not in best_team or mp > best_team[r['pid']][1]: best_team[r['pid']] = (r['team_name_abbr'], mp)
        for r in rows:
            if best_team[r['pid']][0] == r['team_name_abbr'] and num(r, 'games') >= 5:
                by_team[r['team_name_abbr']].append(r)
        teams = []
        # A hand-rated player is on his hand-built team that season and nowhere else (traded players included).
        curated_names = {norm(p['name']) for (cy, _), t in curated.items() if cy == y for p in t['players']}
        for code, members in sorted(by_team.items()):
            if code not in TEAMS:
                print(f'unknown team {code} {y}', file=sys.stderr); continue
            fr, city, nick = TEAMS[code]
            cur = curated.get((y, fr))
            members.sort(key=lambda r: -num(r, 'games') * num(r, 'mp_per_g'))
            lines, names = [], set()
            # Curated players first, exactly as rated.
            if cur:
                for p in cur['players']:
                    pos = p['pos'] + (f"/{p['pos2']}" if p['pos2'] else '')
                    lines.append(f"{p['name']}|{pos}|{p['ovr']}|{p['age'] or 27}|{p['tag'] or 'twoway'}|{p['dur']}")
                    names.add(norm(p['name']))
                    stats['kept'] += 1
            for r in members:
                if len(lines) >= ROSTER: break
                n = norm(r['name_display'])
                if n in names or n in curated_names: continue
                whole = total.get(r['pid'], r)
                p1, p2 = positions(r)
                g = num(whole, 'games')
                dur = int(round(min(95, max(40, 45 + 50 * g / SEASON_GAMES[y]))))
                age = int(num(r, 'age', 27)) or 27
                lines.append(f"{r['name_display']}|{p1}{'/' + p2 if p2 else ''}|{rate(whole, y)}|{age}|{archetype(whole, p1)}|{dur}")
                names.add(n)
            team = {'franchise': fr, 'city': cur['city'] if cur else city, 'name': cur['name'] if cur else nick,
                    'colors': cur['colors'] if cur else colors.get((fr, nick)) or colors.get((fr, '*')) or ['#334155', '#94a3b8'],
                    'roster': lines}
            teams.append(team)
            stats['teams'] += 1
            stats['players'] += len(lines)
        write_year(y, teams)
        index.append(y)
    write_index(index)
    print(f"{stats['teams']} team-seasons, {stats['players']} players ({stats['kept']} hand-rated kept)", file=sys.stderr)
    json.dump({'coef': coef.tolist(), 'mae': mae, 'n': len(Y)}, open(os.path.join(OUT, '..', 'full-model.json'), 'w'), indent=1)


def write_year(y, teams):
    q = lambda s: json.dumps(s, ensure_ascii=False)
    body = '\n'.join(
        f"  [{q(t['franchise'])}, {q(t['city'])}, {q(t['name'])}, [{q(t['colors'][0])}, {q(t['colors'][1])}], {q(chr(10).join(t['roster']))}],"
        for t in teams)
    with open(os.path.join(OUT, f'{y}.ts'), 'w', encoding='utf-8') as f:
        f.write(f"// Generated by scripts/rosters/build.py: every team of the {y - 1}-{str(y)[2:]} season. Do not edit by hand.\n")
        f.write("import type { FullTeam } from './types';\n\n")
        f.write(f"export const Y{y}: FullTeam[] = [\n{body}\n];\n")


def write_index(years):
    with open(os.path.join(OUT, 'index.ts'), 'w', encoding='utf-8') as f:
        f.write('// Generated by scripts/rosters/build.py. Do not edit by hand.\n')
        f.write("import type { FullTeam } from './types';\n")
        for y in years: f.write(f"import {{ Y{y} }} from './{y}';\n")
        f.write('\n/** Every season (by end year) with every team: [franchise, city, nickname, colors, roster lines]. */\n')
        f.write('export const FULL_SEASONS: Record<number, FullTeam[]> = {\n')
        for y in years: f.write(f'  {y}: Y{y},\n')
        f.write('};\n')


if __name__ == '__main__':
    main()
