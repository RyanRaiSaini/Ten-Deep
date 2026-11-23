import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { feel } from '../audio/feel';
import { useReducedMotion } from './fx';
import { Button } from './components';
import { C, R, S } from './theme';

const SHOWN = 14;

/** The draft lottery, revealed from pick 14 up to pick 1, one ball at a time. */
export function LotteryReveal({ order, names }: { order: number[]; names: (team: number) => string }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const top = useMemo(() => order.slice(0, SHOWN), [order]);
  const [revealed, setRevealed] = useState(0);
  // Reduce-motion resolves after the first render: skip straight to the full order.
  useEffect(() => { if (reduce) setRevealed(SHOWN); }, [reduce]);
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (revealed >= SHOWN) return;
    const id = setTimeout(() => {
      setRevealed((n) => n + 1);
      const pick = SHOWN - revealed - 1;
      feel(top[pick] === 0 ? 'fanfare' : 'swish');
      pop.setValue(0.6);
      Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: Platform.OS !== 'web' }).start();
    }, revealed === 0 ? 400 : 260);
    return () => clearTimeout(id);
  }, [revealed, pop, top]);

  return (
    <View style={styles.box} testID="lottery">
      <Text style={styles.title}>🎱 {t('career.lottery')}</Text>
      <View style={{ gap: 4 }}>
        {top.map((team, i) => {
          const shown = SHOWN - i <= revealed;
          const newest = SHOWN - i === revealed;
          return (
            <Animated.View key={i} style={[styles.row, team === 0 && shown && styles.mine, newest && { transform: [{ scale: pop }] }]}>
              <View style={[styles.ball, shown && { backgroundColor: team === 0 ? C.gold : C.hardwood }]}><Text style={styles.ballText}>{i + 1}</Text></View>
              <Text style={[styles.team, team === 0 && { color: C.gold }]} numberOfLines={1}>{shown ? names(team) : '· · ·'}</Text>
            </Animated.View>
          );
        })}
      </View>
      {revealed < SHOWN && <Button label={t('career.lotterySkip')} variant="ghost" onPress={() => setRevealed(SHOWN)} testID="lottery-skip" />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: S.lg, gap: S.md },
  title: { color: C.text, fontWeight: '900', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: 2, paddingHorizontal: 4, borderRadius: R.sm },
  mine: { backgroundColor: 'rgba(245,196,81,0.12)' },
  ball: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  ballText: { color: C.bg, fontWeight: '900', fontSize: 12 },
  team: { color: C.text, fontWeight: '700', flex: 1 },
});
