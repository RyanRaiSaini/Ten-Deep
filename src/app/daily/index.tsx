import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { dailyKey } from '../../engine/daily';
import { useDaily } from '../../store/daily';
import { useGame } from '../../store/game';
import { BackButton, Card, Header, Label, Screen } from '../../ui/components';
import { C, F, S } from '../../ui/theme';

const ROUTE: Record<string, '/draft' | '/season' | '/deadline' | '/playoffs' | '/result'> = {
  draft: '/draft', season: '/season', deadline: '/deadline', playoffs: '/playoffs', result: '/result',
};

export default function DailyHub() {
  const { t } = useTranslation();
  const [key] = useState(() => dailyKey());
  const day = useDaily((s) => s.days[key]) ?? {};
  const g = useGame();
  const [confirmReplace, setConfirmReplace] = useState(false);
  const dailyLive = g.daily === key && g.phase !== 'idle';
  const otherRunLive = g.phase !== 'idle' && g.daily !== key;

  const openDraft = () => {
    if (otherRunLive && !day.draftStarted && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    const r = g.newDaily(key);
    if (r !== 'locked') router.push(ROUTE[useGame.getState().phase] ?? '/draft');
  };
  const draftStatus = day.draft
    ? `${day.draft.wins}-${day.draft.losses}${day.draft.champion ? ' 🏆' : ''}`
    : dailyLive ? null : day.draftStarted ? t('daily.missed') : null;

  const items = [
    {
      id: 'draft', title: t('daily.draft'), desc: t('daily.draftDesc'), accent: C.hardwood,
      status: draftStatus,
      cta: dailyLive ? t('daily.resume') : undefined,
      open: openDraft,
    },
    {
      id: 'trivia', title: t('daily.trivia'), desc: t('daily.triviaDesc'), accent: C.neon,
      status: day.trivia !== undefined ? `${day.trivia}/5` : null,
      open: () => router.push('/daily/trivia'),
    },
    {
      id: 'rank', title: t('daily.rank'), desc: t('daily.rankDesc'), accent: C.gold,
      status: day.rank !== undefined ? `${day.rank}/5` : null,
      open: () => router.push('/daily/rank?kind=players'),
    },
    {
      id: 'team-rank', title: t('daily.teamRank'), desc: t('daily.teamRankDesc'), accent: '#7C5CFF',
      status: day.teamRank !== undefined ? `${day.teamRank}/5` : null,
      open: () => router.push('/daily/rank?kind=teams'),
    },
    {
      id: 'derby', title: t('daily.derby'), desc: t('daily.derbyDesc'), accent: C.danger,
      status: day.derby !== undefined ? `${day.derby}/5` : null,
      open: () => router.push('/daily/pick?kind=derby'),
    },
    {
      id: 'team-duel', title: t('daily.teamDuel'), desc: t('daily.teamDuelDesc'), accent: '#3B5BFF',
      status: day.teamDuel !== undefined ? (day.teamDuel ? '✓' : '✗') : null,
      open: () => router.push('/daily/pick?kind=duel'),
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
          <Text style={[styles.status, { color: it.status ? C.text : it.accent }]}>{it.status ?? (('cta' in it && it.cta) || t('daily.play'))}</Text>
        </Card>
      ))}
      {confirmReplace && <Text style={[styles.desc, { color: C.gold, textAlign: 'center' }]} testID="replace-warning">{t('daily.replaceRun')}</Text>}
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
