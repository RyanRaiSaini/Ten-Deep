import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Text } from '../../ui/Text';
import { MODES, type Mode } from '../../data';
import { useGame } from '../../store/game';
import { BackButton, Card, Display, Header, Screen } from '../../ui/components';
import { CourtArt } from '../../ui/icons';
import { C, F, FONT, R, S } from '../../ui/theme';
import { goBack } from '../../ui/nav';

const BANNER_H = 170;

/** An era as a big court banner in its colors, like Current Day on Home. */
function EraBanner({ m, onPress }: { m: Mode; onPress: () => void }) {
  const { t } = useTranslation();
  const [w, setW] = useState(360);
  const players = m.pool.teams.reduce((n, x) => n + x.players.length, 0);
  const years = m.pool.teams.map((x) => parseInt(x.season, 10));
  const span = m.id === 'all-time' ? `${Math.min(...years)}–${Math.max(...years)}` : m.subtitle;
  return (
    <Pressable onPress={onPress} testID={`mode-${m.id}`} accessibilityRole="button" accessibilityLabel={m.title}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={({ pressed }) => [styles.banner, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 4 }]}>
      <View style={StyleSheet.absoluteFill}><CourtArt width={w} height={BANNER_H} color={m.colors[0]} color2={m.colors[1]} /></View>
      <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(8,10,30,0.55)']} start={{ x: 0.2, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.body}>
        <Text style={styles.kicker}>{span}</Text>
        <Display size={32} align="left">{m.title}</Display>
        {m.tagline && <Text style={styles.tagline} numberOfLines={2}>{m.tagline}</Text>}
        <Text style={styles.count}>{t('modes.players', { n: players })}</Text>
      </View>
      <View style={styles.play}><Text style={styles.playText}>{t('home.play').toUpperCase()}</Text></View>
    </Pressable>
  );
}

/** Pick a franchise or an era, then start a draft in it. */
export default function ModePicker() {
  const { kind } = useLocalSearchParams<{ kind: 'franchise' | 'era' | 'crisis' }>();
  const { t } = useTranslation();
  const newRun = useGame((s) => s.newRun);
  const newCrisis = useGame((s) => s.newCrisis);
  // A Management Crisis run can use any pool. Retired modes stay playable from old saves but aren't offered.
  const list = (kind === 'crisis' ? MODES : MODES.filter((m) => m.kind === kind)).filter((m) => !m.hidden);
  const start = (m: Mode) => { if (kind === 'crisis') newCrisis(m.id); else newRun(m.id); router.replace('/draft'); };

  return (
    <Screen>
      <Header
        title={kind === 'era' ? t('mode.era.title') : kind === 'crisis' ? t('crisis.title') : t('modes.pickFranchise')}
        left={<BackButton onPress={() => goBack()} />}
      />
      {kind === 'era' && <Text style={styles.lead}>{t('modes.pickEra')}</Text>}
      {kind === 'crisis' && <Text style={styles.sub}>{t('crisis.chooseMode')}</Text>}
      {kind === 'era' ? list.map((m) => <EraBanner key={m.id} m={m} onPress={() => start(m)} />) : list.map((m) => {
        const players = m.pool.teams.reduce((n, x) => n + x.players.length, 0);
        const years = m.pool.teams.map((x) => parseInt(x.season, 10));
        return (
          <Card key={m.id} style={[styles.card, { borderColor: m.colors[0] }]} onPress={() => start(m)}>
            <View style={[styles.swatch, { backgroundColor: m.colors[0], borderColor: m.colors[1] }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.title} testID={`mode-${m.id}`}>{m.title}</Text>
              <Text style={styles.sub}>
                {Math.min(...years)}–{Math.max(...years)} · {t('modes.players', { n: players })}
              </Text>
            </View>
            <Text style={styles.go}>›</Text>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { color: C.muted, fontWeight: '800', textAlign: 'center', marginTop: -S.sm },
  banner: { height: BANNER_H, borderRadius: 24, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, justifyContent: 'center' },
  body: { paddingHorizontal: S.xl, gap: 2, paddingBottom: 30 },
  kicker: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 2, fontSize: 13, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  tagline: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, maxWidth: '62%', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  count: { color: 'rgba(255,255,255,0.8)', fontWeight: '800', fontSize: 12, marginTop: 2 },
  play: {
    position: 'absolute', right: 16, bottom: 16, backgroundColor: '#FFFFFF', borderRadius: R.pill, paddingHorizontal: 20, paddingVertical: 8,
    borderWidth: 3, borderColor: C.ink, borderBottomWidth: 6,
  },
  playText: { fontFamily: FONT.display, fontSize: 20, color: C.ink },
  card: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.lg },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 3 },
  title: { color: C.text, fontSize: 18, ...F.display },
  sub: { color: C.muted, fontSize: 13 },
  go: { color: C.muted, fontSize: 22 },
});
