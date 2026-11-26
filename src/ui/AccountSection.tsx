/**
 * Settings → Account: sign in with Apple (iOS) or Google (once configured) so progress follows you to any device.
 * Hidden entirely when no sign-in is available on this platform.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { appleAvailable, appleToken } from '../auth/apple';
import { googleAvailable, googleSignOut, googleToken } from '../auth/google';
import { connect, loadFromAccount } from '../net/account';
import { useAccount, type Provider } from '../store/account';
import { AppleButton } from './AppleButton';
import { Button, Card, Label } from './components';
import { GoogleButton } from './GoogleButton';
import { Text } from './Text';
import { C, S } from './theme';

/**
 * `page`: the Sign in screen. It always shows, with a "coming soon" Google button until sign-in is configured, and
 * without its own heading.
 */
export function AccountSection({ page = false }: { page?: boolean }) {
  const { t } = useTranslation();
  const provider = useAccount((s) => s.provider);
  const [apple, setApple] = useState(false);
  const [google, setGoogle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [found, setFound] = useState<{ provider: Provider; pin: string; key: string } | null>(null);
  useEffect(() => {
    void appleAvailable().then(setApple);
    void googleAvailable().then(setGoogle);
  }, []);
  if (!apple && !google && !provider && !page) return null;

  const withToken = async (p: Provider, token: string | null) => {
    if (!token) return; // cancelled
    setBusy(true);
    setMsg(null);
    const r = await connect(p, token);
    setBusy(false);
    if (r.kind === 'found') setFound({ provider: p, pin: r.pin, key: r.key });
    else setMsg(t(`account.${r.kind}`));
  };
  const load = async () => {
    if (!found) return;
    setBusy(true);
    const r = await loadFromAccount(found.provider, found.pin, found.key);
    setBusy(false);
    setFound(null);
    setMsg(r === 'ok' ? t('account.restored') : r === 'not-found' ? t('account.linked') : t('account.offline'));
  };

  return (
    <>
      {!page && <Label>{t('account.title')}</Label>}
      <Card style={{ gap: S.sm }}>
        {provider ? (
          <>
            <Text style={styles.strong} testID="account-status">{t('account.signedIn', { provider: provider === 'apple' ? 'Apple' : 'Google' })}</Text>
            <Text style={styles.sub}>{t('account.synced')}</Text>
            <Button label={t('account.signOut')} variant="ghost" onPress={() => { if (provider === 'google') void googleSignOut(); useAccount.getState().set(null); setMsg(null); }} testID="account-signout" />
          </>
        ) : found ? (
          <>
            <Text style={styles.strong}>{t('account.foundTitle')}</Text>
            <Text style={styles.sub}>{t('account.foundBody')}</Text>
            <Button label={t('account.load')} variant="gold" disabled={busy} onPress={load} testID="account-load" />
            <Button label={t('account.keepHere')} variant="ghost" onPress={() => setFound(null)} />
          </>
        ) : (
          <>
            <Text style={styles.sub}>{t('account.body')}</Text>
            {apple && <AppleButton onPress={async () => withToken('apple', await appleToken())} />}
            {google && <GoogleButton onPress={async () => withToken('google', await googleToken())} onToken={(tok) => withToken('google', tok)} />}
            {!apple && !google && (
              <>
                <Button label={t('account.google')} variant="secondary" disabled onPress={() => {}} testID="google-soon" />
                <Text style={styles.small}>{t('signin.soon')}</Text>
              </>
            )}
          </>
        )}
        {busy && <Text style={styles.small}>{t('account.working')}</Text>}
        {msg && <Text style={styles.small} testID="account-msg">{msg}</Text>}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  strong: { color: C.text, fontWeight: '900', fontSize: 16, textAlign: 'center' },
  sub: { color: C.text, fontSize: 15, textAlign: 'center' },
  small: { color: C.muted, fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
