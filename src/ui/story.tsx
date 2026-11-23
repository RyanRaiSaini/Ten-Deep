/** Storytelling pieces shared by the season, playoffs and result screens. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import type { BoxLine, GameResult } from '../engine/game';
import type { Headline } from '../engine/story/news';
import type { Recap } from '../engine/story/recap';
import type { Roster } from '../engine/types';
import { C, F, R, S } from './theme';

const NEWS_ICON: Record<Headline['kind'], string> = {
  streakW: '🔥', streakL: '🧊', big: '💥', triple: '📊', wins: '✅', injury: '🩼', first: '🥇', upset: '😤',
};

export function NewsItem({ h }: { h: Headline }) {
  const { t } = useTranslation();
  return (
    <View style={styles.news}>
      <Text style={styles.newsIcon}>{NEWS_ICON[h.kind]}</Text>
      <Text style={styles.newsText}>{t(`news.${h.kind}`, { name: h.name, n: h.n })}</Text>
      <Text style={styles.newsG}>G{h.round + 1}</Text>
    </View>
  );
}

/** Two short box-score tables (yours first). */
export function BoxScore({ result, mine, theirs, names, userHome }: { result: GameResult; mine: Roster; theirs: Roster; names: [string, string]; userHome: boolean }) {
  const { t } = useTranslation();
  const ids = new Set(Object.values(mine.slots).map((p) => p.id));
  const theirIds = new Set(Object.values(theirs.slots).map((p) => p.id));
  // New saves record each line's side; older ones fall back to today's rosters.
  const isMine = (b: BoxLine) => (b.home !== undefined ? b.home === userHome : ids.has(b.playerId));
  const side = (keep: (b: BoxLine) => boolean, n: number) => result.box.filter(keep).sort((a, b) => b.pts - a.pts).slice(0, n);
  const table = (rows: BoxLine[], title: string) => (
    <View style={{ gap: 2 }}>
      <View style={styles.boxRow}>
        <Text style={[styles.boxName, styles.boxHead]} numberOfLines={1}>{title}</Text>
        {(['min', 'pts', 'reb', 'ast'] as const).map((k) => <Text key={k} style={[styles.boxNum, styles.boxHead]}>{t(`box.${k}`)}</Text>)}
      </View>
      {rows.map((b) => (
        <View key={`${b.home}-${b.playerId}`} style={styles.boxRow}>
          <Text style={styles.boxName} numberOfLines={1}>{b.name}</Text>
          <Text style={styles.boxNum}>{Math.round(b.min)}</Text>
          <Text style={[styles.boxNum, { color: C.text, fontWeight: '800' }]}>{b.pts}</Text>
          <Text style={styles.boxNum}>{b.reb}</Text>
          <Text style={styles.boxNum}>{b.ast}</Text>
        </View>
      ))}
    </View>
  );
  return (
    <View style={styles.box} testID="box-score">
      {table(side(isMine, 10), names[0])}
      {table(side((b) => !isMine(b) && (b.home !== undefined || theirIds.has(b.playerId) || !ids.has(b.playerId)), 5), names[1])}
    </View>
  );
}

/** A tappable row that opens its box score underneath. */
export function Expandable({ head, children, enabled }: { head: React.ReactNode; children: React.ReactNode; enabled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable disabled={!enabled} onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} testID={enabled ? 'game-line' : undefined}>
        {head}
      </Pressable>
      {open && children}
    </View>
  );
}

/** Period-by-period scoring and the key moments of one game. */
export function RecapCard({ recap, names }: { recap: Recap; names: [string, string] }) {
  const { t } = useTranslation();
  const label = (p: number) => (p < 4 ? t('recap.q', { n: p + 1 }) : p === 4 ? t('recap.ot') : `${t('recap.ot')}${p - 3}`);
  const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  return (
    <View style={{ gap: S.sm }} testID="recap">
      <View style={styles.boxRow}>
        <Text style={[styles.boxName, styles.boxHead]} />
        {recap.periods[0].map((_, p) => <Text key={p} style={[styles.boxNum, styles.boxHead]}>{label(p)}</Text>)}
        <Text style={[styles.boxNum, styles.boxHead]}>T</Text>
      </View>
      {recap.periods.map((ps, side) => (
        <View key={side} style={styles.boxRow}>
          <Text style={styles.boxName} numberOfLines={1}>{names[side]}</Text>
          {ps.map((v, p) => <Text key={p} style={styles.boxNum}>{v}</Text>)}
          <Text style={[styles.boxNum, { color: C.text, fontWeight: '900' }]}>{total(ps)}</Text>
        </View>
      ))}
      {recap.moments.map((m, i) => (
        <Text key={i} style={styles.moment}>
          <Text style={styles.momentQ}>{label(Math.min(m.period, recap.periods[0].length - 1))}  </Text>
          {t(`recap.${m.kind === 'ot' ? 'otGame' : m.kind}`, { name: m.name, n: m.n, line: m.line, team: names[m.side] })}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  news: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  newsIcon: { fontSize: 16, width: 22 },
  newsText: { color: C.text, flex: 1, fontWeight: '700', fontSize: 13 },
  newsG: { color: C.muted, fontSize: 11 },
  box: { backgroundColor: C.surface2, borderRadius: R.md, padding: S.sm, gap: S.sm, marginTop: 6 },
  boxRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  boxName: { flex: 1, color: C.text, fontSize: 12 },
  boxHead: { color: C.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  boxNum: { width: 30, textAlign: 'right', color: C.muted, fontSize: 12, ...F.display, fontWeight: '700' },
  moment: { color: C.text, fontSize: 13, lineHeight: 19 },
  momentQ: { color: C.hardwood, fontWeight: '900' },
});
