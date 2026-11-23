import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../ui/Text';
import { feel } from '../../audio/feel';
import { HISTORY, MODE_BY_ID } from '../../data/modes';
import { dailyKey, dailyRank, dailyTeamRank, scoreRank, teamStrengthScore } from '../../engine/daily';
import { useDaily } from '../../store/daily';
import { BackButton, Button, Header, Label, Screen } from '../../ui/components';
import { C, F, R, S, ovrColor } from '../../ui/theme';
import { goBack } from '../../ui/nav';
import { ScoreCard } from '../../ui/dailyKit';

interface Item { id: string; title: string; sub: string; value: number }

/** Put five things in order: players by rating (`?kind=players`) or historic teams by strength (`?kind=teams`). */
export default function Rank() {
  const { kind = 'players' } = useLocalSearchParams<{ kind?: 'players' | 'teams' }>();
  const teams = kind === 'teams';
  const { t } = useTranslation();
  // Freeze the day on open: content must not change if midnight passes mid-challenge.
  const [key] = useState(() => dailyKey());
  const field = teams ? 'teamRank' : 'rank';

  const { items, answer } = useMemo(() => {
    if (teams) {
      const c = dailyTeamRank(HISTORY, key);
      return {
        answer: c.answer,
        items: c.teams.map((x): Item => ({ id: x.id, title: x.label, sub: x.city, value: Math.round(teamStrengthScore(x) * 10) / 10 })),
      };
    }
    const pool = MODE_BY_ID['all-time'].pool;
    const c = dailyRank(pool, key);
    return {
      answer: c.answer,
      items: c.players.map((p): Item => ({
        id: p.id, title: p.name, sub: `${p.pos} · ${pool.teams.find((tm) => tm.players.includes(p))?.label ?? ''}`, value: p.ovr,
      })),
    };
  }, [teams, key]);

  const already = useDaily((s) => s.days[key]?.[field]);
  const record = useDaily((s) => s.record);
  const [order, setOrder] = useState(() => items.map((i) => i.id));
  const [revisit] = useState(already !== undefined);
  const [submitted, setSubmitted] = useState(revisit);
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const shown = submitted ? answer : order;
  const score = scoreRank(order, answer);

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrder(next);
    feel('tick');
  };
  const submit = () => {
    record(key, field, score);
    setSubmitted(true);
    feel(score >= 4 ? 'fanfare' : score >= 2 ? 'swish' : 'buzzer');
  };

  return (
    <Screen>
      <Header title={teams ? t('daily.teamRank') : t('daily.rank')} left={<BackButton onPress={() => goBack()} />} />
      <Label>{teams ? t('daily.teamRankHint') : t('daily.rankHint')}</Label>
      <View style={{ gap: S.sm }}>
        {shown.map((id, idx) => {
          const it = byId[id];
          // Revisits only know the score, not the old guess, so per-row marks show for a fresh submit only.
          const right = submitted && !revisit && order[idx] === answer[idx];
          return (
            <View key={id} style={[styles.row, submitted && !revisit && { borderColor: right ? C.neon : C.line }]}>
              <Text style={styles.pos}>{idx + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{it.title}</Text>
                <Text style={styles.meta}>{it.sub}</Text>
              </View>
              {submitted ? (
                <Text style={[styles.ovr, { color: ovrColor(Math.round(it.value)) }]}>{it.value}</Text>
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
          <ScoreCard score={already ?? score} total={5} onDone={() => goBack()} testID="rank-score" />
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
