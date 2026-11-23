import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import type { Card, Tier } from '../engine/collect/tiers';
import { C, F, R } from './theme';

/** Tier look: frame gradient, accent and glow. */
export const TIER_STYLE: Record<Tier, { frame: [string, string, ...string[]]; accent: string; glow: string }> = {
  common: { frame: ['#5D6577', '#C9D0DE', '#5D6577'], accent: '#C9D0DE', glow: 'rgba(201,208,222,0.35)' },
  uncommon: { frame: ['#0F6B3E', '#3DDC84', '#0F6B3E'], accent: '#3DDC84', glow: 'rgba(61,220,132,0.45)' },
  rare: { frame: ['#123A8A', '#4F8BFF', '#123A8A'], accent: '#4F8BFF', glow: 'rgba(79,139,255,0.5)' },
  epic: { frame: ['#4B1A7A', '#B26BFF', '#4B1A7A'], accent: '#B26BFF', glow: 'rgba(178,107,255,0.55)' },
  mythic: { frame: ['#7A1405', '#FF5A36', '#FFB13B', '#7A1405'], accent: '#FF7A45', glow: 'rgba(255,90,54,0.6)' },
  ultra: { frame: ['#FF5AC8', '#F5C451', '#3DF2C2', '#4F8BFF', '#B26BFF', '#FF5AC8'], accent: '#F5C451', glow: 'rgba(245,196,81,0.75)' },
};

const initials = (name: string) => name.split(' ').filter((w) => !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(w)).map((w) => w[0]).slice(0, 2).join('');

/** A collectible card: tier frame, rating, monogram (no faces), name and season. */
export function CollectCard({ card, width = 150, tierLabel, level = 0 }: { card: Card; width?: number; tierLabel?: string; level?: number }) {
  const s = TIER_STYLE[card.tier];
  const h = width * 1.4;
  const big = width / 150;
  return (
    <View style={[styles.glow, { width, height: h, shadowColor: s.accent, borderRadius: R.md }]}>
      <LinearGradient colors={s.frame} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.frame, { borderRadius: R.md }]}>
        <LinearGradient
          colors={[card.colors[0], '#0B1020']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.inner, { borderRadius: R.md - 3 }]}
        >
          <View style={styles.top}>
            <Text style={[styles.ovr, { fontSize: 30 * big, color: s.accent }]}>{Math.min(99, card.ovr + level)}</Text>
            <Text style={[styles.pos, { fontSize: 11 * big }]}>{card.pos}{card.pos2 ? `/${card.pos2}` : ''}</Text>
          </View>
          <View style={[styles.mono, { width: 64 * big, height: 64 * big, borderColor: s.accent }]}>
            <Text style={[styles.monoText, { fontSize: 24 * big }]}>{initials(card.name)}</Text>
          </View>
          {card.tier === 'ultra' && <Text style={[styles.sparkle, { fontSize: 14 * big }]}>✦ ✧ ✦</Text>}
          <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: 1 }}>
            <Text style={[styles.name, { fontSize: 13 * big }]} numberOfLines={1} ellipsizeMode="tail">{card.name}</Text>
            <Text style={[styles.team, { fontSize: 10 * big }]} numberOfLines={1} ellipsizeMode="tail">{card.team}</Text>
          </View>
          {level > 0 && (
            <View style={[styles.level, { borderColor: s.accent }]}>
              <Text style={[styles.levelText, { fontSize: 9 * big, color: s.accent }]}>{'★'.repeat(level)}</Text>
            </View>
          )}
          {tierLabel && (
            <View style={[styles.ribbon, { backgroundColor: s.accent }]}>
              <Text style={[styles.ribbonText, { fontSize: 9 * big }]}>{tierLabel}</Text>
            </View>
          )}
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

/** The back of a card (face down in a pack). */
export function CardBack({ width = 150, color = C.hardwood }: { width?: number; color?: string }) {
  return (
    <LinearGradient
      colors={['#141B2E', color, '#141B2E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.back, { width, height: width * 1.4, borderRadius: R.md }]}
    >
      <View style={[styles.backInner, { borderColor: color }]}>
        <Text style={[styles.backLogo, { fontSize: 22 * (width / 150) }]}>TEN{'\n'}DEEP</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  glow: { shadowOpacity: 0.9, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  frame: { flex: 1, padding: 3 },
  inner: { flex: 1, padding: 10, justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden' },
  top: { alignSelf: 'stretch', alignItems: 'flex-start' },
  ovr: { ...F.display },
  pos: { color: C.text, fontWeight: '900', marginTop: -2 },
  mono: { borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11,16,32,0.55)' },
  monoText: { color: C.text, fontWeight: '900', letterSpacing: 1 },
  sparkle: { color: '#FFF6D5', letterSpacing: 4 },
  name: { color: C.text, fontWeight: '900', width: '100%', textAlign: 'center' },
  team: { color: C.muted, fontWeight: '700', width: '100%', textAlign: 'center' },
  level: { position: 'absolute', bottom: 6, left: 6, borderWidth: 1, borderRadius: 6, paddingHorizontal: 4, backgroundColor: 'rgba(11,16,32,0.7)' },
  levelText: { fontWeight: '900' },
  ribbon: { position: 'absolute', top: 8, right: -26, transform: [{ rotate: '35deg' }], paddingHorizontal: 26, paddingVertical: 2 },
  ribbonText: { color: C.bg, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  back: { padding: 6, alignItems: 'stretch', justifyContent: 'center' },
  backInner: { flex: 1, borderWidth: 2, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
  backLogo: { color: C.text, textAlign: 'center', ...F.display, letterSpacing: 3 },
});
