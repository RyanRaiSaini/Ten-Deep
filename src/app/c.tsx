import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { MODE_BY_ID } from '../data/modes';
import { parseChallenge } from '../engine/share';
import { useGame } from '../store/game';
import { BrandLogo } from '../ui/BrandLogo';
import { Button, Card, Display, Screen } from '../ui/components';
import { Icon } from '../ui/icons';
import { goHome } from '../ui/nav';
import { Text } from '../ui/Text';
import { C, FONT, S } from '../ui/theme';

/** A friend's "beat my draft" link: same spins, their record to beat. */
export default function Challenge() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const c = parseChallenge(params);
  const mode = c ? MODE_BY_ID[c.poolId] : undefined;

  if (!c || !mode) {
    return (
      <Screen>
        <View style={styles.wrap}>
          <BrandLogo />
          <Text style={styles.body}>{t('challenge.invalid')}</Text>
          <Button label={t('result.home')} variant="dark" onPress={goHome} />
        </View>
      </Screen>
    );
  }

  const accept = () => {
    useGame.getState().newChallenge(c.poolId, c.seed, { name: c.name, w: c.w, l: c.l });
    router.replace('/draft');
  };

  return (
    <Screen tint={mode.colors[0]}>
      <View style={styles.wrap}>
        <BrandLogo scale={0.9} />
        <Card style={styles.card}>
          <Icon name="vs" size={64} />
          <Display size={30}>{t('challenge.title', { name: c.name })}</Display>
          <Text style={styles.record} testID="challenge-record">{c.w}-{c.l}</Text>
          <Text style={styles.mode}>{mode.title}</Text>
          <Text style={styles.body}>{t('challenge.body')}</Text>
          <Button label={t('challenge.accept')} onPress={accept} testID="challenge-accept" icon={<Icon name="play" size={22} />} />
        </Card>
        <Button label={t('result.home')} variant="ghost" onPress={goHome} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: S.lg, paddingVertical: S.xl },
  card: { alignItems: 'center', gap: S.sm },
  record: { fontFamily: FONT.display, fontSize: 56, color: C.ink },
  mode: { fontWeight: '900', color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
  body: { color: C.muted, fontWeight: '700', textAlign: 'center' },
});
