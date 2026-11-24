import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { feel } from '../audio/feel';
import type { TeamSeason } from '../engine/types';
import { useSettings } from '../store/settings';
import { Display } from './components';
import { Text } from './Text';
import { teamGradient } from './teamColors';
import { C, R, S } from './theme';

const native = Platform.OS !== 'web';
export { teamGradient } from './teamColors';

/**
 * Slot-machine reel in team colors: flashes through decoy teams, decelerating, and lands on `target`
 * with a pop. Ticks (sound + haptic) on every team; thunk when it lands.
 */
export function Spinner({
  target, decoys, spinKey, onLanded,
}: { target: TeamSeason | null; decoys: TeamSeason[]; spinKey: number; onLanded: () => void }) {
  const [shown, setShown] = useState<TeamSeason | null>(target);
  // Rolling until the current spin lands (derived, so a new spinKey shows rolling on the very next render).
  const [landedKey, setLandedKey] = useState(0);
  const rolling = spinKey !== 0 && landedKey !== spinKey;
  const speed = useSettings((s) => s.simSpeed);
  const landed = useRef(onLanded);
  useEffect(() => { landed.current = onLanded; }, [onLanded]);
  const [pop] = useState(() => new Animated.Value(1));
  const latest = useRef(target);
  useEffect(() => { latest.current = target; }, [target]);

  useEffect(() => {
    if (spinKey === 0) return;
    const steps = 16;
    const factor = speed >= 4 ? 0.35 : speed >= 2 ? 0.6 : 1;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      i++;
      if (i >= steps) {
        setShown(latest.current);
        setLandedKey(spinKey);
        feel('thunk');
        pop.setValue(0.86);
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: native }).start();
        landed.current();
        return;
      }
      setShown(decoys[Math.floor(Math.random() * decoys.length)] ?? null);
      feel('tick');
      timer = setTimeout(next, (40 + i * i * 2.2) * factor);
    };
    next();
    return () => clearTimeout(timer);
    // spinKey drives a new roll; the target is read when it lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  const team = shown;
  const [top, bottom] = team ? teamGradient(team.colors) : [C.ink, '#000000'];
  return (
    <Animated.View style={[styles.reel, { transform: [{ scale: pop }] }]} testID="reel">
      <LinearGradient colors={[top, bottom]} style={StyleSheet.absoluteFill} />
      <View style={[styles.stripe, { backgroundColor: team?.colors[1] ?? C.hardwood }]} />
      {team && (
        <View style={styles.body}>
          <Text style={styles.season}>{team.season.includes('-') ? team.season : team.season}</Text>
          <Display size={rolling ? 26 : 32}>{rolling ? team.name : team.label.replace(/^\d{4}(-\d\d)?\s/, '')}</Display>
          {!rolling && <Text style={styles.city}>{team.city}</Text>}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  reel: {
    height: 120, borderRadius: R.lg, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  stripe: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, opacity: 0.9 },
  body: { alignItems: 'center', paddingHorizontal: S.md },
  season: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 2, fontSize: 13, opacity: 0.9 },
  city: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, opacity: 0.85 },
});
