import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { feel } from '../../audio/feel';
import { MODE_BY_ID } from '../../data';
import { dailyKey, dailyRank, scoreRank } from '../../engine/daily';
import { useDaily } from '../../store/daily';
import { BackButton, Button, Header, Label, Screen } from '../../ui/components';
import { C, F, R, S, ovrColor } from '../../ui/theme';

export default function Rank() {
  const { t } = useTranslation();
  const key = dailyKey();
  const challenge = useMemo(() => dailyRank(MODE_BY_ID['all-time'].pool, key), [key]);
  const already = useDaily((s) => s.days[key]?.rank);
  const record = useDaily((s) => s.record);
  const [order, setOrder] = useState(() => challenge.players.map((p) => p.id));
  const [submitted, setSubmitted] = useState(already !== undefined);
  const byId = Object.fromEntries(challenge.players.map((p) => [p.id, p]));
  const shown = submitted ? challenge.answer : order;
  const score = scoreRank(order, challenge.answer);

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrder(next);
    feel('tick');
  };
  const submit = () => {
    record(key, 'rank', score);
    setSubmitted(true);
    feel(score >= 4 ? 'fanfare' : score >= 2 ? 'swish' : 'buzzer');
  };

  return (
    <Screen>
      <Header title={t('daily.rank')} left={<BackButton onPress={() => router.back()} />} />
      <Label>{t('daily.rankHint')}</Label>
      <View style={{ gap: S.sm }}>
        {shown.map((id, idx) => {
          const p = byId[id];
          const right = submitted && order[idx] === challenge.answer[idx];
          return (
            <View key={id} style={[styles.row, submitted && { borderColor: right ? C.neon : C.line }]}>
              <Text style={styles.pos}>{idx + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.meta}>{p.pos} · {byId[id] && MODE_BY_ID['all-time'].pool.teams.find((tm) => tm.players.includes(p))?.label}</Text>
              </View>
              {submitted ? (
                <Text style={[styles.ovr, { color: ovrColor(p.ovr) }]}>{p.ovr}</Text>
              ) : (
                <View style={styles.arrows}>
                  <Pressable onPress={() => move(idx, -1)} style={styles.arrow} testID={`up-${idx}`}><Text style={styles.arrowText}>▲</Text></Pressable>
                  <Pressable onPress={() => move(idx, 1)} style={styles.arrow} testID={`down-${idx}`}><Text style={styles.arrowText}>▼</Text></Pressable>
                </View>
              )}
            </View>
          );
        })}
      </View>
      {submitted ? (
        <>
          <Text style={styles.big} testID="rank-score">{t('daily.yourScore', { n: already ?? score })}</Text>
          <Button label={t('daily.done')} onPress={() => router.back()} />
        </>
      ) : (
        <Button label={t('daily.submit')} onPress={submit} testID="rank-submit" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.line },
  pos: { color: C.muted, fontSize: 18, width: 22, ...F.display },
  name: { color: C.text, fontSize: 16, fontWeight: '800' },
  meta: { color: C.muted, fontSize: 12 },
  ovr: { fontSize: 24, ...F.display },
  arrows: { flexDirection: 'row', gap: 6 },
  arrow: { width: 40, height: 40, borderRadius: R.sm, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: C.text, fontSize: 14 },
  big: { color: C.text, fontSize: 26, textAlign: 'center', ...F.display },
});
