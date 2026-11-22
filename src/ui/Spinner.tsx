import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { feel } from '../audio/feel';
import { useSettings } from '../store/settings';
import { C, F, R, S } from './theme';

/**
 * Slot-machine reel: rolls through decoy team labels, decelerating, and lands on `target`.
 * Ticks (sound + haptic) on every label; thunk when it lands.
 */
export function Spinner({
  target, decoys, spinKey, onLanded,
}: { target: string; decoys: string[]; spinKey: number; onLanded: () => void }) {
  const [label, setLabel] = useState(target);
  const [rolling, setRolling] = useState(false);
  const speed = useSettings((s) => s.simSpeed);
  const landed = useRef(onLanded);
  landed.current = onLanded;

  useEffect(() => {
    if (spinKey === 0) return;
    const steps = 16;
    const factor = speed >= 4 ? 0.35 : speed >= 2 ? 0.6 : 1;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    setRolling(true);
    const next = () => {
      i++;
      if (i >= steps) {
        setLabel(target);
        setRolling(false);
        feel('thunk');
        landed.current();
        return;
      }
      setLabel(decoys[Math.floor(Math.random() * decoys.length)]);
      feel('tick');
      timer = setTimeout(next, (40 + i * i * 2.2) * factor);
    };
    next();
    return () => clearTimeout(timer);
    // spinKey drives a new roll; target is read at landing time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  return (
    <View style={[styles.reel, !rolling && { borderColor: C.hardwood }]}>
      <Text style={[styles.label, rolling && { color: C.muted }]} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  reel: { height: 76, borderRadius: R.lg, borderWidth: 2, borderColor: C.line, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.lg },
  label: { color: C.text, fontSize: 26, ...F.display },
});
