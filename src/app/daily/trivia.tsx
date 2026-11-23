import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../ui/Text';
import { feel } from '../../audio/feel';
import { MODE_BY_ID } from '../../data';
import { dailyKey, dailyTrivia } from '../../engine/daily';
import { useDaily } from '../../store/daily';
import { BackButton, Button, Card, Header, Label, Screen } from '../../ui/components';
import { C, F, R, S } from '../../ui/theme';
import { goBack } from '../../ui/nav';

export default function Trivia() {
  const { t } = useTranslation();
  // Freeze the day on open: content must not change if midnight passes mid-challenge.
  const [key] = useState(() => dailyKey());
  const questions = useMemo(() => dailyTrivia(MODE_BY_ID['all-time'].pool, key), [key]);
  const already = useDaily((s) => s.days[key]?.trivia);
  const record = useDaily((s) => s.record);
  const saveProgress = useDaily((s) => s.saveProgress);
  // Resume saved progress: answers are saved the moment they're made, so backing out can't reset the quiz.
  const saved = useDaily.getState().days[key]?.progress?.trivia;
  const [i, setI] = useState(saved?.i ?? 0);
  const [picked, setPicked] = useState<string | null>(saved?.picked ?? null);
  const [score, setScore] = useState(saved?.score ?? 0);
  // "Finished" means finished before this visit; a result recorded on the last answer still shows its reveal.
  const [doneOnOpen] = useState(already !== undefined);
  const finished = doneOnOpen || i >= questions.length;

  const choose = (c: string) => {
    if (picked) return;
    const right = c === questions[i].answer;
    const nextScore = score + (right ? 1 : 0);
    setPicked(c);
    setScore(nextScore);
    saveProgress(key, 'trivia', { i, score: nextScore, picked: c });
    if (i === questions.length - 1) record(key, 'trivia', nextScore);
    feel(right ? 'swish' : 'buzzer');
  };
  const next = () => {
    saveProgress(key, 'trivia', { i: i + 1, score, picked: null });
    setPicked(null);
    setI((n) => n + 1);
  };

  const q = questions[Math.min(i, questions.length - 1)];
  const prompt = q.kind === 'highest' ? t('daily.highest') : t('daily.teamQ', { name: q.players[0].name, season: q.season });

  return (
    <Screen>
      <Header title={t('daily.trivia')} left={<BackButton onPress={() => goBack()} />} />
      {finished ? (
        <Card style={{ alignItems: 'center', gap: S.md, paddingVertical: S.xxl }}>
          <Text style={styles.big} testID="trivia-score">{t('daily.yourScore', { n: already ?? score })}</Text>
          <Text style={styles.muted}>{t('daily.tomorrow')}</Text>
          <Button label={t('daily.done')} onPress={() => goBack()} testID="trivia-done" />
        </Card>
      ) : (
        <>
          <Label>{`${i + 1} / ${questions.length}`}</Label>
          <Text style={styles.prompt}>{prompt}</Text>
          <View style={{ gap: S.sm }}>
            {q.choices.map((c) => {
              const isAnswer = c === q.answer;
              const bg = !picked ? C.surface2 : isAnswer ? C.neon : c === picked ? C.danger : C.surface2;
              return (
                <Pressable key={c} testID="trivia-choice" onPress={() => choose(c)} style={[styles.choice, { backgroundColor: bg }]}>
                  <Text style={[styles.choiceText, picked && (isAnswer || c === picked) && { color: C.bg }]}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
          {picked && (
            <>
              <Text style={[styles.verdict, { color: picked === q.answer ? C.neon : C.danger }]}>
                {picked === q.answer ? t('daily.correct') : t('daily.wrong', { answer: q.answer })}
              </Text>
              <Button label={t('daily.next')} onPress={next} testID="trivia-next" />
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  prompt: { color: C.text, fontSize: 22, lineHeight: 30, ...F.display },
  choice: { padding: S.lg, borderRadius: R.md },
  choiceText: { color: C.text, fontSize: 16, fontWeight: '800' },
  verdict: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  big: { color: C.text, fontSize: 30, ...F.display },
  muted: { color: C.muted },
});
