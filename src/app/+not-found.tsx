import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { BrandLogo } from '../ui/BrandLogo';
import { Button, Display, Screen } from '../ui/components';
import { goHome } from '../ui/nav';
import { Text } from '../ui/Text';
import { C, S } from '../ui/theme';

/** Any unknown link: a friendly air ball instead of a blank error page. */
export default function NotFound() {
  const { t } = useTranslation();
  return (
    <Screen tint={C.hardwood}>
      <View style={styles.wrap}>
        <BrandLogo />
        <Display size={36}>{t('notFound.title')}</Display>
        <Text style={styles.body}>{t('notFound.body')}</Text>
        <Button label={t('result.home')} variant="dark" onPress={goHome} testID="not-found-home" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: S.lg, paddingVertical: S.xxl },
  body: { color: C.muted, fontWeight: '700', textAlign: 'center', fontSize: 16 },
});
