import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../ui/Text';
import { feel } from '../../audio/feel';
import { HISTORY, MODE_BY_ID } from '../../data/modes';
import { dailyDerby, dailyKey, dailyTeamDuel, teamStrengthScore } from '../../engine/daily';
import { useDaily } from '../../store/daily';
import { BackButton, Button, Card, Header, Label, Screen } from '../../ui/components';
import { C, F, R, S, ovrColor } from '../../ui/theme';
import { goBack } from '../../ui/nav';
import { Pips, ScoreCard } from '../../ui/dailyKit';
import { Icon } from '../../ui/icons';

interface Side { id: string; title: string; sub: string; value: string }
interface Round { a: Side; b: Side; winner: string; reveal?: string[] }

/** "Who wins?" challenges: 1v1 Derby (`?kind=derby`, 5 rounds) and Team Duel (`?kind=duel`, 1 best-of-7). */
export default function Pick() {
  const { kind = 'derby' } = useLocalSearchParams<{ kind?: 'derby' | 'duel' }>();
  const duel = kind === 'duel';
  const field = duel ? 'teamDuel' : 'derby';
  const { t } = useTranslation();
  // Freeze the day on open: content must not change if midnight passes mid-challenge.
  const [key] = useState(() => dailyKey());

  const rounds = useMemo((): Round[] => {
    if (duel) {
      const d = dailyTeamDuel(HISTORY, key);
      const side = (x: typeof d.a): Side => ({ id: x.id, title: x.label, sub: x.city, value: (Math.round(teamStrengthScore(x) * 10) / 10).toString() });
      const winnerTeam = d.winner === d.a.id ? d.a : d.b;
      return [{
        a: side(d.a), b: side(d.b), winner: d.winner,
        reveal: [
          ...d.games.map((g, i) => `G${i + 1}  ${g.scoreA}-${g.scoreB}`),
          t('daily.seriesWon', { team: winnerTeam.label, w: 4, l: Math.min(d.winsA, d.winsB) }),
        ],
      }];
    }
    const pool = MODE_BY_ID['all-time'].pool;
    const team = (id: string) => pool.teams.find((tm) => tm.players.some((p) => p.id === id))?.label ?? '';
    return dailyDerby(pool, key).map((m) => ({
      a: { id: m.a.id, title: m.a.name, sub: `${m.a.pos} · ${team(m.a.id)}`, value: String(m.a.ovr) },
      b: { id: m.b.id, title: m.b.name, sub: `${m.b.pos} · ${team(m.b.id)}`, value: String(m.b.ovr) },
      winner: m.winner,
    }));
  }, [duel, key, t]);

  const already = useDaily((s) => s.days[key]?.[field]);
  const record = useDaily((s) => s.record);
  const saveProgress = useDaily((s) => s.saveProgress);
  // Resume saved progress: a pick is saved (and the last one recorded) the moment it's made.
  const saved = useDaily.getState().days[key]?.progress?.[field];
  const [i, setI] = useState(saved?.i ?? 0);
  const [picked, setPicked] = useState<string | null>(saved?.picked ?? null);
  const [score, setScore] = useState(saved?.score ?? 0);
  // "Finished" means finished before this visit; a result recorded on the last answer still shows its reveal.
  const [doneOnOpen] = useState(already !== undefined);
  const finished = doneOnOpen || i >= rounds.length;
  const r = rounds[Math.min(i, rounds.length - 1)];

  const choose = (id: string) => {
    if (picked) return;
    const right = id === r.winner;
    const nextScore = score + (right ? 1 : 0);
    setPicked(id);
    setScore(nextScore);
    saveProgress(key, field, { i, score: nextScore, picked: id });
    if (i === rounds.length - 1) record(key, field, nextScore);
    feel(right ? (duel ? 'fanfare' : 'swish') : 'buzzer');
  };
  const next = () => {
    saveProgress(key, field, { i: i + 1, score, picked: null });
    setPicked(null);
    setI((n) => n + 1);
  };

  const sideCard = (s: Side) => {
    const isWinner = s.id === r.winner;
    const border = !picked ? C.line : isWinner ? C.neon : s.id === picked ? C.danger : C.line;
    return (
      <Pressable key={s.id} testID="pick-side" onPress={() => choose(s.id)} style={[styles.side, { borderColor: border }]}>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.sub}>{s.sub}</Text>
        {picked && <Text style={[styles.value, { color: ovrColor(Math.round(Number(s.value))) }]}>{s.value}</Text>}
      </Pressable>
    );
  };

  return (
    <Screen tint={duel ? C.blue : C.danger}>
      <Header title={duel ? t('daily.teamDuel') : t('daily.derby')} left={<BackButton onPress={() => goBack()} />} />
      {finished ? (
        <ScoreCard
          score={already ?? score}
          total={duel ? 1 : rounds.length}
          headline={duel ? ((already ?? score) ? t('daily.youGuessed') : t('daily.wrong', { answer: (r.winner === r.a.id ? r.a : r.b).title })) : undefined}
          onDone={() => goBack()}
          testID="pick-score"
          doneTestID="pick-done"
        />
      ) : (
        <>
          {!duel && <Pips total={rounds.length} at={i} />}
          <Text style={styles.prompt}>{t('daily.whoWins')}</Text>
          <View style={{ gap: S.sm }}>
            {sideCard(r.a)}
            <View style={styles.vsWrap}><Icon name="vs" size={48} /></View>
            {sideCard(r.b)}
          </View>
          {picked && r.reveal && (
            <Card style={{ gap: 4 }}>
              {r.reveal.map((line, k) => <Text key={k} style={k === r.reveal!.length - 1 ? styles.revealLast : styles.reveal}>{line}</Text>)}
            </Card>
          )}
          {picked && <Button label={t('daily.next')} onPress={next} testID="pick-next" />}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  prompt: { color: C.text, fontSize: 24, ...F.display },
  side: { padding: S.lg, borderRadius: R.md + 4, borderWidth: 2.5, backgroundColor: '#FFFFFF', gap: 2, borderBottomWidth: 7 },
  title: { color: C.text, fontSize: 18, fontWeight: '900' },
  sub: { color: C.muted, fontSize: 13 },
  value: { fontSize: 26, ...F.display },
  vs: { color: C.muted, textAlign: 'center', fontWeight: '800' },
  vsWrap: { alignItems: 'center', marginVertical: -18, zIndex: 2 },
  reveal: { color: C.text, fontWeight: '700' },
  revealLast: { color: C.neon, fontWeight: '900', marginTop: 4 },
  big: { color: C.text, fontSize: 26, textAlign: 'center', ...F.display },
});
