import { useLocalSearchParams } from 'expo-router';
import { googleSignOut } from '../../auth/google';
import { eraseServerData } from '../../net/account';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet } from 'react-native';
import { Text } from '../../ui/Text';
import { CONFIG } from '../../config';
import { wipeAll } from '../../store/all';
import { BackButton, Button, Card, Header, Screen } from '../../ui/components';
import { C, S } from '../../ui/theme';
import { goBack } from '../../ui/nav';

/**
 * DRAFT legal copy (English). Not legal advice — the owner should have these reviewed before public launch.
 * Phase 1 stores everything on-device; Phase 3 (accounts) will update these sections.
 */
const DOCS: Record<string, { title: string; body: string[] }> = {
  privacy: {
    title: 'Privacy Policy',
    body: [
      `Last updated ${CONFIG.legalUpdated}. This policy explains what ${CONFIG.appName} ("we") collects and why.`,
      'On your device: your game progress, settings, nationality flag and avatar choice.',
      'Cloud backup: every 30 minutes the game backs up your progress to our server (hosted by Vercel), filed under a random PIN and protected by a secret key that stays on your device. Your recovery code (in Settings) is that PIN and key.',
      'Friends: when you share your friend code, your display name, avatar, PIN, best cards and last drafted team are published under your PIN so friends can look you up.',
      'Party rooms: while you play a party, your display name, avatar, picks and rarest card are kept for the room (deleted automatically after 3 hours).',
      'Sign in with Apple or Google (optional): we store a one-way fingerprint of your account ID linked to your PIN, so signing in on a new device finds your progress. We do not ask for or store your name or email.',
      'Share links: a shared pull is a link to a picture of the card. It contains the card and its finish, nothing about you.',
      'Campaign links: if you open the game from a link we gave a creator or community (it has ?c= in it), the game makes a random ID on this device and records a few anonymous milestones against that link: that you visited, came back on another day, started or finished a draft, simulated a season, or shared a result. We use the totals to see whether the invitation helped. No name, email or IP address is stored with them, and nothing is recorded if you never open such a link.',
      'Real-life ratings use public NBA box scores; nothing about you is sent.',
      'We do not sell personal data. We do not show ads today; if ads are added later, this policy will describe the ad partners and your choices.',
      'Children: the game is not directed at children under 13.',
      'Your rights: Settings → Delete account erases your progress on this device and on our server (cloud backup, friend code entry and account link). Party rooms expire by themselves.',
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
      'This permanently erases your profile, drafts played, titles, cards, settings and any run in progress.',
      'It also deletes your data on our server: your cloud backup, your friend code entry and any Apple or Google sign-in link. Friends who already added you keep the copy they saved.',
    ],
  },
};

export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { t } = useTranslation();
  const [deleted, setDeleted] = useState(false);
  const d = DOCS[doc ?? ''] ?? DOCS.terms;

  const [offline, setOffline] = useState(false);
  const wipe = async (localOnly = false) => {
    // Server first: once the device is wiped, its PIN and key (which prove the data is yours) are gone.
    if (!localOnly && !(await eraseServerData())) { setOffline(true); return; }
    await googleSignOut();
    await wipeAll();
    setDeleted(true);
  };

  return (
    <Screen>
      <Header title={d.title} left={<BackButton onPress={() => goBack()} />} />
      <Card style={{ gap: S.md }}>
        {d.body.map((p, i) => <Text key={i} style={styles.p}>{p}</Text>)}
        {doc === 'contact' && CONFIG.supportEmail && (
          <Button label={CONFIG.supportEmail} variant="secondary" onPress={() => Linking.openURL(`mailto:${CONFIG.supportEmail}`)} />
        )}
      </Card>
      {doc === 'delete' && (
        deleted
          ? <Text style={[styles.p, { color: C.neon, textAlign: 'center' }]}>✓ Deleted</Text>
          : (
            <>
              <Button label={t('settings.deleteAccount')} onPress={() => wipe()} style={{ backgroundColor: C.danger }} testID="confirm-delete" />
              {offline && (
                <>
                  <Text style={[styles.p, { textAlign: 'center' }]}>{t('account.eraseOffline')}</Text>
                  <Button label={t('account.eraseLocal')} variant="ghost" onPress={() => wipe(true)} testID="delete-local" />
                </>
              )}
            </>
          )
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  p: { color: C.text, fontSize: 15, lineHeight: 22 },
});
