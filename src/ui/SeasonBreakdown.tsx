/** "Why 64 wins?": the regular season explained in a few lines on the result screen (see engine/story/breakdown). */
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { SeasonState } from '../engine/season';
import { seasonBreakdown } from '../engine/story/breakdown';
import { Icon, type IconName } from './icons';
import { Text } from './Text';
import { C, F, S } from './theme';

export function SeasonBreakdown({ season }: { season: SeasonState }) {
  const { t } = useTranslation();
  const b = seasonBreakdown(season);
  const rows: [IconName, string][] = [
    ['chart', t('breakdown.squad', { sr: b.sr, rank: b.srRank, n: b.teams, avg: b.leagueSr })],
    ['bolt', b.diff >= 0 ? t('breakdown.marginUp', { diff: b.diff.toFixed(1), exp: b.expected }) : t('breakdown.marginDown', { diff: Math.abs(b.diff).toFixed(1), exp: b.expected })],
    ['clock', `${b.luck >= 2 ? t('breakdown.luckUp', { n: b.luck }) : b.luck <= -2 ? t('breakdown.luckDown', { n: -b.luck }) : t('breakdown.luckEven')} ${t('breakdown.close', { w: b.close.w, l: b.close.l })}`],
    ['siren', b.injuries.games > 0 && b.injuries.worst
      ? t('breakdown.injuries', { games: b.injuries.games, starter: b.injuries.starterGames, name: b.injuries.worst.name, worst: b.injuries.worst.games })
      : t('breakdown.healthy')],
  ];
  if (Math.abs(b.form) >= 1) rows.push(['flame', b.form > 0 ? t('breakdown.formUp', { n: b.form.toFixed(1) }) : t('breakdown.formDown', { n: Math.abs(b.form).toFixed(1) })]);
  if (b.longestStreak >= 5) rows.push(['star', t('breakdown.streak', { n: b.longestStreak })]);
  return (
    <View style={styles.card} testID="season-breakdown">
      <Text style={styles.title}>{t('breakdown.title', { w: b.wins })}</Text>
      {rows.map(([icon, text], i) => (
        <View key={i} style={styles.row}>
          <View style={styles.icon}><Icon name={icon} size={22} /></View>
          <Text style={styles.text}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 20, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, padding: S.lg, gap: S.md },
  title: { color: C.text, fontSize: 24, ...F.display },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, color: C.text, fontWeight: '700', lineHeight: 20 },
});
