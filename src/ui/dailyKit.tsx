/** Shared pieces for the daily mini-games: progress pips, answer cards and the score card. */
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Display } from './components';
import { Icon } from './icons';
import { Text } from './Text';
import { C, FONT, R, S } from './theme';

/** "Question 2 of 5" as five pips. */
export function Pips({ total, at }: { total: number; at: number }) {
  return (
    <View style={styles.pips} accessibilityLabel={`${at + 1} / ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.pip, i < at && styles.pipDone, i === at && styles.pipNow]} />
      ))}
    </View>
  );
}

export type ChoiceState = 'idle' | 'right' | 'wrong' | 'dim';
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** An answer as a sticker card with a letter badge; goes green or red once answered. */
export function Choice({ label, index, state, onPress, testID }: { label: string; index: number; state: ChoiceState; onPress: () => void; testID?: string }) {
  const bg = state === 'right' ? '#18C08A' : state === 'wrong' ? C.danger : '#FFFFFF';
  const fg = state === 'right' || state === 'wrong' ? '#FFFFFF' : C.ink;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={state !== 'idle'}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.choice, { backgroundColor: bg, borderColor: state === 'idle' || state === 'dim' ? C.line : C.ink },
        state === 'dim' && { opacity: 0.55 }, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 2 },
      ]}
    >
      <View style={[styles.letter, (state === 'right' || state === 'wrong') && { backgroundColor: '#FFFFFF' }]}>
        <Text style={styles.letterText}>{LETTERS[index]}</Text>
      </View>
      <Text style={[styles.choiceText, { color: fg }]}>{label}</Text>
      {state === 'right' && <Icon name="check" size={26} />}
    </Pressable>
  );
}

/** The result: a big outlined score, stars, the reset note and a big Done. */
export function ScoreCard({
  score, total, headline, onDone, testID, doneTestID,
}: { score: number; total: number; headline?: string; onDone: () => void; testID?: string; doneTestID?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={styles.stars}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ opacity: i < score ? 1 : 0.2, transform: [{ translateY: i === Math.floor(total / 2) ? -8 : 0 }] }}>
            <Icon name="star" size={i === Math.floor(total / 2) ? 46 : 36} />
          </View>
        ))}
      </View>
      <Display size={headline ? 28 : 64} testID={testID}>{headline ?? `${score}/${total}`}</Display>
      <Text style={styles.note}>{t('daily.tomorrow')}</Text>
      <Button label={t('daily.done')} variant="dark" onPress={onDone} testID={doneTestID} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  pips: { flexDirection: 'row', gap: 6, paddingVertical: S.sm },
  pip: { flex: 1, height: 10, borderRadius: R.pill, backgroundColor: C.line },
  pipDone: { backgroundColor: '#18C08A' },
  pipNow: { backgroundColor: C.ink },
  choice: {
    flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.md + 2, borderWidth: 2.5,
    borderBottomWidth: 6, borderBottomColor: C.edge,
  },
  letter: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.ink },
  letterText: { fontFamily: FONT.display, fontSize: 18, color: C.ink },
  choiceText: { flex: 1, fontSize: 17, fontWeight: '900' },
  card: {
    alignItems: 'center', gap: S.md, paddingVertical: S.xl, paddingHorizontal: S.lg, borderRadius: R.lg, backgroundColor: '#FFFFFF',
    borderWidth: 2.5, borderColor: C.ink, borderBottomWidth: 7, marginTop: S.lg,
  },
  stars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  note: { color: C.muted, fontWeight: '800' },
});
