/** Apple's own Sign in with Apple button (App Store rules require Apple's button style). iOS only. */
import { Platform } from 'react-native';

type Lib = typeof import('expo-apple-authentication');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const lib = (): Lib | null => { try { return Platform.OS === 'ios' ? (require('expo-apple-authentication') as Lib) : null; } catch { return null; } };

export function AppleButton({ onPress }: { onPress: () => void }) {
  const a = lib();
  if (!a) return null;
  const { AppleAuthenticationButton, AppleAuthenticationButtonType, AppleAuthenticationButtonStyle } = a;
  return (
    <AppleAuthenticationButton
      buttonType={AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={14}
      style={{ height: 50, alignSelf: 'stretch' }}
      onPress={onPress}
    />
  );
}
