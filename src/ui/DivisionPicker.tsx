/**
 * Choose your conference and division before tip-off (draft screen, career offseason). The choice is kept for
 * every run. Until you choose, the run's seed picks one, and that's what this shows.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { current2026 } from '../data';
import { CONFERENCES, DIVISIONS, confOfDiv, defaultDivision, franchiseOf } from '../engine/conference';
import { useGame } from '../store/game';
import { feel } from '../audio/feel';
import { Icon } from './icons';
import { Text } from './Text';
import { F, R, S } from './theme';

const NICK = new Map(current2026.teams.map((t) => [franchiseOf(t), t.name]));
const CONF_COLOR = ['#2F6BFF', '#EE3B4F'] as const;

export function DivisionPicker({ seed }: { seed: string }) {
  const { t } = useTranslation();
  const chosen = useGame((s) => s.division);
  const div = chosen ?? defaultDivision(seed);
  const [open, setOpen] = useState(false);
  const conf = confOfDiv(div);

  return (
    <View style={styles.wrap} testID="division-picker">
      <LinearGradient colors={['#101734', '#1C2A57']} style={StyleSheet.absoluteFill} />
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityLabel={t('conf.pick')} testID="division-toggle"
        style={({ pressed }) => [styles.head, pressed && { opacity: 0.8 }]}>
        <View style={[styles.confDot, { backgroundColor: CONF_COLOR[conf] }]}><Icon name="globe" size={22} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{t('conf.yours')}</Text>
          <Text style={styles.current} testID="division-current">{t(`conf.${DIVISIONS[div].id}`)} · {t(`conf.${CONFERENCES[conf]}`)}</Text>
        </View>
        <View style={styles.change}><Text style={styles.changeText}>{open ? '✕' : t('conf.pick')}</Text></View>
      </Pressable>
      {open && (
        <View style={{ gap: S.sm }}>
          <Text style={styles.hint}>{t('conf.hint')}</Text>
          <View style={styles.cols}>
            {CONFERENCES.map((c, ci) => (
              <View key={c} style={styles.col}>
                <Text style={[styles.confName, { color: ci === 0 ? '#8FB0FF' : '#FF9AA6' }]}>{t(`conf.${c}`)}</Text>
                {DIVISIONS.map((d, di) => d.conf !== ci ? null : (
                  <Pressable key={d.id} testID={`division-${d.id}`} accessibilityRole="button" accessibilityState={{ selected: di === div }}
                    onPress={() => { useGame.getState().setDivision(di); feel('tick'); }}
                    style={({ pressed }) => [styles.tile, di === div && styles.tileOn, pressed && { transform: [{ translateY: 2 }] }]}>
                    <Text style={[styles.tileName, di === div && { color: '#17121E' }]}>{t(`conf.${d.id}`)}</Text>
                    <Text style={[styles.tileTeams, di === div && { color: '#3A2A00' }]} numberOfLines={2}>
                      {d.franchises.map((f) => NICK.get(f)).join(' · ')}
                    </Text>
                  </Pressable>
                ))}
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
