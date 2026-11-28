import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { contractType, payOf } from '../engine/cap';
import type { Player, SlotId } from '../engine/types';
import { Icon } from './icons';
import { Text } from './Text';
import { flagOf, nationOf } from '../data/nation';
import { alpha, C, FONT, R, S } from './theme';
import { useMoney } from './MoneyScale';
import { posLabel } from '../engine/types';

/** Rating badge colors: amber superstar, green great, blue good, slate role player, gray deep bench. */
export function ovrBadge(ovr: number): string {
  if (ovr >= 95) return C.accent;
  if (ovr >= 88) return '#0FA876';
  if (ovr >= 80) return '#2F6BFF';
  if (ovr >= 72) return '#3A4558';
  return '#5C6678';
}

/** The number on the badge: ink on amber, white on everything else. */
const ovrInk = (ovr: number) => (ovr >= 95 ? C.onAccent : '#FFFFFF');

/**
 * A player in a list: team-colored stripe, rating badge, name, salary. When `slots` has several
 * options and the card is selected, the slot choices appear right on the card (no scrolling to the board).
 */
export function PlayerCard({
  player, onPress, disabled, note, selected, testID, accent, slots, onSlot, moneyScale,
}: {
  player: Player; onPress?: () => void; disabled?: boolean; note?: string; selected?: boolean; testID?: string;
  accent?: string; slots?: SlotId[]; onSlot?: (s: SlotId) => void;
  /** Show the price in these dollars instead of the screen's (MoneyScale). */
  moneyScale?: number;
}) {
  const { t } = useTranslation();
  const money = useMoney(moneyScale);
  // Max and rookie-scale deals are worth calling out; plain veteran deals aren't.
  const deal = (() => { const d = contractType(player); return d && d !== 'standard' ? d : null; })();
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
          <Text style={[styles.ovrText, { color: ovrInk(player.ovr) }]}>{player.ovr}</Text>
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
          <Text style={styles.meta} numberOfLines={1} testID="player-meta">
            <Text accessibilityLabel={nationOf(player)}>{flagOf(nationOf(player))}</Text> {posLabel(player)}{player.age ? ` · ${player.age}y` : ''}
          </Text>
          {note && <Text style={styles.note} numberOfLines={1}>{note}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <View style={styles.salary}><Text style={styles.salaryText}>{money(payOf(player))}</Text></View>
          {deal && <View style={[styles.deal, { backgroundColor: DEAL_COLOR[deal] }]} testID={`deal-${deal}`}><Text style={styles.dealText}>{t(`contract.${deal}`)}</Text></View>}
        </View>
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

const DEAL_COLOR = { supermax: '#7A4DFF', max: '#E5484D', rookie: '#18A06A', twoWay: '#3B6CF0', min: '#6B7689' } as const;

const styles = StyleSheet.create({
  card: {
    padding: S.md, paddingLeft: S.md + 4, backgroundColor: C.surface, borderRadius: R.md + 2, borderWidth: 2, borderColor: C.line,
    borderBottomWidth: 5, borderBottomColor: C.edge, overflow: 'hidden', gap: S.sm,
  },
  selected: { borderColor: C.accent, borderBottomColor: C.accentEdge },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  stripe: { position: 'absolute', start: -S.md - 4, top: -S.md, bottom: -S.md, width: 7 },
  ovr: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: alpha('#FFFFFF', 0.28) },
  ovrText: { fontSize: 24, fontFamily: FONT.display },
  form: {
    position: 'absolute', bottom: -9, flexDirection: 'row', alignItems: 'center', gap: 1, paddingHorizontal: 4, paddingVertical: 1,
    borderRadius: 8, borderWidth: 1.5, borderColor: C.ink,
  },
  formText: { color: '#FFFFFF', fontSize: 11, fontFamily: FONT.display },
  name: { color: C.text, fontSize: 17, fontWeight: '700' },
  meta: { color: C.muted, fontSize: 13, fontWeight: '600' },
  note: { color: C.danger, fontSize: 12, fontWeight: '800' },
  salary: { backgroundColor: C.surface2, borderRadius: R.sm, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: C.line },
  salaryText: { color: C.accent, fontFamily: FONT.condensed, fontSize: 17, letterSpacing: 0.3 },
  deal: { borderRadius: R.sm, paddingHorizontal: 7, paddingVertical: 2 },
  dealText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11, letterSpacing: 0.6 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  slot: { backgroundColor: C.accent, borderRadius: R.sm, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 3, borderBottomColor: C.accentEdge },
  slotText: { color: C.onAccent, fontFamily: FONT.condensed, fontSize: 16, letterSpacing: 0.5 },
});
