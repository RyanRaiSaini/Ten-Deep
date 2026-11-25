/** Shared pieces for the daily mini-games: progress pips, answer cards and the score card. */
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Display } from './components';
import { DailyTimer } from './DailyTimer';
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
  // A jumbotron: night arena, spotlights, glowing stars, the score in lights, and the countdown to tomorrow.
  return (
    <View style={styles.card}>
      <LinearGradient colors={['#1C2A57', '#101734']} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(255,236,190,0.28)', 'rgba(255,236,190,0)']} style={[styles.beam, { left: '8%', transform: [{ rotate: '-18deg' }] }]} />
      <LinearGradient colors={['rgba(255,236,190,0.28)', 'rgba(255,236,190,0)']} style={[styles.beam, { right: '8%', transform: [{ rotate: '18deg' }] }]} />
      <View style={styles.stars}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.star, { opacity: i < score ? 1 : 0.22, transform: [{ translateY: i === Math.floor(total / 2) ? -10 : 0 }] }]}>
            <Icon name="star" size={i === Math.floor(total / 2) ? 52 : 40} />
          </View>
        ))}
      </View>
      <Display size={headline ? 30 : 76} color={score === total && !headline ? '#FFC53D' : '#FFFFFF'} extrude="#7A4DFF" testID={testID}>{headline ?? `${score}/${total}`}</Display>
      <Text style={styles.note}>{t('daily.tomorrow')}</Text>
      <DailyTimer small />
      <Button label={t('daily.done')} variant="gold" onPress={onDone} testID={doneTestID} style={{ alignSelf: 'stretch', marginTop: S.sm }} />
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
    alignItems: 'center', gap: S.md, paddingVertical: S.xl, paddingHorizontal: S.lg, borderRadius: 26, overflow: 'hidden',
    borderWidth: 3, borderColor: C.ink, borderBottomWidth: 8, marginTop: S.lg,
  },
  beam: { position: 'absolute', top: -40, width: 110, height: 320 },
  stars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  star: {},
  note: { color: '#C9D2EE', fontWeight: '800', textAlign: 'center' },
});
