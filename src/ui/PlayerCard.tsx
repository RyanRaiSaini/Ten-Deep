import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { payOf } from '../engine/cap';
import type { Player, SlotId } from '../engine/types';
import { Icon } from './icons';
import { Text } from './Text';
import { C, FONT, R, S, money } from './theme';

/** Rating badge colors: gold superstar, green great, blue good, ink role player, gray deep bench. */
export function ovrBadge(ovr: number): string {
  if (ovr >= 95) return '#F0A500';
  if (ovr >= 88) return '#0FA876';
  if (ovr >= 80) return '#2F6BFF';
  if (ovr >= 72) return '#4A4356';
  return '#9A92A3';
}

/**
 * A player in a list: team-colored stripe, rating badge, name, salary. When `slots` has several
 * options and the card is selected, the slot choices appear right on the card (no scrolling to the board).
 */
export function PlayerCard({
  player, onPress, disabled, note, selected, testID, accent, slots, onSlot,
}: {
  player: Player; onPress?: () => void; disabled?: boolean; note?: string; selected?: boolean; testID?: string;
  accent?: string; slots?: SlotId[]; onSlot?: (s: SlotId) => void;
}) {
  const { t } = useTranslation();
  // Real-life form nudge (from NBA box scores), if this player has one today.
  const form = (player as Player & { form?: number }).form ?? 0;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || !onPress}
      aria-disabled={disabled}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        disabled && { opacity: 0.45 },
        pressed && !disabled && { transform: [{ translateY: 2 }], borderBottomWidth: 3 },
      ]}
    >
      <View style={styles.row}>
        {accent && <View style={[styles.stripe, { backgroundColor: accent }]} />}
        <View style={[styles.ovr, { backgroundColor: ovrBadge(player.ovr) }]}>
          <Text style={styles.ovrText}>{player.ovr}</Text>
          {form !== 0 && (
            <View style={[styles.form, { backgroundColor: form > 0 ? '#FF6A1A' : '#3B8CF0' }]} testID={form > 0 ? 'form-hot' : 'form-cold'}
              accessibilityLabel={t(form > 0 ? 'draft.hot' : 'draft.cold', { n: Math.abs(form) })}>
              <Icon name={form > 0 ? 'flame' : 'freeze'} size={12} />
              <Text style={styles.formText}>{form > 0 ? `+${form}` : form}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {player.pos}{player.pos2 ? `/${player.pos2}` : ''} · {player.tag}{player.age ? ` · ${player.age}y` : ''}
          </Text>
          {note && <Text style={styles.note} numberOfLines={1}>{note}</Text>}
        </View>
        <View style={styles.salary}><Text style={styles.salaryText}>{money(payOf(player))}</Text></View>
      </View>
      {selected && slots && slots.length > 1 && onSlot && (
        <View style={styles.slots}>
          {slots.map((s) => (
            <Pressable key={s} onPress={() => onSlot(s)} style={({ pressed }) => [styles.slot, pressed && { transform: [{ translateY: 2 }] }]} testID={`choose-${s}`} accessibilityRole="button">
              <Text style={styles.slotText}>{s.startsWith('B') ? t('draft.benchSlot', { n: s.slice(1) }) : s}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: S.md, paddingLeft: S.md + 4, backgroundColor: '#FFFFFF', borderRadius: R.md + 2, borderWidth: 2, borderColor: C.line,
    borderBottomWidth: 5, borderBottomColor: C.edge, overflow: 'hidden', gap: S.sm,
  },
  selected: { borderColor: C.ink, borderBottomColor: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  stripe: { position: 'absolute', start: -S.md - 4, top: -S.md, bottom: -S.md, width: 7 },
  ovr: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: C.ink },
  ovrText: { fontSize: 24, fontFamily: FONT.display, color: '#FFFFFF' },
  form: {
    position: 'absolute', bottom: -9, flexDirection: 'row', alignItems: 'center', gap: 1, paddingHorizontal: 4, paddingVertical: 1,
    borderRadius: 8, borderWidth: 1.5, borderColor: C.ink,
  },
  formText: { color: '#FFFFFF', fontSize: 11, fontFamily: FONT.display },
  name: { color: C.ink, fontSize: 17, fontWeight: '900' },
  meta: { color: C.muted, fontSize: 12, fontWeight: '700' },
  note: { color: C.danger, fontSize: 12, fontWeight: '800' },
  salary: { backgroundColor: '#FFF1E3', borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 2, borderColor: '#FFD2A8' },
  salaryText: { color: '#C2500A', fontWeight: '900', fontSize: 13 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  slot: { backgroundColor: C.ink, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 3, borderBottomColor: '#000' },
  slotText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
});
