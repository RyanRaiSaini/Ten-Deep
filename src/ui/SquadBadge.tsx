/** The Squad Rating pill: the weighted rating of your ten-man rotation, colored by tier. */
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { F } from './theme';
import { squadColor } from './squadColor';

export { squadColor };

export function SquadBadge({ value, size = 'md', testID = 'squad-rating' }: { value: number | null; size?: 'sm' | 'md'; testID?: string }) {
  const { t } = useTranslation();
  const sm = size === 'sm';
  return (
    <View style={[styles.pill, { backgroundColor: value === null ? '#5A6378' : squadColor(value) }, sm && styles.pillSm]}
      accessibilityLabel={`${t('squad.rating')} ${value === null ? '-' : Math.round(value)}`} testID={testID}>
      <Text style={[styles.label, sm && { fontSize: 9 }]}>{sm ? t('squad.short') : t('squad.rating')}</Text>
      <Text style={[styles.num, sm && { fontSize: 18 }]}>{value === null ? '–' : Math.round(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 2, borderColor: 'rgba(0,0,0,0.25)' },
  pillSm: { paddingHorizontal: 10, paddingVertical: 2, gap: 6 },
  label: { color: 'rgba(255,255,255,0.85)', ...F.label, fontSize: 10 },
  num: { color: '#FFFFFF', fontSize: 22, ...F.display },
});
