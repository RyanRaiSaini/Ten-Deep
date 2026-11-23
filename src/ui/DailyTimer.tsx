import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useDailyCountdown } from './countdown';
import { Icon } from './icons';
import { Text } from './Text';
import { C, FONT, R } from './theme';

/** "Ends in 17:28:50": its own component so only the pill re-renders every second. */
export function DailyTimer({ small = false, testID }: { small?: boolean; testID?: string }) {
  const { t } = useTranslation();
  const left = useDailyCountdown();
  return (
    <View style={[styles.pill, small && styles.small]} testID={testID}>
      <Icon name="clock" size={small ? 16 : 22} />
      <Text style={[styles.text, small && { fontSize: 12 }]}>
        {t('daily.endsIn')} <Text style={[styles.num, small && { fontSize: 14 }]}>{left}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', backgroundColor: C.ink, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 7 },
  small: { alignSelf: 'flex-start', gap: 5, paddingHorizontal: 10, paddingVertical: 3, marginTop: 2 },
  text: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  num: { fontFamily: FONT.display, fontSize: 18, color: '#FFFFFF', letterSpacing: 1 },
});
