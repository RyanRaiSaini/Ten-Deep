/**
 * The playoff bracket as a tree: each conference left to right (first round → conference semifinals → conference
 * finals), then the Finals. Every team's spot is painted in its own colors; the winner of a series stays bright and
 * the loser fades. Spots not decided yet show as empty.
 */
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { CONFERENCES } from '../engine/conference';
import { seriesOver, seriesWinner, type PlayoffState, type Series } from '../engine/playoffs';
import { Text } from './Text';
import { F, S } from './theme';

/** Relative luminance (0 dark .. 1 light) of a #RRGGBB color. */
function luma(hex: string): number {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  if (Number.isNaN(n)) return 0;
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

/** "Memphis Grizzlies" → "Grizzlies", "Portland Trail Blazers" → "Trail Blazers". */
export function nickname(name: string): string {
  const words = name.split(' ');
  if (words.length >= 3 && ['Trail'].includes(words[words.length - 2])) return words.slice(-2).join(' ');
  return words[words.length - 1];
}

function Slot({ ps, team, seed, wins, state }: { ps: PlayoffState; team: number; seed: number; wins: number; state: 'won' | 'lost' | 'live' }) {
  const { t } = useTranslation();
  const r = ps.season.teams[team];
  const bg = r.colors[0];
  const ink = luma(bg) > 0.62 ? '#17121E' : '#FFFFFF';
  const me = team === 0;
  return (
    <View style={[styles.slot, { backgroundColor: bg, borderColor: me ? '#FFC53D' : 'rgba(0,0,0,0.35)' }, me && styles.slotMe, state === 'lost' && styles.lost]}
      testID={me ? 'bracket-you' : undefined}>
      <View style={[styles.stripe, { backgroundColor: r.colors[1] }]} />
      <Text style={[styles.seed, { color: ink }]}>{seed}</Text>
      <Text style={[styles.name, { color: ink }, state === 'won' && { fontWeight: '900' }]} numberOfLines={1}>{me ? t('league.you') : nickname(r.name)}</Text>
      <Text style={[styles.wins, { color: ink }]}>{wins}</Text>
    </View>
  );
}

function Matchup({ ps, s }: { ps: PlayoffState; s: Series | null }) {
  if (!s) {
    return (
      <View style={styles.matchup}>
        <View style={[styles.slot, styles.empty]} />
        <View style={[styles.slot, styles.empty]} />
      </View>
    );
  }
  const w = seriesOver(s) ? seriesWinner(s) : null;
  const st = (team: number) => (w === null ? 'live' : w === team ? 'won' : 'lost');
  return (
    <View style={styles.matchup}>
      <Slot ps={ps} team={s.hi} seed={s.seedHi} wins={s.winsHi} state={st(s.hi)} />
      <Slot ps={ps} team={s.lo} seed={s.seedLo} wins={s.winsLo} state={st(s.lo)} />
    </View>
  );
}

const pad = <T,>(xs: T[], n: number): (T | null)[] => [...xs, ...Array(Math.max(0, n - xs.length)).fill(null)];

/** One conference's tree, drawn with "]" connectors between rounds. */
function ConferenceTree({ ps, conf }: { ps: PlayoffState; conf: 0 | 1 }) {
  const { t } = useTranslation();
  const of = (r: number) => (ps.rounds[r] ?? []).filter((s) => s.conf === conf);
  const cols = [pad(of(0), 4), pad(of(1), 2), pad(of(2), 1)];
  return (
    <View style={{ gap: 6 }} testID={`bracket-${CONFERENCES[conf]}`}>
      <Text style={styles.confTitle}>{t(`conf.${CONFERENCES[conf]}`)}</Text>
      <View style={styles.tree}>
        {cols.map((col, ci) => (
          <View key={ci} style={styles.col}>
            {ci < 2 ? (
              // Pairs feed the next round: draw a bracket line joining each pair.
              Array.from({ length: col.length / 2 }, (_, pi) => (
                <View key={pi} style={styles.pair}>
                  <Matchup ps={ps} s={col[pi * 2]} />
                  <Matchup ps={ps} s={col[pi * 2 + 1]} />
                  <View style={styles.join} />
                </View>
              ))
            ) : <View style={styles.pair}><Matchup ps={ps} s={col[0]} /></View>}
          </View>
        ))}
      </View>
    </View>
  );
}

export function Bracket({ ps }: { ps: PlayoffState }) {
  const { t } = useTranslation();
  const final = ps.rounds[3]?.[0] ?? null;
  return (
    <View style={{ gap: S.lg }} testID="bracket">
      <ConferenceTree ps={ps} conf={1} />
      <ConferenceTree ps={ps} conf={0} />
      <View style={styles.finals}>
        <Text style={styles.finalsTitle}>{t('playoffs.round3')}</Text>
        <View style={{ width: '100%', maxWidth: 260 }}><Matchup ps={ps} s={final} /></View>
      </View>
    </View>
  );
}

const SLOT_H = 24;
const styles = StyleSheet.create({
  confTitle: { color: '#FFC53D', ...F.label },
  tree: { flexDirection: 'row', gap: 10 },
  col: { flex: 1, justifyContent: 'space-around', gap: 10 },
  pair: { flex: 1, justifyContent: 'space-around', gap: 10 },
  join: { position: 'absolute', right: -9, top: '25%', bottom: '25%', width: 8, borderTopWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderColor: 'rgba(255,255,255,0.35)', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  matchup: { gap: 2 },
  slot: { height: SLOT_H, borderRadius: 6, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', paddingLeft: 7, paddingRight: 5, gap: 4, overflow: 'hidden' },
  slotMe: { borderWidth: 2.5 },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  empty: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', borderStyle: 'dashed' },
  lost: { opacity: 0.4 },
  seed: { fontSize: 10, fontWeight: '900', width: 10, opacity: 0.85 },
  name: { flex: 1, fontSize: 11, fontWeight: '800' },
  wins: { fontSize: 13, ...F.display },
  finals: { alignItems: 'center', gap: 6, padding: S.md, borderRadius: 16, borderWidth: 2, borderColor: '#FFC53D', backgroundColor: 'rgba(255,197,61,0.08)' },
  finalsTitle: { color: '#FFC53D', fontSize: 18, ...F.display },
});
