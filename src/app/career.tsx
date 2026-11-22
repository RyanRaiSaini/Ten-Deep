import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { seasonLabel } from '../engine/career/offseason';
import { useCareer } from '../store/career';
import { useGame } from '../store/game';
import { BackButton, Button, Card, Header, Label, Screen } from '../ui/components';
import { C, F, R, S } from '../ui/theme';

const VERDICT_ICON = { legend: '👑', extended: '✍️', survived: '😐', fired: '🔥' } as const;
const ROUTE: Record<string, '/draft' | '/season' | '/deadline' | '/crisis' | '/playoffs' | '/result'> = {
  draft: '/draft', season: '/season', deadline: '/deadline', crisis: '/crisis', playoffs: '/playoffs', result: '/result',
};

/** Career hub: season, job security, history, and the next thing to do. */
export default function Career() {
  const { t } = useTranslation();
  const c = useCareer();
  const g = useGame();
  const titles = c.history.filter((h) => h.result === 'champion').length;
  const secColor = c.security >= 60 ? C.neon : c.security >= 30 ? C.gold : C.danger;

  const next = (() => {
    if (!c.active || c.ended) return null;
    if (c.step) return { label: t('career.toOffseason'), go: () => router.push('/offseason') };
    if (g.career && g.phase !== 'idle' && g.phase !== 'result') return { label: t('career.resume'), go: () => router.push(ROUTE[g.phase]) };
    if (c.history.length >= c.season) return { label: t('career.toOffseason'), go: () => { c.beginOffseason(); router.push('/offseason'); } };
    return { label: t('career.resume'), go: () => router.push(g.career && g.phase !== 'idle' ? ROUTE[g.phase] : '/draft') };
  })();

  return (
    <Screen>
      <Header title={t('career.title')} left={<BackButton onPress={() => router.back()} />} />

      {(!c.active || c.ended) && (
        <Card style={{ gap: S.md }}>
          {c.ended ? (
            <>
              <Text style={styles.big} testID="career-over">🔥 {t('career.over')}</Text>
              <Text style={styles.body}>{t('career.overDesc', { n: c.history.length, titles })}</Text>
            </>
          ) : (
            <Text style={styles.body}>{t('career.desc')}</Text>
          )}
          <Button label={c.ended ? t('career.newCareer') : t('career.start')} onPress={() => { c.start(); router.push('/draft'); }} testID="career-start" />
        </Card>
      )}

      {c.active && !c.ended && (
        <Card style={{ gap: S.sm }}>
          <View style={styles.row}>
            <Text style={styles.season}>{t('career.season', { n: c.season })}</Text>
            <Text style={styles.label}>{seasonLabel(c.season)}</Text>
          </View>
          <Label>{t('career.security')}</Label>
          <View style={styles.bar}><View style={[styles.fill, { width: `${c.security}%`, backgroundColor: secColor }]} /></View>
          <Text style={[styles.secNum, { color: secColor }]} testID="career-security">{c.security}/100</Text>
          {next && <Button label={next.label} variant="gold" onPress={next.go} testID="career-next" />}
        </Card>
      )}

      <Label>{t('career.history')}</Label>
      {c.history.length === 0 && <Text style={styles.muted}>{t('career.noHistory')}</Text>}
      {[...c.history].reverse().map((h) => (
        <Card key={h.label} style={styles.histRow}>
          <Text style={styles.histLabel}>{h.label}</Text>
          <Text style={styles.histRecord}>{h.wins}-{h.losses}</Text>
          <Text style={styles.histResult} numberOfLines={1}>{h.result === 'champion' ? '🏆 ' : ''}{t(`career.r_${h.result}`)}</Text>
          <Text style={styles.histVerdict}>{VERDICT_ICON[h.verdict]}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: { color: C.danger, fontSize: 26, ...F.display },
  body: { color: C.text, fontSize: 15, lineHeight: 22 },
  muted: { color: C.muted },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  season: { color: C.text, fontSize: 26, ...F.display },
  label: { color: C.muted, fontWeight: '800' },
  bar: { height: 10, borderRadius: R.pill, backgroundColor: C.surface2, overflow: 'hidden' },
  fill: { height: 10 },
  secNum: { fontWeight: '900', textAlign: 'right' },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  histLabel: { color: C.muted, width: 64, fontWeight: '700' },
  histRecord: { color: C.text, width: 56, fontWeight: '900' },
  histResult: { color: C.text, flex: 1 },
  histVerdict: { fontSize: 20 },
});
