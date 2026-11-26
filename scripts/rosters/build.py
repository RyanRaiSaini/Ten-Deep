#!/usr/bin/env python3
"""
Full rosters for every NBA team in every season, 1957-58 through 2025-26 ("2026" in the game's history years).

Input:  Basketball Reference per-game and advanced season pages (scripts/rosters/fetch.mts) and the ratings the
        game already has (scripts/rosters/export-known.mts: curated history + the 2026-27 rosters).
Output: src/data/history/full/<year>.ts, one module per season: every team, its 13 players with the most minutes.

Ratings:
  - Every rating already in the game is kept exactly (curated history players, matched by name, season and team).
  - Everyone else gets an overall from our own formula on their season stats (box plus-minus, minutes, efficiency,
    usage, win shares) and honors (All-Star, All-NBA, All-Defense, MVP voting), fitted to the game's existing ratings: last season's stats against the hand-checked 2026-27
    ratings (stars to end of bench), plus the historical stars already rated.
  - Before 1983-84 the league didn't track what that formula needs (box plus-minus, usage, assist and rebound rates),
    so those seasons use a classic formula on what was kept: PER, win shares per 48, true shooting against that
    season's league average, minutes, games and the same honors. It's fitted on every rated player, with the
    hand-rated stars of 1958-1983 counted double. 1984 onward is unchanged.
  - Archetype from how they played (3-point rate, assist, rebound and block rates, usage, defense);
    durability from games played.

  - Contracts: each player's real salary that season (the team pages' salary tables), as a share of that
    season's cap in game dollars (salary / cap x 171.4, the same rule as src/data/contracts.ts), with the deal type.
    A player with no salary on record gets what players of his rating were really paid that season.
    Before 1984 there are no salary records: everyone gets the typical price for his rating across 1985-2026.

    python3 scripts/rosters/build.py <bbrefCacheDir> <known.json> [outDir] [teamPagesDir]
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
# Team-season pages (roster + salary table, scripts/rosters/fetch_teams.py) and the salary-cap history page.
TEAM_CACHE = sys.argv[4] if len(sys.argv) > 4 else None
FIRST, LAST = 1958, 2026
# The first season with box plus-minus and usage for every player (the modern formula's inputs).
MODERN = 1984
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
    # 1957-58 to 1982-83: the franchises' earlier homes and names.
    'STL': ('atl', 'St. Louis', 'Hawks'), 'MNL': ('lal', 'Minneapolis', 'Lakers'), 'SYR': ('phi', 'Syracuse', 'Nationals'),
    'PHW': ('gsw', 'Philadelphia', 'Warriors'), 'SFW': ('gsw', 'San Francisco', 'Warriors'), 'CIN': ('sac', 'Cincinnati', 'Royals'),
    'KCO': ('sac', 'Kansas City-Omaha', 'Kings'), 'CHP': ('was', 'Chicago', 'Packers'), 'CHZ': ('was', 'Chicago', 'Zephyrs'),
    'BAL': ('was', 'Baltimore', 'Bullets'), 'CAP': ('was', 'Capital', 'Bullets'), 'SDR': ('hou', 'San Diego', 'Rockets'),
    'BUF': ('lac', 'Buffalo', 'Braves'), 'NOJ': ('uta', 'New Orleans', 'Jazz'), 'NYN': ('bkn', 'New York', 'Nets'),
}
# Games in a team's regular season (lockouts and the 2020 bubble were short).
SEASON_GAMES = defaultdict(lambda: 82, {1999: 50, 2012: 66, 2020: 72, 2021: 72, 1958: 72, 1959: 72, 1960: 75, 1961: 79,
                                         1962: 80, 1963: 80, 1964: 80, 1965: 80, 1966: 80, 1967: 81})


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


K = 60 / 0.35
VET_MIN_SHARE = 0.0225
TYPE_CODE = {'supermax': 'S', 'max': 'M', 'rookie': 'R', 'twoWay': 'T', 'min': 'N', 'standard': 'D', 'est': 'E'}


def html_rows(h, tid):
    h = h.replace('<!--', '').replace('-->', '')
    i = h.find(f'id="{tid}"')
    if i < 0: return []
    seg = h[i:h.index('</table>', i)]
    return [cells(r) for r in re.findall(r'<tr[^>]*>(.*?)</tr>', seg, re.S)]


def money(s):
    try:
        v = float(re.sub(r'[$,]', '', s or ''))
        return v if v > 0 else None
    except ValueError:
        return None


def load_pay(years):
    """Season end year → player id → (salary $, years of experience or None, two-way)."""
    caps = {}
    for r in html_rows(open(os.path.join(TEAM_CACHE, 'caphist.html'), encoding='utf-8').read(), 'salary_cap_history'):
        y, c = r.get('year_id', ''), money(r.get('cap', ''))
        if re.fullmatch(r'\d{4}-\d{2}', y) and c: caps[int(y[:4]) + 1] = c
    pay = defaultdict(dict)
    for f in os.listdir(TEAM_CACHE):
        m = re.fullmatch(r'team-([A-Z]{3})-(\d{4})\.html', f)
        if not m or int(m.group(2)) not in years: continue
        y = int(m.group(2))
        h = open(os.path.join(TEAM_CACHE, f), encoding='utf-8').read()
        exp = {}
        for r in html_rows(h, 'roster'):
            if not r.get('pid'): continue
            e = r.get('years_experience', '')
            exp[r['pid']] = (0 if e == 'R' else int(e) if e.isdigit() else None, '(TW)' in r.get('player', ''))
        for r in html_rows(h, 'salaries2'):
            sal = money(r.get('salary', ''))
            if not r.get('pid') or not sal: continue
            e, tw = exp.get(r['pid'], (None, False))
            old = pay[y].get(r['pid'])
            # Paid by two teams in a season (traded): his salary is the larger line.
            pay[y][r['pid']] = (max(sal, old[0]) if old else sal, e if e is not None else (old[1] if old else None), tw or (old[2] if old else False))
    for y in years:
        # Before the cap began (1984-85), an implied cap: the season's top salary is a 35% deal.
        if y not in caps and pay.get(y): caps[y] = max(v[0] for v in pay[y].values()) / 0.35
    return caps, pay


# Rookie-scale deals go to drafted players in their first four seasons: never a veteran who arrived late
# (Arvydas Sabonis was an NBA third-year at 33).
ROOKIE_MAX_AGE = 26


def classify(y, cap, sal, exp, tw, age=None):
    pct = sal / cap
    if tw: return 'twoWay'
    if y >= 2000 and pct >= 0.34: return 'supermax'
    if y >= 2000 and pct >= 0.245: return 'max'
    if (y >= 1996 and exp is not None and exp <= 3 and 0.012 < pct <= 0.115 and pct > VET_MIN_SHARE * 0.6
            and (age is None or age <= ROOKIE_MAX_AGE)): return 'rookie'
    if y >= 1985 and pct <= VET_MIN_SHARE: return 'min'
    return 'standard'


def game_dollars(cap, sal):
    return min(60.0, max(0.5, round(sal / cap * K, 1)))


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


def classic_features(r, y, league_ts):
    """The classic formula's inputs: only stats kept in every season since 1957-58."""
    g = max(1.0, num(r, 'games'))
    mpg = num(r, 'mp_per_g')
    mp = g * mpg
    shrink = lambda v, prior, k=400: (v * mp + prior * k) / (mp + k)
    ws48 = shrink(num(r, 'ws_per_48', 0.05), 0.04)
    per = shrink(num(r, 'per', 11), 10)
    ts = shrink(num(r, 'ts_pct', league_ts) - league_ts, -0.02)
    share = min(1.0, g / SEASON_GAMES[y])
    aw = [a.strip() for a in (r.get('awards') or '').split(',')]
    star = 1.0 if 'AS' in aw else 0.0
    allnba = 3.0 if 'NBA1' in aw else 2.0 if 'NBA2' in aw else 1.0 if 'NBA3' in aw else 0.0
    alldef = 2.0 if 'DEF1' in aw else 1.0 if 'DEF2' in aw else 0.0
    mvp = next((max(0.0, (11 - int(a[4:])) / 10) for a in aw if re.fullmatch(r'MVP-\d+', a)), 0.0)
    return [1.0, ws48 * 10, max(ws48 * 10 - 1, 0) ** 2, per, max(per - 15, 0) ** 2 / 10, ts * 100, mpg, mpg ** 2 / 36, share,
            star, allnba, alldef, mvp]


def league_ts(rows):
    """The season's league-wide true shooting (minutes-weighted), so a 1960 shooter is judged against 1960."""
    w = [(num(r, 'ts_pct'), num(r, 'games') * num(r, 'mp_per_g')) for r in rows if r.get('ts_pct')]
    return sum(t * m for t, m in w) / max(1.0, sum(m for _, m in w))


def classic_archetype(r, pos):
    """No assist, rebound or usage rates before the 1970s: the per-36 box score instead."""
    per36 = lambda k: num(r, k) * 36 / max(1.0, num(r, 'mp_per_g'))
    pts, ast, trb = per36('pts_per_g'), per36('ast_per_g'), per36('trb_per_g')
    three = num(r, 'fg3a_per_g') / max(0.1, num(r, 'fga_per_g'))
    fta = num(r, 'fta_per_g') / max(0.1, num(r, 'fga_per_g'))
    if pos in ('C', 'PF'):
        if ast >= 5 and trb >= 12: return 'point'
        if pos == 'C' or trb >= 12: return 'big'
    if ast >= 7: return 'playmaker'
    if pts >= 24: return 'scorer'
    if three >= 0.3: return 'shooter'
    if fta >= 0.4: return 'slasher'
    return 'twoway'


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
    if not ps:
        # No position on record (a few early players): from his box score.
        per36 = lambda k: num(r, k) * 36 / max(1.0, num(r, 'mp_per_g'))
        ps = ['C' if per36('trb_per_g') >= 12 else 'PG' if per36('ast_per_g') >= 6 else 'PF' if per36('trb_per_g') >= 9 else 'SF']
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
        if y < MODERN: continue
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

    # The classic formula for the seasons before box plus-minus: every rated player, 1958-1983 stars counted double.
    lts = {y: league_ts(rows) for y, (rows, _) in data.items()}
    Xc, Yc, Wc = [], [], []
    for y, (rows, total) in data.items():
        for pid, r in total.items():
            n = norm(r['name_display'])
            if (y, n) in by_year_name:
                Xc.append(classic_features(r, y, lts[y])); Yc.append(by_year_name[(y, n)]['ovr']); Wc.append(2.0 if y < MODERN else 1.0)
            elif y == 2026 and current and n in current and num(r, 'games') >= 15:
                Xc.append(classic_features(r, y, lts[y])); Yc.append(current[n]['ovr']); Wc.append(1.0)
    coef_c = None
    if any(y < MODERN for y in data):
        Xc, Yc, Wc = np.array(Xc), np.array(Yc), np.array(Wc)
        lam_c = np.eye(Xc.shape[1]) * 2.0
        lam_c[0, 0] = 0
        swc = np.sqrt(Wc)[:, None]
        coef_c = np.linalg.solve((Xc * swc).T @ (Xc * swc) + lam_c, (Xc * swc).T @ (Yc * swc[:, 0]))
        old = Wc > 1
        err = np.abs(Xc @ coef_c - Yc)
        print(f'classic fit on {len(Yc)} rated players: mean error {err.mean():.2f}, {err[old].mean():.2f} on the {int(old.sum())} rated before 1984', file=sys.stderr)

    def rate(r, y):
        v = float(np.array(features(r, y)) @ coef) if y >= MODERN else float(np.array(classic_features(r, y, lts[y])) @ coef_c)
        return int(round(min(MAX_OVR, max(MIN_OVR, v))))

    # One person, one name: when a hand-rated player goes by another name in the stats (Penny / Anfernee
    # Hardaway), the stats name maps to the game's in every season, so he's never two people.
    # Players who changed their names (the stats list them by the later one).
    alias = {'mettaworldpeace': 'Ron Artest', 'mettasandifordartest': 'Ron Artest', 'enesfreedom': 'Enes Kanter', 'bisondele': 'Brian Williams'}
    last = lambda n: norm(n.split(' ')[-1]) if n.split(' ')[-1].lower().rstrip('.') not in ('jr', 'sr', 'ii', 'iii', 'iv') else norm(n.split(' ')[-2])
    # Name variants found in the seasons before 1984 rename only those seasons (a later namesake keeps his name).
    alias_old = {}
    for (y, fr), t in curated.items():
        if y not in data: continue
        target = alias if y >= MODERN else alias_old
        rows = [r for r in data[y][0] if TEAMS.get(r['team_name_abbr'], ('',))[0] == fr]
        stat_names = {norm(r['name_display']): r['name_display'] for r in rows}
        for p in t['players']:
            if norm(p['name']) in stat_names: continue
            same = [nm for k, nm in stat_names.items() if last(nm) == last(p['name']) and k not in by_year_name_keys(curated, y)]
            if len(same) == 1: target[norm(same[0])] = p['name']
    if alias: print(f'{len(alias)} name variants matched, e.g. ' + ', '.join(f'{k} -> {v}' for k, v in list(alias.items())[:6]), file=sys.stderr)
    if alias_old: print(f'{len(alias_old)} name variants before 1984: ' + ', '.join(f'{k} -> {v}' for k, v in alias_old.items()), file=sys.stderr)
    for y, (rows, total) in data.items():
        for r in list(rows) + list(total.values()):
            k = norm(r['name_display'])
            if y < MODERN and k in alias_old: r['name_display'] = alias_old[k]
            elif k in alias: r['name_display'] = alias[k]

    # Team colors: the game's own for that franchise and nickname when it has them, else today's.
    colors = {}
    for t in known:
        colors.setdefault((t['franchise'], t['name']), t['colors'])
        if '-' in t['season']: colors[(t['franchise'], '*')] = t['colors']

    os.makedirs(OUT, exist_ok=True)
    stats = {'teams': 0, 'players': 0, 'kept': 0, 'real': 0, 'est': 0}
    caps, pay = load_pay(set(data)) if TEAM_CACHE else ({}, {})

    def contract(y, pid, age=None):
        """
        (game $M, type) from his real salary that season. When the records skip that season (1983-84, 1986-87 and
        1989-90 list only a few players), his deal the season before or after, as a share of that season's cap:
        contracts run several years. None when there's nothing within two seasons.
        """
        if not TEAM_CACHE or not pid: return None
        for yy in (y, y - 1, y + 1, y - 2, y + 2):
            # Before 1984 a season lists a salary or two at most, too few to set its market, so only a fully
            # recorded season nearby counts.
            if pid in pay.get(yy, {}) and yy in caps and ((yy == y and y >= MODERN) or len(pay[yy]) > 200):
                sal, exp, tw = pay[yy][pid]
                return game_dollars(caps[yy], sal), classify(yy, caps[yy], sal, exp, tw, None if age is None else age + yy - y)
        return None
    index = []
    # The seasons before 1984 have no salary records (and no cap): a player there costs the typical price for his
    # rating across every capped season, 1984-85 to now, so no era is a bargain in All-Time. Modern seasons go
    # first so that market is known when the old ones are built.
    curves = {}
    REF = range(MODERN + 1, LAST + 1)
    for y in sorted(data, key=lambda y: (y < MODERN, y)):
        rows, total = data[y]
        pid_of = {norm(r['name_display']): r['pid'] for r in list(rows) + list(total.values())}
        season_lines = []  # [team lines list, index, ovr, contract or None] to fill in once the season's market is known
        by_team = defaultdict(list)
        # A player traded mid-season appears once, on the team he played the most minutes for.
        best_team = {}
        for r in rows:
            mp = num(r, 'games') * num(r, 'mp_per_g')
            if r['pid'] not in best_team or mp > best_team[r['pid']][1]: best_team[r['pid']] = (r['team_name_abbr'], mp)
        for r in rows:
            if best_team[r['pid']][0] == r['team_name_abbr'] and num(r, 'games') >= 5:
                by_team[r['team_name_abbr']].append(r)
        # A thin early roster (nine regulars) takes its short-stint players too, then the ones traded in or out
        # that season (they also stay on their main team; the draft takes each person once), so every team has ten.
        held = {norm(p['name']) for (cy, _), t in curated.items() if cy == y for p in t['players']}
        for code, members in by_team.items():
            # Count who will be listed: the hand-built team's players, and the rest minus anyone hand-rated elsewhere.
            cur = curated.get((y, TEAMS[code][0])) if code in TEAMS else None
            own = {norm(p['name']) for p in cur['players']} if cur else set()
            short = 10 - len(own) - sum(norm(r['name_display']) not in held | own for r in members)
            if short > 0:
                extra = [r for r in rows if r['team_name_abbr'] == code and r not in members and norm(r['name_display']) not in held]
                extra.sort(key=lambda r: (best_team[r['pid']][0] != code, -num(r, 'games') * num(r, 'mp_per_g')))
                members += extra[:short]
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
                    season_lines.append([lines, len(lines) - 1, p['ovr'], contract(y, pid_of.get(norm(p['name'])), p['age'])])
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
                ovr = rate(whole, y)
                tag = archetype(whole, p1) if y >= MODERN else classic_archetype(whole, p1)
                lines.append(f"{r['name_display']}|{p1}{'/' + p2 if p2 else ''}|{ovr}|{age}|{tag}|{dur}")
                season_lines.append([lines, len(lines) - 1, ovr, contract(y, r['pid'], age)])
                names.add(n)
            team = {'franchise': fr, 'city': cur['city'] if cur else city, 'name': cur['name'] if cur else nick,
                    'colors': cur['colors'] if cur else colors.get((fr, nick)) or colors.get((fr, '*')) or ['#334155', '#94a3b8'],
                    'roster': lines}
            teams.append(team)
            stats['teams'] += 1
            stats['players'] += len(lines)
        if TEAM_CACHE:
            # The season's market: what players of each rating were really paid (veteran deals), never decreasing.
            by_ovr = defaultdict(list)
            for _, _, o, c in season_lines:
                if c and c[1] not in ('rookie', 'twoWay'): by_ovr[o].append(c[0])
            curve, floor = {}, 0.5
            for o in range(MIN_OVR, MAX_OVR + 1):
                win = [v for k in range(o - 2, o + 3) for v in by_ovr.get(k, [])]
                if len(win) >= 5: floor = max(floor, sorted(win)[len(win) // 2])
                curve[o] = floor
            if y < MODERN:
                ref = [curves[r] for r in REF if r in curves]
                curve = {o: round(sorted(c[o] for c in ref)[len(ref) // 2], 1) for o in curve} if ref else curve
            curves[y] = curve
            for lines_ref, i, o, c in season_lines:
                if c: stats['real'] += 1
                else: stats['est'] += 1; c = (curve[o], 'est')
                lines_ref[i] += f"|${c[0]:g}:{TYPE_CODE[c[1]]}"
        write_year(y, teams)
        index.append(y)
    write_index(sorted(index))
    print(f"{stats['teams']} team-seasons, {stats['players']} players ({stats['kept']} hand-rated kept)", file=sys.stderr)
    if TEAM_CACHE:
        n = stats['real'] + stats['est']
        print(f"contracts: {stats['real']} real ({100 * stats['real'] / max(1, n):.1f}%), {stats['est']} estimated from that season's market", file=sys.stderr)
    json.dump({'coef': coef.tolist(), 'mae': mae, 'n': len(Y), 'classic': coef_c.tolist() if coef_c is not None else None}, open(os.path.join(OUT, '..', 'full-model.json'), 'w'), indent=1)


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
