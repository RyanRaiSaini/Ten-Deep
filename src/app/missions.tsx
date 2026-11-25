import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { feel } from '../audio/feel';
import { ACHIEVEMENTS, valueOf, type Medal } from '../engine/progress/achievements';
import { dailyMissions, missionProgress, weeklyMissions, type Mission } from '../engine/progress/missions';
import { useCollection } from '../store/collection';
import { snapshot, useProgress } from '../store/progress';
import { BackButton, Button, Card, Header, Label, Screen } from '../ui/components';
import { C, R, S } from '../ui/theme';
import { Icon } from '../ui/icons';
import { goBack } from '../ui/nav';
import { achievementIcon } from '../ui/gameIcons';

const MEDAL: Record<Medal, string> = { bronze: '#D08A4E', silver: '#C9D3E8', gold: C.gold };

export default function Missions() {
  const { t } = useTranslation();
  const p = useProgress();
  useCollection((s) => s.owned); // re-render as the collection grows
  if (!p.day || !p.week) return <Screen><Header title={t('missions.title')} left={<BackButton onPress={() => goBack()} />} /></Screen>;
  const snap = snapshot(p.stats);
  const done = ACHIEVEMENTS.filter((a) => p.unlocked[a.id]).length;

  const row = (m: Mission, weekly: boolean) => {
    const n = missionProgress(m, p.stats, weekly ? p.weekBase : p.dayBase);
    const claimed = p.claimed.includes(`${weekly ? p.week : p.day}:${m.id}`);
    const ready = n >= m.target && !claimed;
    return (
      <Card key={m.id} style={[styles.mission, ready && { borderColor: C.gold }]}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.mTitle}>{t(`stat.${m.stat}`)}</Text>
          <View style={styles.bar}><View style={[styles.fill, { width: `${(n / m.target) * 100}%`, backgroundColor: claimed ? C.muted : C.neon }]} /></View>
          <View style={styles.subRow}><Text style={styles.mSub}>{n}/{m.target}{m.reward ? ' ·' : ''}</Text>{m.reward && <><Icon name="gift" size={16} /><Text style={styles.mSub}>{t(`collect.t_${m.reward}`)}</Text></>}</View>
        </View>
        {claimed
          ? <Text style={styles.claimed}>✓ {t('missions.claimed')}</Text>
          : <Button label={t('missions.claim')} variant={ready ? 'gold' : 'secondary'} disabled={!ready}
              onPress={() => { if (useProgress.getState().claim(m.id)) feel('fanfare'); }} testID={`claim-${m.id}`} />}
      </Card>
    );
  };

  return (
    <Screen tint={C.neon}>
      <Header title={t('missions.title')} left={<BackButton onPress={() => goBack()} />} />
      {useCollection.getState().pending.length > 0 && (
        <Button label={t('collect.claim')} icon={<Icon name="gift" size={22} />} variant="gold" onPress={() => router.push('/packs')} />
      )}

      <Label>{t('missions.daily')}</Label>
      {dailyMissions(p.day).map((m) => row(m, false))}
      <Text style={styles.reset}>{t('missions.resetsDaily')}</Text>

      <Label>{t('missions.weekly')}</Label>
      {weeklyMissions(p.day).map((m) => row(m, true))}
      <Text style={styles.reset}>{t('missions.resetsWeekly')}</Text>

      <Label>{t('missions.achievements')} · {done}/{ACHIEVEMENTS.length}</Label>
      <View style={styles.grid} testID="achievements">
        {ACHIEVEMENTS.map((a) => {
          const got = !!p.unlocked[a.id];
          const v = Math.min(a.target, valueOf(snap, a.stat));
          return (
            <View key={a.id} style={[styles.ach, { borderColor: got ? MEDAL[a.tier] : C.line, opacity: got ? 1 : 0.6 }]}
              accessibilityLabel={`${t(`ach.${a.id}`)}: ${t(`stat.${a.stat}`)} ${v}/${a.target}`}>
              <View style={!got ? { opacity: 0.35 } : undefined}><Icon name={achievementIcon(a)} size={36} /></View>
              <Text style={styles.achName} numberOfLines={1}>{t(`ach.${a.id}`)}</Text>
              <Text style={styles.achDesc} numberOfLines={2}>{t(`stat.${a.stat}`)}</Text>
              <Text style={[styles.achProg, { color: got ? MEDAL[a.tier] : C.muted }]}>
                {got ? `✓ ${t(`missions.${a.tier}`)}` : `${v}/${a.target}`}{a.reward && !got ? ' +' : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mission: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  mTitle: { color: C.text, fontWeight: '800', fontSize: 15 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mSub: { color: C.muted, fontSize: 12 },
  bar: { height: 6, borderRadius: R.pill, backgroundColor: C.surface2, overflow: 'hidden' },
  fill: { height: 6 },
  claimed: { color: C.neon, fontWeight: '800' },
  reset: { color: C.muted, fontSize: 12, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, justifyContent: 'center' },
  ach: { width: 106, minHeight: 128, borderWidth: 1.5, borderRadius: R.md, backgroundColor: C.surface, padding: S.sm, alignItems: 'center', gap: 3 },
  achIcon: { fontSize: 28 },
  achName: { color: C.text, fontWeight: '900', fontSize: 12, textAlign: 'center' },
  achDesc: { color: C.muted, fontSize: 10, textAlign: 'center' },
  achProg: { fontSize: 11, fontWeight: '800', marginTop: 'auto' },
});
