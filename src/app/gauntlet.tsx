import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { feel } from '../audio/feel';
import { GAUNTLET, lineupRoster, playStage, stageReward } from '../engine/collect/lineup';
import type { SeriesResult } from '../engine/series';
import { levelsOf, useCollection } from '../store/collection';
import { Confetti } from '../ui/fx';
import { BackButton, Button, Card, Header, Screen } from '../ui/components';
import { C, F, R, S } from '../ui/theme';
import { track } from '../store/progress';
import { Icon } from '../ui/icons';
import { goBack } from '../ui/nav';

/** The Gauntlet: 10 great teams in a row, best-of-3 each, with your card lineup. */
export default function Gauntlet() {
  const { t } = useTranslation();
  const col = useCollection();
  const [series, setSeries] = useState<{ stage: number; result: SeriesResult } | null>(null);
  const [shown, setShown] = useState(0);
  const counted = useRef(false);
  const stage = col.gauntlet.cleared;
  const done = stage >= GAUNTLET.length;

  // After the last stage, the final boss stays open for replays (no extra reward).
  const play = (at = Math.min(stage, GAUNTLET.length - 1)) => {
    counted.current = false;
    const result = playStage(lineupRoster(col.lineup, levelsOf(col.owned)), at, `${col.lastDay ?? ''}:${Date.now()}`);
    setSeries({ stage: at, result });
    setShown(0);
    feel('crowd');
  };
  const reveal = () => {
    if (!series) return;
    const next = shown + 1;
    setShown(next);
    if (next >= series.result.games.length) {
      if (counted.current) return; // a fast double tap
      counted.current = true;
      const won = series.result.winner === 'a';
      col.recordStage(series.stage, won);
      track({ type: 'gauntlet' });
      feel(won ? 'fanfare' : 'buzzer');
    } else feel('swish');
  };

  const games = series ? series.result.games.slice(0, shown) : [];
  const finished = !!series && shown >= series.result.games.length;
  const wa = games.filter((g) => g.scoreA > g.scoreB).length;

  const wonSeries = finished && series.result.winner === 'a';
  return (
    <Screen tint={C.gold} overlay={wonSeries ? <Confetti key={series.stage} /> : null}>
      <Header title={t('gauntlet.title')} left={<BackButton onPress={() => goBack()} />} />
      <Text style={styles.desc}>{t('gauntlet.desc')}</Text>

      {series && (
        <Card style={{ gap: S.sm, borderColor: C.gold }}>
          <Text style={styles.vs}>{t('lineup.title')} {wa} – {games.length - wa} {GAUNTLET[series.stage].team.label}</Text>
          {games.map((g, i) => (
            <Text key={i} style={[styles.game, { color: g.scoreA > g.scoreB ? C.neon : C.danger }]}>G{i + 1}   {g.scoreA} – {g.scoreB}</Text>
          ))}
          {!finished && <Button label={t('gauntlet.next', { n: shown + 1 })} onPress={reveal} testID="gauntlet-next" />}
          {finished && (
            <Text style={[styles.verdict, { color: series.result.winner === 'a' ? C.gold : C.danger }]} testID="gauntlet-result">
              {series.result.winner === 'a'
                ? `${t('gauntlet.won', { w: series.result.winsA, l: series.result.winsB })}`
                : t('gauntlet.lost', { w: series.result.winsA, l: series.result.winsB })}
            </Text>
          )}
          {finished && <Button label="OK" variant="secondary" onPress={() => setSeries(null)} testID="gauntlet-ok" />}
        </Card>
      )}

      {!series && !done && <Button label={t('gauntlet.play', { n: stage + 1 })} icon={<Icon name="shield" size={22} />} variant="gold" onPress={() => play()} testID="gauntlet-play" />}
      {done && <View style={{ alignItems: 'center', gap: 4 }}><Icon name="crown" size={56} /><Text style={[styles.verdict, { color: C.gold }]}>{t('gauntlet.complete')}</Text></View>}
      {!series && done && <Button label={t('gauntlet.replay')} icon={<Icon name="shield" size={22} />} variant="secondary" onPress={() => play()} testID="gauntlet-replay" />}
      <Button label={t('gauntlet.editLineup')} variant="ghost" onPress={() => router.push('/lineup')} />

      {GAUNTLET.map((g, i) => {
        const cleared = i < stage;
        const current = i === stage;
        const reward = stageReward(i);
        return (
          <View key={g.team.id} style={[styles.stage, current && styles.current, { opacity: i > stage ? 0.5 : 1 }]}>
            <Text style={styles.stageNo}>{i + 1}</Text>
            <View style={[styles.swatch, { backgroundColor: g.team.colors[0], borderColor: g.team.colors[1] }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.team}>{g.team.label}</Text>
              <Text style={styles.sub}>
                {g.strength.toFixed(1)}{reward ? `  ·  ${t('gauntlet.reward', { pick: t(`collect.t_${reward}`) })}` : ''}
              </Text>
            </View>
            <Text style={[styles.status, { color: cleared ? C.neon : current ? C.gold : C.muted }]}>
              {cleared ? `✓ ${t('gauntlet.cleared')}` : current ? '▶' : ''}
            </Text>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  desc: { color: C.muted, textAlign: 'center' },
  vs: { color: C.text, fontSize: 18, textAlign: 'center', ...F.display },
  game: { fontWeight: '900', textAlign: 'center', fontSize: 16 },
  verdict: { fontSize: 20, textAlign: 'center', ...F.display },
  stage: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.md, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  current: { borderColor: C.gold, borderWidth: 2 },
  stageNo: { color: C.muted, width: 22, fontSize: 18, ...F.display },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 3 },
  team: { color: C.text, fontWeight: '900' },
  sub: { color: C.muted, fontSize: 12 },
  status: { fontWeight: '900' },
});
