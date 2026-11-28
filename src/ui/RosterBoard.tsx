import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { BENCH_SLOTS, STARTER_SLOTS, type Player, type RosterSlots, type SlotId } from '../engine/types';
import { Label } from './components';
import { ovrBadge } from './PlayerCard';
import { Text } from './Text';
import { alpha, C, FONT, R, S } from './theme';

const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv)$/i;
/** "Jaime Jaquez Jr." → "Jaquez", "Gary Payton II" → "Payton". */
/** Bench spots are the 6th to 10th men: B1 shows 6+, B2 7+, ... B5 10+. */
const benchLabel = (slot: string) => `${Number(slot.slice(1)) + 5}+`;

export function shortName(name: string): string {
  const parts = name.split(' ').filter((w) => !SUFFIX.test(w));
  return parts[parts.length - 1] ?? name;
}

/** Where the starters stand on the half-court (fractions of width/height; basket at the bottom). */
const SPOTS: Record<string, [number, number]> = {
  PG: [0.5, 0.16], SG: [0.84, 0.36], SF: [0.16, 0.36], PF: [0.72, 0.68], C: [0.3, 0.7],
};

/** The court only redraws when its size or paint color changes (not on every simulated game). */
const Court = memo(function Court({ w, h, paint }: { w: number; h: number; paint: string }) {
  const planks = Math.ceil(w / 26);
  const kw = w * 0.34;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      {Array.from({ length: planks }, (_, i) => (
        <Rect key={i} x={i * 26} y={0} width={26} height={h} fill={i % 2 ? '#E7A866' : '#EDB377'} />
      ))}
      <G stroke="#FFFFFF" strokeWidth={3} fill="none" strokeOpacity={0.9}>
        <Rect x={(w - kw) / 2} y={h * 0.6} width={kw} height={h * 0.4} fill={paint} fillOpacity={0.85} />
        <Circle cx={w / 2} cy={h * 0.6} r={kw / 2} />
        <Path d={`M${w * 0.06} ${h} V${h * 0.78} A ${w * 0.44} ${w * 0.44} 0 0 1 ${w * 0.94} ${h * 0.78} V${h}`} />
        <Path d={`M${w * 0.36} 0 A ${w * 0.14} ${w * 0.14} 0 0 0 ${w * 0.64} 0`} />
        <Circle cx={w / 2} cy={h * 0.93} r={9} stroke="#FF7417" strokeWidth={4} />
      </G>
    </Svg>
  );
});

/**
 * Your ten: the starting five on a half-court (paint in your team color), the bench underneath.
 * Tapping a lit spot places the chosen player there.
 */
type BoardProps = { roster: RosterSlots; highlight?: SlotId[]; onSlot?: (slot: SlotId, p?: Player) => void; injured?: Set<string>; color?: string };

/** Skip re-rendering while a season simulates if nothing on the board changed. */
const same = (a: BoardProps, b: BoardProps) =>
  a.roster === b.roster && a.color === b.color && a.onSlot === b.onSlot && (a.highlight ?? []).join() === (b.highlight ?? []).join()
  && [...(a.injured ?? [])].sort().join() === [...(b.injured ?? [])].sort().join();

export const RosterBoard = memo(function RosterBoard({ roster, highlight, onSlot, injured, color = C.hardwood }: BoardProps) {
  const { t } = useTranslation();
  const [w, setW] = useState(340);
  const h = Math.min(320, Math.round(w * 0.78));

  const token = (slot: SlotId, bench = false) => {
    const p = roster[slot];
    const lit = highlight?.includes(slot);
    const hurt = p && injured?.has(p.id);
    const size = bench ? 52 : 60;
    return (
      <Pressable
        key={slot}
        testID={`slot-${slot}`}
        disabled={!onSlot}
        onPress={() => onSlot?.(slot, p)}
        accessibilityRole={onSlot ? 'button' : undefined}
        accessibilityLabel={p ? `${slot} ${p.name} ${p.ovr}` : `${slot} ${t('draft.empty')}`}
        style={[styles.token, bench && { flex: 1 }]}
      >
        <View style={[
          styles.disc, { width: size, height: size, borderRadius: size / 2 },
          p ? { backgroundColor: ovrBadge(p.ovr), borderStyle: 'solid' } : styles.discEmpty,
          lit && styles.lit,
        ]}>
          {p ? <Text style={[styles.ovr, { fontSize: bench ? 20 : 24 }]}>{p.ovr}</Text> : <Text style={styles.pos}>{bench ? benchLabel(slot) : slot}</Text>}
          {p && <View style={styles.posTag}><Text style={styles.posTagText}>{bench ? benchLabel(slot) : slot}</Text></View>}
        </View>
        {p && (
          <View style={styles.namePill}>
            <Text style={styles.name} numberOfLines={1}>{hurt ? '✚ ' : ''}{shortName(p.name)}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={{ gap: S.sm }} testID="roster-board">
      <Label>{t('draft.starters')}</Label>
      <View style={[styles.court, { height: h }]} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
        <Court w={w} h={h} paint={color} />
        {STARTER_SLOTS.map((slot) => (
          <View key={slot} style={[styles.spot, { left: SPOTS[slot][0] * w - 44, top: SPOTS[slot][1] * h - 34 }]}>{token(slot)}</View>
        ))}
      </View>
      <Label>{t('draft.bench')}</Label>
      <View style={styles.bench}>{BENCH_SLOTS.map((s) => token(s, true))}</View>
    </View>
  );
}, same);

const styles = StyleSheet.create({
  court: { borderRadius: R.lg, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7 },
  spot: { position: 'absolute', width: 88, alignItems: 'center' },
  token: { alignItems: 'center', gap: 3 },
  disc: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.ink },
  discEmpty: { backgroundColor: alpha('#FFFFFF', 0.55), borderStyle: 'dashed', borderColor: alpha(C.ink, 0.55) },
  lit: { borderColor: '#0FA876', borderWidth: 4, borderStyle: 'solid', backgroundColor: '#D6FBEA', transform: [{ scale: 1.08 }] },
  ovr: { fontFamily: FONT.display, color: '#FFFFFF' },
  pos: { fontFamily: FONT.display, color: alpha(C.ink, 0.6), fontSize: 16 },
  posTag: { position: 'absolute', top: -8, right: -10, backgroundColor: C.surface, borderRadius: 8, paddingHorizontal: 4, borderWidth: 2, borderColor: C.ink },
  posTagText: { fontSize: 10, fontWeight: '900', color: C.text },
  namePill: { backgroundColor: C.surface, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 2, borderColor: C.ink, maxWidth: 86 },
  name: { color: C.text, fontSize: 11, fontWeight: '900' },
  bench: {
    flexDirection: 'row', gap: 4, backgroundColor: C.surface, borderRadius: R.lg, padding: S.sm, paddingTop: S.md,
    borderWidth: 2, borderColor: C.line, borderBottomWidth: 5, borderBottomColor: C.edge,
  },
});
