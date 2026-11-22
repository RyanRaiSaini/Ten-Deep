import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LANGUAGE_NAMES, LANGUAGES } from '../i18n/languages';
import { SIM_SPEEDS, useSettings } from '../store/settings';
import { BackButton, Button, Card, Header, Label, Row, Screen, Segmented, ToggleRow } from '../ui/components';
import { C, R, S } from '../ui/theme';

const FLAGS = ['🇨🇦', '🇺🇸', '🇬🇧', '🇫🇷', '🇪🇸', '🇵🇹', '🇧🇷', '🇹🇷', '🇮🇹', '🇳🇱', '🇩🇪', '🇯🇵', '🇰🇷', '🇸🇦', '🇪🇬', '🇲🇦', '🇳🇬', '🇦🇺', '🇮🇳', '🇵🇭', '🇲🇽', '🇦🇷', '🇸🇷', '🇷🇸', '🇬🇷', '🇱🇹', '🇸🇮', '🇨🇲', '🇨🇳', '🇯🇲'];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const s = useSettings();
  const [picker, setPicker] = useState<'flag' | 'lang' | null>(null);

  return (
    <Screen>
      <Header title={t('settings.title')} left={<BackButton onPress={() => router.back()} />} />

      <Label>{t('settings.audio')}</Label>
      <Card style={styles.group}>
        <ToggleRow label={t('settings.music')} value={s.music} onChange={(v) => s.set({ music: v })} />
        <ToggleRow label={t('settings.sfx')} value={s.sfx} onChange={(v) => s.set({ sfx: v })} />
        <ToggleRow label={t('settings.haptics')} value={s.haptics} onChange={(v) => s.set({ haptics: v })} />
        <Row label={t('settings.soundDemo')} onPress={() => router.push('/sound-demo')} />
      </Card>

      <Label>{t('settings.notifications')}</Label>
      <Card style={styles.group}>
        <ToggleRow label={t('settings.notifDaily')} value={s.notifDaily} onChange={(v) => s.set({ notifDaily: v })} />
        <ToggleRow label={t('settings.notifStreak')} value={s.notifStreak} onChange={(v) => s.set({ notifStreak: v })} />
        <ToggleRow label={t('settings.notifDuel')} value={s.notifDuel} onChange={(v) => s.set({ notifDuel: v })} />
      </Card>

      <Label>{t('settings.game')}</Label>
      <Card style={styles.group}>
        <Text style={styles.sub}>{t('settings.simSpeed')}</Text>
        <Segmented options={SIM_SPEEDS} value={s.simSpeed} onChange={(v) => s.set({ simSpeed: v })} format={(v) => `${v}×`} />
        <Row label={t('settings.nationality')} value={s.nationality} onPress={() => setPicker(picker === 'flag' ? null : 'flag')} />
        {picker === 'flag' && (
          <View style={styles.grid}>
            {FLAGS.map((f) => (
              <Pressable key={f} onPress={() => { s.set({ nationality: f }); setPicker(null); }} style={[styles.flag, f === s.nationality && styles.on]}>
                <Text style={{ fontSize: 24 }}>{f}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Row
          label={t('settings.language')}
          value={LANGUAGE_NAMES[(i18n.language as keyof typeof LANGUAGE_NAMES) ?? 'en'] ?? i18n.language}
          onPress={() => setPicker(picker === 'lang' ? null : 'lang')}
        />
        {picker === 'lang' && (
          <View style={styles.grid}>
            {LANGUAGES.map((l) => (
              <Pressable key={l} testID={`lang-${l}`} onPress={() => { s.set({ language: l }); setPicker(null); }} style={[styles.lang, i18n.language === l && styles.on]}>
                <Text style={{ color: C.text, fontWeight: '700' }}>{LANGUAGE_NAMES[l]}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Card>

      <Label>{t('settings.about')}</Label>
      <Card style={styles.group}>
        <Row label={t('settings.privacy')} onPress={() => router.push('/legal/privacy')} />
        <Row label={t('settings.terms')} onPress={() => router.push('/legal/terms')} />
        <Row label={t('settings.contact')} onPress={() => router.push('/legal/contact')} />
        <Row label={t('settings.deleteAccount')} onPress={() => router.push('/legal/delete')} />
      </Card>
      <Text style={styles.version}>Ten Deep v0.1.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { paddingVertical: S.sm, gap: 2 },
  sub: { color: C.text, fontSize: 15, paddingTop: S.sm, paddingBottom: S.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, paddingBottom: S.sm },
  flag: { width: 46, height: 46, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface2 },
  lang: { paddingHorizontal: S.md, paddingVertical: S.sm, borderRadius: R.sm, backgroundColor: C.surface2 },
  on: { borderWidth: 2, borderColor: C.neon },
  version: { color: C.muted, textAlign: 'center', fontSize: 12 },
});
