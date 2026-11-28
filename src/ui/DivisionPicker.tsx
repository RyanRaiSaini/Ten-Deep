/**
 * Choose your conference and division before tip-off (draft screen, career offseason). The choice is kept for
 * every run. Until you choose, the run's seed picks one, and that's what this shows.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { MODE_BY_ID, current2026 } from '../data';
import { CONFERENCES, DIVISIONS, LAYOUTS, confOfDiv, defaultDivision, franchiseOf, layoutOf } from '../engine/conference';
import { useGame } from '../store/game';
import { feel } from '../audio/feel';
import { Icon } from './icons';
import { Text } from './Text';
import { C, F, R, S } from './theme';

const NICK = new Map(current2026.teams.map((t) => [franchiseOf(t), t.name]));
/** An era's team names (its cap season's): the Bullets, the SuperSonics, the Vancouver Grizzlies. */
function eraNames(poolId: string | undefined): Map<string, string> {
  const mode = poolId ? MODE_BY_ID[poolId] : undefined;
  if (!mode?.layout || !mode.cap) return NICK;
  const year = Number(mode.cap.season.slice(0, 4)) + 1;
  const out = new Map(NICK);
  const best = new Map<string, number>();
  for (const t of mode.pool.teams) {
    const d = Math.abs(Number.parseInt(t.season, 10) - year);
    const f = franchiseOf(t);
    if (d < (best.get(f) ?? Infinity)) { best.set(f, d); out.set(f, t.name); }
  }
  return out;
}
const CONF_COLOR = ['#2F6BFF', '#EE3B4F'] as const;

/**
 * `fixed`: a shared challenge (Daily, Weekly, a friend's link) where everyone plays the same division.
 * `startOpen` + `onPick`: the draft screen opens it and waits for a tap before the season can start.
 */
export function DivisionPicker({ seed, fixed = false, startOpen = false, onPick, poolId }: { seed: string; fixed?: boolean; startOpen?: boolean; onPick?: () => void; poolId?: string }) {
  const { t } = useTranslation();
  const chosen = useGame((s) => s.division);
  // The run's era decides the league (1987-88: four divisions); a choice made for another league doesn't apply.
  const layout = (poolId && MODE_BY_ID[poolId]?.layout) || 'modern';
  const names = eraNames(poolId);
  const div = fixed || chosen === null || layoutOf(chosen) !== layout ? defaultDivision(seed, layout) : chosen;
  const [open, setOpen] = useState(startOpen && !fixed);
  const conf = confOfDiv(div);

  return (
    <View style={styles.wrap} testID="division-picker">
      <LinearGradient colors={['#101734', '#1C2A57']} style={StyleSheet.absoluteFill} />
      <Pressable onPress={() => !fixed && setOpen((o) => !o)} disabled={fixed} accessibilityRole="button" accessibilityLabel={t('conf.pick')} testID="division-toggle"
        style={({ pressed }) => [styles.head, pressed && { opacity: 0.8 }]}>
        <View style={[styles.confDot, { backgroundColor: CONF_COLOR[conf] }]}><Icon name="globe" size={22} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{t('conf.yours')}</Text>
          <Text style={styles.current} testID="division-current">{t(`conf.${DIVISIONS[div].id}`)} · {t(`conf.${CONFERENCES[conf]}`)}</Text>
        </View>
        {!fixed && <View style={styles.change}><Text style={styles.changeText}>{open ? '✕' : t('conf.pick')}</Text></View>}
      </Pressable>
      {fixed && <Text style={styles.hint} testID="division-fixed">{t('conf.fixed')}</Text>}
      {open && (
        <View style={{ gap: S.sm }}>
          <Text style={styles.hint}>{t('conf.hint')}</Text>
          <View style={styles.cols}>
            {CONFERENCES.map((c, ci) => (
              <View key={c} style={styles.col}>
                <Text style={[styles.confName, { color: ci === 0 ? '#8FB0FF' : '#FF9AA6' }]}>{t(`conf.${c}`)}</Text>
                {LAYOUTS[layout].map((di) => { const d = DIVISIONS[di]; return d.conf !== ci ? null : (
                  <Pressable key={d.id} testID={`division-${d.id}`} accessibilityRole="button" accessibilityState={{ selected: di === div }}
                    onPress={() => { useGame.getState().setDivision(di); feel('tick'); onPick?.(); }}
                    style={({ pressed }) => [styles.tile, di === div && styles.tileOn, pressed && { transform: [{ translateY: 2 }] }]}>
                    <Text style={[styles.tileName, di === div && { color: C.text }]}>{t(`conf.${d.id}`)}</Text>
                    <Text style={[styles.tileTeams, di === div && { color: '#3A2A00' }]} numberOfLines={2}>
                      {d.franchises.map((f) => names.get(f)).join(' · ')}
                    </Text>
                  </Pressable>
                ); })}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: R.md, overflow: 'hidden', borderWidth: 3, borderColor: '#17121E', borderBottomWidth: 6, padding: S.md, gap: S.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  confDot: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: '#AEB6CC', ...F.label },
  current: { color: '#FFFFFF', fontSize: 20, ...F.display },
  change: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  changeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  hint: { color: '#C9D0E2', fontSize: 12, fontWeight: '700' },
  cols: { flexDirection: 'row', gap: S.sm },
  col: { flex: 1, gap: S.sm },
  confName: { textAlign: 'center', ...F.label },
  tile: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.16)', padding: S.sm, gap: 2 },
  tileOn: { backgroundColor: '#FFC53D', borderColor: '#FFE08A' },
  tileName: { color: '#FFFFFF', fontSize: 16, ...F.display },
  tileTeams: { color: '#AEB6CC', fontSize: 11, fontWeight: '700' },
});
