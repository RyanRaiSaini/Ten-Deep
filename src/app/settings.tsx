import { router } from 'expo-router';
import { AccountSection } from '../ui/AccountSection';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { backup, lastBackup, recoveryCode, restore } from '../net/save';
import { copyText } from '../ui/share';
import { Text } from '../ui/Text';
import { LANGUAGE_NAMES, LANGUAGES } from '../i18n/languages';
import { SIM_SPEEDS, useSettings } from '../store/settings';
import { feel } from '../audio/feel';
import { BackButton, Button, Card, Header, Label, Row, Screen, Segmented, ToggleRow } from '../ui/components';
import { C, R, S } from '../ui/theme';
import { goBack } from '../ui/nav';

/** Sound-effects volume steps (the game has no music). */
const SFX_LEVELS = [0, 0.35, 0.7, 1] as const;

const FLAGS = ['🇨🇦', '🇺🇸', '🇬🇧', '🇫🇷', '🇪🇸', '🇵🇹', '🇧🇷', '🇹🇷', '🇮🇹', '🇳🇱', '🇩🇪', '🇯🇵', '🇰🇷', '🇸🇦', '🇪🇬', '🇲🇦', '🇳🇬', '🇦🇺', '🇮🇳', '🇵🇭', '🇲🇽', '🇦🇷', '🇸🇷', '🇷🇸', '🇬🇷', '🇱🇹', '🇸🇮', '🇨🇲', '🇨🇳', '🇯🇲'];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const s = useSettings();
  const [picker, setPicker] = useState<'flag' | 'lang' | null>(null);

  return (
    <Screen>
      <Header title={t('settings.title')} left={<BackButton onPress={() => goBack()} />} />

      <Label>{t('settings.audio')}</Label>
      <Card style={styles.group}>
        <Text style={styles.sub}>{t('settings.sfx')}</Text>
        <Segmented
          options={SFX_LEVELS}
          value={s.sfx ? (SFX_LEVELS.find((l) => Math.abs(l - s.sfxVolume) < 0.01) ?? 1) : 0}
          onChange={(v) => { s.set({ sfx: v > 0, ...(v > 0 ? { sfxVolume: v } : {}) }); if (v > 0) setTimeout(() => feel('pickChime'), 0); }}
          format={(v) => t(`settings.vol${v === 0 ? 'Off' : v < 0.5 ? 'Low' : v < 0.9 ? 'Med' : 'High'}`)}
        />
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

      <AccountSection />
      <CloudSave />

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

/** Cloud save: automatic backups under your PIN, a recovery code, and restore on another device. */
function CloudSave() {
  const { t } = useTranslation();
  const [last, setLast] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [sure, setSure] = useState(false);
  useEffect(() => { void lastBackup().then(setLast); }, []);
  const when = last ? new Date(last).toLocaleString() : t('save.never');
  return (
    <>
      <Label>{t('save.title')}</Label>
      <Card style={{ gap: S.sm }}>
        <Text style={styles.sub}>{t('save.body')}</Text>
        <Text style={styles.small} testID="save-last">{t('save.last', { when })}</Text>
        <Button label={t('save.now')} variant="green" testID="save-now"
          onPress={async () => { const at = await backup(true); if (at) { setLast(Date.parse(at)); setMsg(t('save.saved')); } else setMsg(t('save.offline')); }} />
        <Button label={t('save.copy')} variant="secondary" testID="save-copy"
          onPress={async () => setMsg((await copyText(recoveryCode())) ? t('save.copied') : recoveryCode())} />
        <TextInput value={code} onChangeText={(v) => { setCode(v); setSure(false); }} placeholder={t('save.paste')} placeholderTextColor={C.muted}
          autoCapitalize="none" autoCorrect={false} style={styles.input} testID="save-code" />
        <Button label={sure ? t('save.restoreSure') : t('save.restore')} variant="dark" disabled={!code.trim()} testID="save-restore"
          onPress={async () => {
            if (!sure) return setSure(true);
            const r = await restore(code);
            setSure(false);
            setMsg(t(`save.r.${r}`));
            if (r === 'ok') setCode('');
          }} />
        {msg && <Text style={styles.small} testID="save-msg">{msg}</Text>}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  small: { color: C.muted, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  input: { borderWidth: 2, borderColor: C.line, borderRadius: R.md, padding: S.md, color: C.ink, backgroundColor: C.bg, fontFamily: 'Montserrat_600SemiBold' },
  group: { paddingVertical: S.sm, gap: 2 },
  sub: { color: C.text, fontSize: 15, paddingTop: S.sm, paddingBottom: S.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, paddingBottom: S.sm },
  flag: { width: 46, height: 46, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface2 },
  lang: { paddingHorizontal: S.md, paddingVertical: S.sm, borderRadius: R.sm, backgroundColor: C.surface2 },
  on: { borderWidth: 2, borderColor: C.neon },
  version: { color: C.muted, textAlign: 'center', fontSize: 12 },
});
