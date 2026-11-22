import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { MODES } from '../../data';
import { useGame } from '../../store/game';
import { BackButton, Card, Header, Screen } from '../../ui/components';
import { C, F, S } from '../../ui/theme';

/** Pick a franchise or an era, then start a draft in it. */
export default function ModePicker() {
  const { kind } = useLocalSearchParams<{ kind: 'franchise' | 'era' }>();
  const { t } = useTranslation();
  const newRun = useGame((s) => s.newRun);
  const list = MODES.filter((m) => m.kind === kind);

  return (
    <Screen>
      <Header title={kind === 'era' ? t('modes.pickEra') : t('modes.pickFranchise')} left={<BackButton onPress={() => router.back()} />} />
      {list.map((m) => {
        const players = m.pool.teams.reduce((n, x) => n + x.players.length, 0);
        const years = m.pool.teams.map((x) => parseInt(x.season, 10));
        return (
          <Card
            key={m.id}
            style={[styles.card, { borderColor: m.colors[0] }]}
            onPress={() => { newRun(m.id); router.replace('/draft'); }}
          >
            <View style={[styles.swatch, { backgroundColor: m.colors[0], borderColor: m.colors[1] }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.title} testID={`mode-${m.id}`}>{m.title}</Text>
              <Text style={styles.sub}>
                {Math.min(...years)}–{Math.max(...years)} · {t('modes.players', { n: players })}
              </Text>
            </View>
            <Text style={styles.go}>›</Text>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.lg },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 3 },
  title: { color: C.text, fontSize: 18, ...F.display },
  sub: { color: C.muted, fontSize: 13 },
  go: { color: C.muted, fontSize: 22 },
});
