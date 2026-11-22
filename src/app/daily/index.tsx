import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { dailyKey } from '../../engine/daily';
import { useDaily } from '../../store/daily';
import { useGame } from '../../store/game';
import { BackButton, Card, Header, Label, Screen } from '../../ui/components';
import { C, F, S } from '../../ui/theme';

export default function DailyHub() {
  const { t } = useTranslation();
  const key = dailyKey();
  const day = useDaily((s) => s.days[key]) ?? {};
  const newDaily = useGame((s) => s.newDaily);

  const items = [
    {
      id: 'draft', title: t('daily.draft'), desc: t('daily.draftDesc'), accent: C.hardwood,
      status: day.draft ? `${day.draft.wins}-${day.draft.losses}${day.draft.champion ? ' 🏆' : ''}` : null,
      open: () => { newDaily(key); router.push('/draft'); },
    },
    {
      id: 'trivia', title: t('daily.trivia'), desc: t('daily.triviaDesc'), accent: C.neon,
      status: day.trivia !== undefined ? `${day.trivia}/5` : null,
      open: () => router.push('/daily/trivia'),
    },
    {
      id: 'rank', title: t('daily.rank'), desc: t('daily.rankDesc'), accent: C.gold,
      status: day.rank !== undefined ? `${day.rank}/5` : null,
      open: () => router.push('/daily/rank'),
    },
  ];

  return (
    <Screen>
      <Header title={t('daily.title')} left={<BackButton onPress={() => router.back()} />} />
      <Label>{key}</Label>
      {items.map((it) => (
        <Card key={it.id} style={[styles.card, { borderColor: it.status ? C.line : it.accent }]} onPress={it.status ? undefined : it.open}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.title} testID={`daily-${it.id}`}>{it.title}</Text>
            <Text style={styles.desc}>{it.desc}</Text>
          </View>
          <Text style={[styles.status, { color: it.status ? C.text : it.accent }]}>{it.status ?? t('daily.play')}</Text>
        </Card>
      ))}
      <Text style={styles.desc}>{t('daily.tomorrow')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.lg },
  title: { color: C.text, fontSize: 18, ...F.display },
  desc: { color: C.muted, fontSize: 13 },
  status: { fontWeight: '900', fontSize: 16 },
});
