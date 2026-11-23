/** "Continue with Google" on iOS/Android (shown only once Google sign-in is configured). */
import { useTranslation } from 'react-i18next';
import { Button } from './components';

export function GoogleButton({ onPress, onToken: _ }: { onPress: () => void; onToken: (token: string) => void }) {
  const { t } = useTranslation();
  return <Button label={t('account.google')} variant="secondary" onPress={onPress} testID="google-signin" />;
}
