import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LADDER, PROMOTE, RELEGATE, GROUP_SIZE, standings, weekFraction } from '../engine/league/ladder';
import { useLeague } from '../store/league';
import { useProfile } from '../store/profile';
import { Avatar } from '../ui/Avatar';
import { BackButton, Card, Display, Header, Label, Screen } from '../ui/components';
import { Icon } from '../ui/icons';
import { useWeekCountdown } from '../ui/LeagueCard';
import { goBack } from '../ui/nav';
import { Text } from '../ui/Text';
import { TierBadge, tierName } from '../ui/TierBadge';
import { C, FONT, R, S } from '../ui/theme';

/** The weekly league: the ladder of tiers, how to score, and this week's 30-player standings. */
export default function Ladder() {
  const { t } = useTranslation();
  const league = useLeague();
  const profile = useProfile();
  const countdown = useWeekCountdown();
  if (!league.week) return <Screen><Header title={t('ladder.title')} left={<BackButton onPress={goBack} />} /></Screen>;
  const rows = standings(league.week, league.tier, league.points, weekFraction(new Date()));
  const name = (g: Parameters<Parameters<typeof tierName>[1]>[0]) => t(`ladder.${g}`);

  return (
    <Screen tint={C.gold}>
      <Header title={t('ladder.title')} left={<BackButton onPress={goBack} />} />
      <View style={styles.hero}>
        <TierBadge tier={league.tier} size={110} />
        <Display size={34}>{tierName(league.tier, name)}</Display>
        <View style={styles.timer}><Icon name="clock" size={20} /><Text style={styles.timerText}>{t('ladder.endsIn', { time: countdown })}</Text></View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.path}>
        {LADDER.map((_, i) => (
          <View key={i} style={[styles.step, i === league.tier && styles.stepOn, i > league.tier && { opacity: 0.4 }]}>
            <TierBadge tier={i} size={i === league.tier ? 44 : 34} />
          </View>
        ))}
      </ScrollView>

      <Card style={{ gap: 6 }}>
        <Text style={styles.howTitle}>{t('ladder.how')}</Text>
        <Text style={styles.how}>• {t('ladder.howRun')}</Text>
        <Text style={styles.how}>• {t('ladder.howBonus')}</Text>
        <Text style={styles.how}>• {t('ladder.howDaily')}</Text>
        <Text style={styles.how}>• {t('ladder.howMove', { up: PROMOTE, down: RELEGATE })}</Text>
      </Card>

      <Label>{t('ladder.standings')} · {league.points} {t('ladder.pts')}</Label>
      <Card style={{ padding: S.sm, gap: 2 }} testID="ladder-table">
        {rows.map((r, i) => (
          <View key={r.you ? 'you' : r.name}>
            {i === PROMOTE && league.tier < LADDER.length - 1 && <View style={[styles.cut, { backgroundColor: '#14A86B' }]}><Text style={styles.cutText}>{t('ladder.promote')}</Text></View>}
            {i === GROUP_SIZE - RELEGATE && league.tier > 0 && <View style={[styles.cut, { backgroundColor: C.danger }]}><Text style={styles.cutText}>{t('ladder.relegate')}</Text></View>}
            <View style={[styles.row, r.you && styles.rowYou]}>
              <Text style={[styles.rank, r.zone === 'promote' && { color: '#14A86B' }, r.zone === 'relegate' && { color: C.danger }]}>{r.rank}</Text>
              {r.you ? <Avatar id={profile.avatarId} size={30} /> : <View style={styles.bot}><Text style={styles.botText}>AI</Text></View>}
              <Text style={[styles.name, r.you && { fontWeight: '900' }]} numberOfLines={1}>{r.you ? (profile.name || t('league.you')) : r.name}</Text>
              <Text style={styles.points}>{r.points}</Text>
            </View>
          </View>
        ))}
      </Card>
      <Text style={styles.note}>{t('ladder.botsNote')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.ink, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 6 },
  timerText: { color: '#FFFFFF', fontWeight: '900' },
  path: { gap: 6, paddingVertical: S.sm, alignItems: 'center' },
  step: { padding: 4, borderRadius: 14 },
  stepOn: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: C.ink },
  howTitle: { fontFamily: FONT.display, fontSize: 18, color: C.ink },
  how: { color: C.muted, fontWeight: '700' },
  cut: { borderRadius: R.pill, paddingVertical: 2, alignItems: 'center', marginVertical: 4 },
  cutText: { color: '#FFFFFF', fontWeight: '900', fontSize: 11, letterSpacing: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: 6, paddingHorizontal: S.sm, borderRadius: 12 },
  rowYou: { backgroundColor: '#FFF1D6', borderWidth: 2, borderColor: C.gold },
  rank: { width: 26, fontFamily: FONT.display, fontSize: 16, color: C.muted, textAlign: 'center' },
  bot: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.surface2, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  botText: { fontSize: 10, fontWeight: '900', color: C.muted },
  name: { flex: 1, color: C.ink, fontWeight: '700' },
  points: { fontFamily: FONT.display, fontSize: 18, color: C.ink },
  note: { color: C.muted, fontSize: 12, textAlign: 'center' },
});
