import { HistoryGate } from '../../ui/HistoryGate';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Text } from '../../ui/Text';
import { MODES, type Mode } from '../../data';
import { useGame } from '../../store/game';
import { BackButton, Display, Header, Label, Screen } from '../../ui/components';
import { CourtArt, Icon } from '../../ui/icons';
import { C, FONT, R, S } from '../../ui/theme';
import { goBack } from '../../ui/nav';

const BANNER_H = 170;
const TILE_H = 132;

const playersIn = (m: Mode) => m.pool.teams.reduce((n, x) => n + x.players.length, 0);
const yearsOf = (m: Mode) => {
  const years = m.pool.teams.map((x) => parseInt(x.season, 10));
  return `${Math.min(...years)}–${Math.max(...years)}`;
};

/** A mode as a big court banner in its colors, like Current Day on Home. */
function ModeBanner({ m, onPress }: { m: Mode; onPress: () => void }) {
  const { t } = useTranslation();
  const [w, setW] = useState(360);
  const span = m.kind === 'era' && m.id !== 'all-time' ? m.subtitle : m.kind === 'current' ? m.subtitle : yearsOf(m);
  return (
    <Pressable onPress={onPress} testID={`mode-${m.id}`} accessibilityRole="button" accessibilityLabel={m.title}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}>
      <View style={StyleSheet.absoluteFill}><CourtArt width={w} height={BANNER_H} color={m.colors[0]} color2={m.colors[1]} /></View>
      <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(8,10,30,0.55)']} start={{ x: 0.2, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.body}>
        <Text style={styles.kicker}>{span}</Text>
        <Display size={32} align="left">{m.title}</Display>
        {(m.tagline ?? (m.kind === 'current' ? t('mode.current.desc') : null)) && (
          <Text style={styles.tagline} numberOfLines={2}>{m.tagline ?? t('mode.current.desc')}</Text>
        )}
        <Text style={styles.count}>{t('modes.players', { n: playersIn(m) })}</Text>
      </View>
      <View style={styles.play}><Text style={styles.playText}>{t('home.play').toUpperCase()}</Text></View>
    </Pressable>
  );
}

/** A franchise as a tile in its team colors: court, a color sweep, the nickname big. */
function FranchiseTile({ m, onPress }: { m: Mode; onPress: () => void }) {
  const { t } = useTranslation();
  const [w, setW] = useState(170);
  const nickname = m.title.replace(/^All-Time\s+/, '');
  return (
    <Pressable onPress={onPress} testID={`mode-${m.id}`} accessibilityRole="button" accessibilityLabel={m.title}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={({ pressed }) => [styles.tile, { borderColor: C.ink }, pressed && styles.pressed]}>
      <View style={StyleSheet.absoluteFill}><CourtArt width={w} height={TILE_H} color={m.colors[0]} color2={m.colors[1]} /></View>
      <LinearGradient colors={[`${m.colors[0]}E6`, `${m.colors[0]}99`, 'rgba(8,10,30,0.55)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.stripe, { backgroundColor: m.colors[1] }]} />
      <View style={styles.tileBody}>
        <Text style={styles.tileKicker}>{t('franchise.allTime')}</Text>
        <Text style={styles.tileName} numberOfLines={1} adjustsFontSizeToFit>{nickname}</Text>
        <Text style={styles.tileMeta}>{yearsOf(m)} · {t('modes.players', { n: playersIn(m) })}</Text>
      </View>
    </Pressable>
  );
}

function FranchiseGrid({ list, start }: { list: Mode[]; start: (m: Mode) => void }) {
  return (
    <View style={styles.grid}>
      {list.map((m) => <View key={m.id} style={styles.cell}><FranchiseTile m={m} onPress={() => start(m)} /></View>)}
    </View>
  );
}

/** Pick a franchise, an era, or (Management Crisis) any mode, then start a draft in it. */
function ModePickerScreen() {
  const { kind } = useLocalSearchParams<{ kind: 'franchise' | 'era' | 'crisis' }>();
  const { t } = useTranslation();
  const newRun = useGame((s) => s.newRun);
  const newCrisis = useGame((s) => s.newCrisis);
  // Retired modes stay playable from old saves but aren't offered.
  const shown = MODES.filter((m) => !m.hidden);
  const start = (m: Mode) => { if (kind === 'crisis') newCrisis(m.id); else newRun(m.id); router.replace('/draft'); };
  const banners = (list: Mode[]) => list.map((m) => <ModeBanner key={m.id} m={m} onPress={() => start(m)} />);

  return (
    <Screen>
      <Header
        title={kind === 'era' ? t('mode.era.title') : kind === 'crisis' ? t('crisis.title') : t('modes.pickFranchise')}
        left={<BackButton onPress={() => goBack()} />}
      />
      {kind === 'era' && (
        <>
          <Text style={styles.lead}>{t('modes.pickEra')}</Text>
          {banners(shown.filter((m) => m.kind === 'era'))}
        </>
      )}
      {kind === 'franchise' && (
        <>
          <Text style={styles.lead}>{t('mode.franchise.desc')}</Text>
          <FranchiseGrid list={shown.filter((m) => m.kind === 'franchise')} start={start} />
        </>
      )}
      {kind === 'crisis' && (
        <>
          <View style={styles.crisisHead} testID="crisis-head">
            <LinearGradient colors={['#2A0E14', '#7A1424', '#E0452B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.crisisIcon}><Icon name="siren" size={40} /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.crisisTitle}>{t('crisis.title')}</Text>
              <Text style={styles.crisisDesc}>{t('crisis.desc')}</Text>
            </View>
          </View>
          <Text style={styles.lead}>{t('crisis.chooseMode')}</Text>
          <Label>{t('mode.current.title')}</Label>
          {banners(shown.filter((m) => m.kind === 'current'))}
          <Label>{t('mode.era.title')}</Label>
          {banners(shown.filter((m) => m.kind === 'era'))}
          <Label>{t('mode.franchise.title')}</Label>
          <FranchiseGrid list={shown.filter((m) => m.kind === 'franchise')} start={start} />
        </>
      )}
    </Screen>
  );
}

const shadowText = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } };

/** Every mode here (and every career season) draws on the full history: wait for it. */
export default function ModePicker() {
  return <HistoryGate><ModePickerScreen /></HistoryGate>;
}

const styles = StyleSheet.create({
  lead: { color: C.muted, fontWeight: '800', textAlign: 'center', marginTop: -S.sm },
  pressed: { transform: [{ translateY: 3 }], borderBottomWidth: 4 },
  banner: { height: BANNER_H, borderRadius: 24, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, justifyContent: 'center' },
  body: { paddingHorizontal: S.xl, gap: 2, paddingBottom: 30 },
  kicker: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 2, fontSize: 13, ...shadowText },
  tagline: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, maxWidth: '62%', ...shadowText },
  count: { color: 'rgba(255,255,255,0.8)', fontWeight: '800', fontSize: 12, marginTop: 2 },
  play: {
    position: 'absolute', right: 16, bottom: 16, backgroundColor: '#FFFFFF', borderRadius: R.pill, paddingHorizontal: 20, paddingVertical: 8,
    borderWidth: 3, borderColor: C.ink, borderBottomWidth: 6,
  },
  playText: { fontFamily: FONT.display, fontSize: 20, color: C.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -S.xs },
  cell: { width: '50%', padding: S.xs },
  tile: { height: TILE_H, borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderBottomWidth: 7, justifyContent: 'flex-end' },
  stripe: { position: 'absolute', left: 0, right: 0, top: 0, height: 8 },
  tileBody: { padding: S.md, gap: 1 },
  tileKicker: { color: 'rgba(255,255,255,0.85)', fontWeight: '900', letterSpacing: 1.6, fontSize: 10, textTransform: 'uppercase', ...shadowText },
  tileName: { color: '#FFFFFF', fontFamily: FONT.display, fontSize: 26, ...shadowText },
  tileMeta: { color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 11, ...shadowText },
  crisisHead: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, borderRadius: 24, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7 },
  crisisIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  crisisTitle: { color: '#FFFFFF', fontFamily: FONT.display, fontSize: 26 },
  crisisDesc: { color: '#FFE3DC', fontWeight: '700', fontSize: 13, lineHeight: 18 },
});
