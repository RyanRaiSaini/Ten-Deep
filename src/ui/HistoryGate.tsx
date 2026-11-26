/**
 * Shows a short "opening the history books" wait until the full history has loaded, then the screen. Only screens
 * that read historical pools use it (see data/historyReady.ts); with `when` false it renders straight through.
 * If the download fails (a weak connection), it offers to try again.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ensureHistory, useHistory } from '../data/historyReady';
import { BackButton, Button, Header, Screen } from './components';
import { Icon } from './icons';
import { goBack } from './nav';
import { Text } from './Text';
import { C, S } from './theme';

export function HistoryGate({ when = true, children }: { when?: boolean; children: ReactNode }) {
  const ready = useHistory((s) => s.ready);
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const waiting = when && !ready;
  useEffect(() => { if (waiting) ensureHistory().catch(() => setFailed(true)); }, [waiting]);
  const retry = () => { setFailed(false); ensureHistory().catch(() => setFailed(true)); };
  if (!waiting) return <>{children}</>;
  return (
    <Screen>
      <Header title="" left={<BackButton onPress={() => goBack()} />} />
      <View style={styles.wrap} testID="history-loading">
        <Icon name="history" size={56} />
        {failed ? (
          <>
            <Text style={styles.text}>{t('history.failed')}</Text>
            <Button label={t('history.retry')} variant="gold" onPress={retry} testID="history-retry" />
          </>
        ) : (
          <>
            <ActivityIndicator color={C.hardwood} />
            <Text style={styles.text}>{t('history.loading')}</Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.md, paddingVertical: 100 },
  text: { color: C.muted, fontWeight: '800', fontSize: 15, textAlign: 'center' },
});
