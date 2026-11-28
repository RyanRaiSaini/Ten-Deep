import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { feel } from '../audio/feel';
import { dailyKey } from '../engine/daily';
import { PRODUCTS, savings, type Product } from '../engine/shop';
import { adsLeft, useShop } from '../store/shop';
import { BrandLogo } from '../ui/BrandLogo';
import { Die, DicePile, type PileKind } from '../ui/Dice';
import { BackButton, Button, Display, Header, Screen } from '../ui/components';
import { Icon } from '../ui/icons';
import { goBack } from '../ui/nav';
import { Text } from '../ui/Text';
import { C, FONT, R, S } from '../ui/theme';

const AD_SECONDS = 5;

/** Rerolls: a free one a day, ad breaks, and bundles (purchases open with the store release). */
export default function Shop() {
  const { t } = useTranslation();
  const shop = useShop();
  const today = dailyKey();
  const freeReady = shop.freeDay !== today;
  const ads = adsLeft(shop, today);
  const [ad, setAd] = useState(false);
  const [soon, setSoon] = useState<Product | null>(null);
  const [bump, setBump] = useState(false);

  const gained = () => { setBump(true); feel('pickChime'); setTimeout(() => setBump(false), 900); };

  return (
    <Screen tint={C.purple}>
      <Header title={t('shop.title')} left={<BackButton onPress={goBack} />} />

      <LinearGradient colors={['#9B6BFF', '#5B2BD9', '#33127F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wallet}>
        <View style={styles.walletShine} />
        <Tumble />
        <View style={{ flex: 1 }}>
          <Text style={styles.walletLabel}>{t('shop.have')}</Text>
          <Text style={[styles.walletN, bump && { color: '#FFD23F' }]} testID="reroll-count">{shop.rerolls}</Text>
          <Text style={styles.walletUnit}>{t('shop.rerolls')}</Text>
        </View>
      </LinearGradient>
      <Text style={styles.what}>{t('shop.what')}</Text>

      <View style={styles.freeRow}>
        <Pressable disabled={!freeReady} onPress={() => { if (shop.claimFree(today)) gained(); }} testID="shop-free" style={({ pressed }) => [styles.freeWrap, pressed && styles.pressed]}>
          <LinearGradient colors={freeReady ? ['#3FE0A6', '#0FA572'] : ['#EEE7DC', '#DCD2C4']} style={styles.freeTile}>
            <Die size={58} color={freeReady ? 'white' : 'white'} faces={[6, 2, 4]} />
            <Text style={[styles.freeTitle, !freeReady && { color: C.muted }]}>{t('shop.free')}</Text>
            <View style={[styles.freeBtn, !freeReady && { backgroundColor: C.muted }]}>
              <Text style={styles.freeBtnText}>{freeReady ? t('shop.freeClaim') : t('shop.freeDone')}</Text>
            </View>
          </LinearGradient>
        </Pressable>
        <Pressable disabled={ads <= 0} onPress={() => setAd(true)} testID="shop-ad" style={({ pressed }) => [styles.freeWrap, pressed && styles.pressed]}>
          <LinearGradient colors={ads > 0 ? ['#6FA0FF', '#2E57D9'] : ['#EEE7DC', '#DCD2C4']} style={styles.freeTile}>
            <Icon name="tv" size={58} />
            <Text style={[styles.freeTitle, ads <= 0 && { color: C.muted }]}>{t('shop.ad')}</Text>
            <View style={[styles.freeBtn, ads <= 0 && { backgroundColor: C.muted }]}>
              <Text style={styles.freeBtnText}>{ads > 0 ? t('shop.adSub', { n: ads }) : t('shop.adNone')}</Text>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      <Text style={styles.section}>{t('shop.bundles')}</Text>
      <View style={styles.pair}>
        {PRODUCTS.filter((p) => !p.badge).map((p) => <Bundle key={p.id} p={p} onPress={() => setSoon(p)} />)}
      </View>
      {PRODUCTS.filter((p) => p.badge).map((p) => <Bundle key={p.id} p={p} wide onPress={() => setSoon(p)} />)}
      <Text style={styles.fine}>{t('shop.fair')}</Text>
      <Text style={styles.fine}>{t('shop.notHere')}</Text>

      <AdBreak visible={ad} onClose={(rewarded) => { setAd(false); if (rewarded && shop.adWatched(today)) gained(); }} />
      <Modal visible={!!soon} transparent animationType="fade" onRequestClose={() => setSoon(null)}>
        <View style={styles.scrim}>
          <View style={styles.sheet}>
            <Icon name="shop" size={72} />
            <Display size={26}>{t('shop.soonTitle')}</Display>
            <Text style={styles.sheetText}>{t('shop.soon')}</Text>
            <Button label={t('shop.ok')} variant="dark" onPress={() => setSoon(null)} testID="soon-ok" style={{ alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const TIER: Record<string, { bg: [string, string]; pile: PileKind; ring: string }> = {
  rerolls_1: { bg: ['#FFFFFF', '#EEF3FF'], pile: 'one', ring: '#3B6CF0' },
  rerolls_5: { bg: ['#F3EDFF', '#DCCBFF'], pile: 'three', ring: '#7A4DFF' },
  rerolls_10: { bg: ['#FF8A5B', '#E5484D'], pile: 'five', ring: '#E5484D' },
  rerolls_25: { bg: ['#FFE07A', '#F5A524'], pile: 'vault', ring: '#E09A00' },
};

function Bundle({ p, wide = false, onPress }: { p: Product; wide?: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const tier = TIER[p.id];
  const bright = !!p.badge;
  const off = savings(p);
  return (
    <Pressable onPress={onPress} testID={`buy-${p.rerolls}`} style={({ pressed }) => [wide ? styles.wideWrap : styles.tileWrap, { borderColor: C.ink }, pressed && styles.pressed]}>
      <LinearGradient colors={tier.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bundleFill, wide && styles.bundleWide]}>
        {bright && <View style={styles.rays} />}
        <DicePile kind={tier.pile} width={wide ? 156 : 140} glow={bright ? '#FFFFFF' : tier.ring} />
        <View style={[styles.bundleText, wide && { alignItems: 'flex-start', flex: 1 }]}>
          <Display size={wide ? 40 : 32} align={wide ? 'left' : 'center'}>{`×${p.rerolls}`}</Display>
          <Text style={[styles.bundleLabel, bright && { color: '#FFFFFF' }]}>{p.rerolls === 1 ? t('shop.bundleOne') : t('shop.bundle', { n: p.rerolls })}</Text>
          {off > 0 && <View style={styles.save}><Text style={styles.saveText}>{t('shop.save', { n: off })}</Text></View>}
          <View style={[styles.price, wide && { alignSelf: 'stretch' }]}><Text style={styles.priceText}>{p.price}</Text></View>
        </View>
      </LinearGradient>
      {p.badge && (
        <View style={[styles.badge, { backgroundColor: p.badge === 'popular' ? C.ink : '#B35A00' }]}>
          <Icon name={p.badge === 'popular' ? 'flame' : 'crown'} size={16} />
          <Text style={styles.badgeText}>{t(`shop.${p.badge}`)}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Two dice tumbling in the wallet card. */
function Tumble() {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  const a = { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '-6deg'] }) }] };
  const b = { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-6, 2] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['12deg', '20deg'] }) }] };
  return (
    <View style={styles.tumble}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 18 }, a]}><Die size={70} color="white" faces={[5, 3, 2]} /></Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 58, top: 0 }, b]}><Die size={58} color="gold" faces={[6, 1, 4]} /></Animated.View>
    </View>
  );
}

/** The rewarded-ad slot: a short break, then +1 reroll. Swap in a real ad network at the store release. */
function AdBreak({ visible, onClose }: { visible: boolean; onClose: (rewarded: boolean) => void }) {
  const { t } = useTranslation();
  const [left, setLeft] = useState(AD_SECONDS);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setLeft(AD_SECONDS);
  }
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [visible]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => onClose(false)}>
      <LinearGradient colors={['#FF7417', '#E5484D', '#7A4DFF']} style={styles.ad}>
        <Text style={styles.adTag}>{t('shop.adTitle')}</Text>
        <BrandLogo />
        <Text style={styles.adNote}>{t('shop.adNote')}</Text>
        {left > 0 ? (
          <View style={styles.adTimer}><Text style={styles.adTimerText} testID="ad-timer">{t('shop.adSkip', { n: left })}</Text></View>
        ) : (
          <Button label={t('shop.adDone')} variant="gold" icon={<Icon name="reroll" size={22} />} onPress={() => onClose(true)} testID="ad-claim" />
        )}
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wallet: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, paddingVertical: S.lg + 4, borderRadius: 26, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 8, overflow: 'hidden' },
  walletShine: { position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.12)' },
  tumble: { width: 124, height: 96 },
  walletLabel: { color: '#E9DDFF', fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', fontSize: 12 },
  walletN: { fontFamily: FONT.display, fontSize: 60, color: '#FFFFFF', lineHeight: 64, textShadowColor: C.ink, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 },
  walletUnit: { fontFamily: FONT.display, fontSize: 20, color: '#FFFFFF', marginTop: -4 },
  what: { color: C.muted, fontWeight: '700', textAlign: 'center', fontSize: 14 },
  freeRow: { flexDirection: 'row', gap: S.sm },
  freeWrap: { flex: 1, borderRadius: 22, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, overflow: 'hidden' },
  freeTile: { flex: 1, alignItems: 'center', gap: 6, padding: S.md },
  freeTitle: { fontFamily: FONT.display, fontSize: 18, color: '#FFFFFF', textAlign: 'center', textShadowColor: 'rgba(23,18,30,0.45)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  freeBtn: { backgroundColor: C.ink, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 5 },
  freeBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, textAlign: 'center' },
  pressed: { transform: [{ translateY: 3 }], borderBottomWidth: 4 },
  section: { fontFamily: FONT.display, fontSize: 24, color: C.text, marginTop: S.sm },
  pair: { flexDirection: 'row', gap: S.sm },
  tileWrap: { flex: 1, borderRadius: 24, borderWidth: 3, borderBottomWidth: 8, overflow: 'visible' },
  wideWrap: { borderRadius: 24, borderWidth: 3, borderBottomWidth: 8, marginTop: S.md },
  bundleFill: { flex: 1, borderRadius: 21, alignItems: 'center', paddingVertical: S.md, paddingHorizontal: S.sm, gap: 2, overflow: 'hidden' },
  bundleWide: { flexDirection: 'row', paddingHorizontal: S.md, gap: S.md, paddingTop: S.lg },
  rays: { position: 'absolute', top: -80, left: -40, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.14)' },
  bundleText: { alignItems: 'center', gap: 4 },
  bundleLabel: { color: C.muted, fontWeight: '800', fontSize: 14 },
  save: { backgroundColor: '#14A86B', borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 2, borderWidth: 2, borderColor: '#FFFFFF' },
  saveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  price: { marginTop: 6, minWidth: 110, backgroundColor: C.surface, borderRadius: R.pill, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 2.5, borderColor: C.ink, borderBottomWidth: 5, alignItems: 'center' },
  priceText: { fontFamily: FONT.display, fontSize: 21, color: C.text },
  badge: { position: 'absolute', top: -15, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 4, borderRadius: R.pill, borderWidth: 2.5, borderColor: '#FFFFFF' },
  badgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },
  fine: { color: C.muted, fontSize: 12, textAlign: 'center', fontWeight: '600' },
  scrim: { flex: 1, backgroundColor: 'rgba(23,18,30,0.55)', alignItems: 'center', justifyContent: 'center', padding: S.lg },
  sheet: { width: '100%', maxWidth: 420, backgroundColor: C.surface, borderRadius: 26, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 8, padding: S.lg, alignItems: 'center', gap: S.md },
  sheetText: { color: C.text, fontWeight: '700', textAlign: 'center', fontSize: 15 },
  ad: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.lg, padding: S.xl },
  adTag: { position: 'absolute', top: 60, color: '#FFFFFF', fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  adNote: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center', maxWidth: 320 },
  adTimer: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: R.pill, paddingHorizontal: 18, paddingVertical: 10 },
  adTimerText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
});
