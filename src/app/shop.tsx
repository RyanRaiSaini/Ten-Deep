import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { feel } from '../audio/feel';
import { dailyKey } from '../engine/daily';
import { PRODUCTS, savings, type Product } from '../engine/shop';
import { adsLeft, useShop } from '../store/shop';
import { BrandLogo } from '../ui/BrandLogo';
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

      <LinearGradient colors={['#8B5CFF', '#4C1DB8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wallet}>
        <Icon name="reroll" size={64} />
        <View style={{ flex: 1 }}>
          <Text style={styles.walletLabel}>{t('shop.have')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={[styles.walletN, bump && { color: '#FFD23F' }]} testID="reroll-count">{shop.rerolls}</Text>
            <Text style={styles.walletUnit}>{t('shop.rerolls')}</Text>
          </View>
        </View>
      </LinearGradient>
      <Text style={styles.what}>{t('shop.what')}</Text>

      <View style={styles.freeRow}>
        <Pressable disabled={!freeReady} onPress={() => { if (shop.claimFree(today)) gained(); }} testID="shop-free"
          style={({ pressed }) => [styles.freeTile, { backgroundColor: freeReady ? '#18C08A' : C.surface2 }, pressed && styles.pressed]}>
          <Icon name="gift" size={44} />
          <Text style={[styles.freeTitle, !freeReady && { color: C.muted }]}>{t('shop.free')}</Text>
          <View style={[styles.freeBtn, !freeReady && { backgroundColor: C.line }]}>
            <Text style={styles.freeBtnText}>{freeReady ? t('shop.freeClaim') : t('shop.freeDone')}</Text>
          </View>
        </Pressable>
        <Pressable disabled={ads <= 0} onPress={() => setAd(true)} testID="shop-ad"
          style={({ pressed }) => [styles.freeTile, { backgroundColor: ads > 0 ? '#3B6CF0' : C.surface2 }, pressed && styles.pressed]}>
          <Icon name="tv" size={44} />
          <Text style={[styles.freeTitle, ads <= 0 && { color: C.muted }]}>{t('shop.ad')}</Text>
          <View style={[styles.freeBtn, ads <= 0 && { backgroundColor: C.line }]}>
            <Text style={styles.freeBtnText}>{ads > 0 ? t('shop.adSub', { n: ads }) : t('shop.adNone')}</Text>
          </View>
        </Pressable>
      </View>

      <Text style={styles.section}>{t('shop.bundles')}</Text>
      <View style={styles.grid}>
        {PRODUCTS.map((p) => (
          <Pressable key={p.id} onPress={() => setSoon(p)} testID={`buy-${p.rerolls}`}
            style={({ pressed }) => [styles.bundle, p.badge === 'popular' && styles.popular, pressed && styles.pressed]}>
            {p.badge && (
              <View style={[styles.badge, { backgroundColor: p.badge === 'popular' ? C.danger : '#E09A00' }]}>
                <Text style={styles.badgeText}>{t(`shop.${p.badge}`)}</Text>
              </View>
            )}
            <View style={styles.stack}>
              {Array.from({ length: Math.min(3, Math.ceil(p.rerolls / 5)) }, (_, i) => (
                <View key={i} style={{ position: i ? 'absolute' : 'relative', left: i * 10, top: -i * 6 }}><Icon name="reroll" size={44} /></View>
              ))}
            </View>
            <Text style={styles.bundleN}>×{p.rerolls}</Text>
            <Text style={styles.bundleLabel}>{p.rerolls === 1 ? t('shop.bundleOne') : t('shop.bundle', { n: p.rerolls })}</Text>
            {savings(p) > 0 && <Text style={styles.save}>{t('shop.save', { n: savings(p) })}</Text>}
            <View style={styles.price}><Text style={styles.priceText}>{p.price}</Text></View>
          </Pressable>
        ))}
      </View>
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

/** The rewarded-ad slot: a short break, then +1 reroll. Swap in a real ad network at the store release. */
function AdBreak({ visible, onClose }: { visible: boolean; onClose: (rewarded: boolean) => void }) {
  const { t } = useTranslation();
  const [left, setLeft] = useState(AD_SECONDS);
  useEffect(() => {
    if (!visible) return;
    setLeft(AD_SECONDS);
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
  wallet: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, borderRadius: 24, borderWidth: 2.5, borderColor: C.ink, borderBottomWidth: 7 },
  walletLabel: { color: '#E9DDFF', fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', fontSize: 12 },
  walletN: { fontFamily: FONT.display, fontSize: 54, color: '#FFFFFF', lineHeight: 58 },
  walletUnit: { fontFamily: FONT.display, fontSize: 22, color: '#FFFFFF' },
  what: { color: C.muted, fontWeight: '700', textAlign: 'center', fontSize: 14 },
  freeRow: { flexDirection: 'row', gap: S.sm },
  freeTile: { flex: 1, alignItems: 'center', gap: 6, padding: S.md, borderRadius: 22, borderWidth: 2.5, borderColor: C.ink, borderBottomWidth: 6 },
  freeTitle: { fontFamily: FONT.display, fontSize: 18, color: '#FFFFFF', textAlign: 'center' },
  freeBtn: { backgroundColor: C.ink, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 5 },
  freeBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, textAlign: 'center' },
  pressed: { transform: [{ translateY: 3 }], borderBottomWidth: 3 },
  section: { fontFamily: FONT.display, fontSize: 24, color: C.ink, marginTop: S.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, paddingTop: S.sm },
  bundle: {
    width: '48.5%', flexGrow: 1, alignItems: 'center', gap: 2, paddingTop: S.lg, paddingBottom: S.md, paddingHorizontal: S.sm,
    backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 2.5, borderColor: C.ink, borderBottomWidth: 6,
  },
  popular: { borderColor: C.danger, backgroundColor: '#FFF1EC' },
  badge: { position: 'absolute', top: -12, paddingHorizontal: 12, paddingVertical: 3, borderRadius: R.pill, borderWidth: 2, borderColor: '#FFFFFF' },
  badgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
  stack: { height: 56, width: 70, alignItems: 'flex-start', justifyContent: 'flex-end' },
  bundleN: { fontFamily: FONT.display, fontSize: 34, color: C.ink },
  bundleLabel: { color: C.muted, fontWeight: '800', fontSize: 13 },
  save: { color: '#14A86B', fontWeight: '900', fontSize: 13 },
  price: { marginTop: 6, alignSelf: 'stretch', backgroundColor: '#18C08A', borderRadius: R.pill, paddingVertical: 8, borderWidth: 2, borderColor: C.ink, alignItems: 'center' },
  priceText: { fontFamily: FONT.display, fontSize: 20, color: '#FFFFFF' },
  fine: { color: C.muted, fontSize: 12, textAlign: 'center', fontWeight: '600' },
  scrim: { flex: 1, backgroundColor: 'rgba(23,18,30,0.55)', alignItems: 'center', justifyContent: 'center', padding: S.lg },
  sheet: { width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 26, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 8, padding: S.lg, alignItems: 'center', gap: S.md },
  sheetText: { color: C.ink, fontWeight: '700', textAlign: 'center', fontSize: 15 },
  ad: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.lg, padding: S.xl },
  adTag: { position: 'absolute', top: 60, color: '#FFFFFF', fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  adNote: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center', maxWidth: 320 },
  adTimer: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: R.pill, paddingHorizontal: 18, paddingVertical: 10 },
  adTimerText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
});
