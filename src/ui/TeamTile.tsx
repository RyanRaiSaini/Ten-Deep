/** A real team as a tile in its colors: court art, city, nickname, Squad Rating and real payroll. */
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { payOf } from '../engine/cap';
import { realRotation } from '../engine/realLeague';
import { squadRating } from '../engine/rotation';
import { ALL_SLOTS, type Roster, type RosterSlots, type TeamSeason } from '../engine/types';
import { CourtArt } from './icons';
import { Text } from './Text';
import { C, FONT, S, money } from './theme';

/** A team's real rotation as you'd take it over: its Squad Rating and payroll. */
export function teamSummary(t: TeamSeason) {
  const slots = realRotation(t.players, 'p') as Required<RosterSlots>;
  const roster: Roster = { id: 'p', name: t.name, colors: t.colors, slots };
  return { sr: Math.round(squadRating(roster)), pay: ALL_SLOTS.reduce((n, k) => n + (slots[k] ? payOf(slots[k]) : 0), 0), slots };
}

export function TeamTile({ t, onPress, testID, selected }: { t: TeamSeason; onPress: () => void; testID: string; selected?: boolean }) {
  const [w, setW] = useState(170);
  const sum = useMemo(() => teamSummary(t), [t]);
  return (
    <Pressable onPress={onPress} testID={testID} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={({ pressed }) => [styles.tile, selected && styles.selected, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`${t.city} ${t.name}`}>
      <View style={StyleSheet.absoluteFill}><CourtArt width={w} height={112} color={t.colors[0]} color2={t.colors[1]} /></View>
      <LinearGradient colors={[`${t.colors[0]}E6`, `${t.colors[0]}99`, 'rgba(8,10,30,0.6)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.stripe, { backgroundColor: t.colors[1] }]} />
      <View style={styles.body}>
        <Text style={styles.city} numberOfLines={1}>{t.city}</Text>
        <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>{t.name}</Text>
        <Text style={styles.meta}>SR {sum.sr} · {money(sum.pay)}</Text>
      </View>
    </Pressable>
  );
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } };
const styles = StyleSheet.create({
  tile: { height: 112, borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, justifyContent: 'flex-end' },
  selected: { borderColor: '#FFC53D', borderWidth: 4, borderBottomWidth: 8 },
  pressed: { transform: [{ translateY: 3 }] },
  stripe: { position: 'absolute', left: 0, right: 0, top: 0, height: 8 },
  body: { padding: S.md, gap: 0 },
  city: { color: 'rgba(255,255,255,0.9)', fontWeight: '900', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', ...shadow },
  name: { color: '#FFFFFF', fontFamily: FONT.display, fontSize: 24, ...shadow },
  meta: { color: 'rgba(255,255,255,0.9)', fontWeight: '800', fontSize: 11, ...shadow },
});
