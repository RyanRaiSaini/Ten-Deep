import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BENCH_SLOTS, STARTER_SLOTS, type Player, type RosterSlots, type SlotId } from '../engine/types';
import { Label } from './components';
import { C, F, R, S, ovrColor } from './theme';

export function RosterBoard({
  roster, highlight, onSlot, injured,
}: { roster: RosterSlots; highlight?: SlotId[]; onSlot?: (slot: SlotId, p?: Player) => void; injured?: Set<string> }) {
  const { t } = useTranslation();
  const cell = (slot: SlotId) => {
    const p = roster[slot];
    const lit = highlight?.includes(slot);
    const hurt = p && injured?.has(p.id);
    return (
      <Pressable
        key={slot}
        testID={`slot-${slot}`}
        disabled={!onSlot}
        onPress={() => onSlot?.(slot, p)}
        style={[styles.cell, lit && styles.lit, p && { backgroundColor: C.surface2 }]}
      >
        <Text style={styles.slot}>{slot.startsWith('B') ? `6+` : slot}</Text>
        {p ? (
          <>
            <Text style={[styles.ovr, { color: ovrColor(p.ovr) }]}>{p.ovr}</Text>
            <Text style={styles.name} numberOfLines={1}>{hurt ? '🩼 ' : ''}{p.name.split(' ').slice(-1)[0]}</Text>
          </>
        ) : (
          <Text style={[styles.empty, lit && { color: C.neon }]}>{t('draft.empty')}</Text>
        )}
      </Pressable>
    );
  };
  return (
    <View style={{ gap: S.sm }}>
      <Label>{t('draft.starters')}</Label>
      <View style={styles.row}>{STARTER_SLOTS.map(cell)}</View>
      <Label>{t('draft.bench')}</Label>
      <View style={styles.row}>{BENCH_SLOTS.map(cell)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  cell: { flex: 1, minHeight: 74, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', padding: 4, gap: 1 },
  lit: { borderColor: C.neon, borderWidth: 2 },
  slot: { color: C.muted, fontSize: 10, fontWeight: '800' },
  ovr: { fontSize: 20, ...F.display },
  name: { color: C.text, fontSize: 10, fontWeight: '700' },
  empty: { color: C.line, fontSize: 11, fontWeight: '700' },
});
