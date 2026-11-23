/** On the web, Google only issues a token from its own rendered button (Google Identity Services). */
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { renderGoogleButton } from '../auth/google.web';

export function GoogleButton({ onToken }: { onPress: () => void; onToken: (token: string) => void }) {
  // On the web a View ref is its DOM element, which is where Google draws its button.
  const ref = useRef<HTMLElement | null>(null);
  const cb = useRef(onToken);
  useEffect(() => { cb.current = onToken; }, [onToken]);
  useEffect(() => {
    const el = ref.current;
    if (el) void renderGoogleButton(el, (tok: string) => cb.current(tok));
  }, []);
  return <View ref={ref as never} style={{ alignItems: 'center', minHeight: 44 }} testID="google-signin" />;
}
