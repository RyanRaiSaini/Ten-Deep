import { Pressable, StyleSheet, Text, View } from 'react-native';
import { salaryFor } from '../engine/cap';
import type { Player } from '../engine/types';
import { C, F, R, S, money, ovrColor } from './theme';

export function PlayerCard({
  player, onPress, disabled, note, selected, testID,
}: { player: Player; onPress?: () => void; disabled?: boolean; note?: string; selected?: boolean; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.card,
        selected && { borderColor: C.neon },
        disabled && { opacity: 0.38 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.ovr, { borderColor: ovrColor(player.ovr) }]}>
        <Text style={[styles.ovrText, { color: ovrColor(player.ovr) }]}>{player.ovr}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
        <Text style={styles.meta}>
          {player.pos}{player.pos2 ? `/${player.pos2}` : ''} · {player.tag}{player.age ? ` · ${player.age}y` : ''}
          {note ? `  ·  ${note}` : ''}
        </Text>
      </View>
      <Text style={styles.salary}>{money(salaryFor(player.ovr))}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, backgroundColor: C.surface2, borderRadius: R.md, borderWidth: 1, borderColor: 'transparent' },
  ovr: { width: 46, height: 46, borderRadius: R.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ovrText: { fontSize: 20, ...F.display },
  name: { color: C.text, fontSize: 16, fontWeight: '800' },
  meta: { color: C.muted, fontSize: 12 },
  salary: { color: C.hardwood, fontWeight: '800', fontSize: 14 },
});
