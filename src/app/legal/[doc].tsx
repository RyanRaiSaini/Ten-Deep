import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet } from 'react-native';
import { Text } from '../../ui/Text';
import { CONFIG } from '../../config';
import { wipeAll } from '../../store/all';
import { BackButton, Button, Card, Header, Screen } from '../../ui/components';
import { C, S } from '../../ui/theme';

/**
 * DRAFT legal copy (English). Not legal advice — the owner should have these reviewed before public launch.
 * Phase 1 stores everything on-device; Phase 3 (accounts) will update these sections.
 */
const DOCS: Record<string, { title: string; body: string[] }> = {
  privacy: {
    title: 'Privacy Policy',
    body: [
      `Last updated ${CONFIG.legalUpdated}. This policy explains what ${CONFIG.appName} ("we") collects and why.`,
      'What we collect today: your game progress, settings, nationality flag and avatar choice. All of it is stored on your device only.',
      'When accounts launch: your sign-in identity (Apple, Google or email), username, game history and leaderboard results will be stored on our servers to sync your progress and power duels and daily challenges. We will update this policy before that happens.',
      'We do not sell personal data. We do not show ads today; if ads are added later, this policy will describe the ad partners and your choices.',
      'Children: the game is not directed at children under 13.',
      'Your rights: you can delete everything at any time from Settings → Delete account.',
      `Questions: see the Contact us page.`,
    ],
  },
  terms: {
    title: 'Terms of Service',
    body: [
      `Last updated ${CONFIG.legalUpdated}. By playing ${CONFIG.appName} you agree to these terms.`,
      'Ten Deep is a fan-made basketball strategy game. It is not affiliated with, endorsed by, or sponsored by the NBA, its teams, or its players. Player names and statistics are used for identification and commentary only; ratings are our own opinions.',
      'Play fair: don\'t cheat, exploit bugs, or harass other players in duels or leaderboards.',
      'The game is provided "as is". Features may change. We may suspend accounts that break these terms.',
      'These terms may be updated; continued play means you accept the latest version.',
    ],
  },
  contact: {
    title: 'Contact us',
    body: [
      CONFIG.supportEmail
        ? `Email us at ${CONFIG.supportEmail} — we usually reply within a few days.`
        : 'A support email is coming soon. Thanks for playing Ten Deep!',
    ],
  },
  delete: {
    title: 'Delete account',
    body: [
      'This permanently erases your profile, drafts played, titles, settings and any run in progress from this device.',
      'Once accounts launch, this will also delete your account and all server data.',
    ],
  },
};

export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { t } = useTranslation();
  const [deleted, setDeleted] = useState(false);
  const d = DOCS[doc ?? ''] ?? DOCS.terms;

  const wipe = async () => {
    await wipeAll();
    setDeleted(true);
  };

  return (
    <Screen>
      <Header title={d.title} left={<BackButton onPress={() => router.back()} />} />
      <Card style={{ gap: S.md }}>
        {d.body.map((p, i) => <Text key={i} style={styles.p}>{p}</Text>)}
        {doc === 'contact' && CONFIG.supportEmail && (
          <Button label={CONFIG.supportEmail} variant="secondary" onPress={() => Linking.openURL(`mailto:${CONFIG.supportEmail}`)} />
        )}
      </Card>
      {doc === 'delete' && (
        deleted
          ? <Text style={[styles.p, { color: C.neon, textAlign: 'center' }]}>✓ Deleted</Text>
          : <Button label={t('settings.deleteAccount')} onPress={wipe} style={{ backgroundColor: C.danger }} testID="confirm-delete" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  p: { color: C.text, fontSize: 15, lineHeight: 22 },
});
