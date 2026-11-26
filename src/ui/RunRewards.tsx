/**
 * End of a run: the picks you just earned (as little packs in their own colors), and what would have earned a
 * better one ("Win the Finals for a Champion Pick").
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { nextGoals, runRewards, type PickType, type RunOutcome } from '../engine/collect/picks';
import { Label } from './components';
import { Icon } from './icons';
import { PACK_STYLE } from './packStyle';
import { Text } from './Text';
import { C, F, S } from './theme';

function MiniPack({ type }: { type: PickType }) {
  const { t } = useTranslation();
  const st = PACK_STYLE[type];
  return (
    <View style={styles.pack} testID={`earned-${type}`}>
      <LinearGradient colors={st.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.packArt}>
        <Icon name={st.emblem} size={30} />
        <View style={styles.pips}>{Array.from({ length: Math.min(st.pips, 7) }, (_, i) => <View key={i} style={styles.pip} />)}</View>
      </LinearGradient>
      <Text style={styles.packName} numberOfLines={2}>{t(`collect.t_${type}`)}</Text>
    </View>
  );
}

/** `replay`: a "Run it back" try, which pays no packs (see engine/replay.ts). */
export function RunRewards({ outcome, replay = false }: { outcome: RunOutcome; replay?: boolean }) {
  const { t } = useTranslation();
  if (replay) {
    return (
      <View style={styles.card} testID="run-rewards">
        <Label color={C.hardwood}>{t('rewards.title')}</Label>
        <Text style={styles.goalText} testID="replay-no-rewards">{t('replay.noRewards')}</Text>
      </View>
    );
  }
  const earned = runRewards(outcome);
  const goals = nextGoals(outcome);
  return (
    <View style={styles.card} testID="run-rewards">
      <Label color={C.hardwood}>{t('rewards.title')}</Label>
      <View style={styles.row}>
        {earned.map((type, i) => (
          <View key={type} style={styles.rowItem}>
            {i > 0 && <Text style={styles.plus}>+</Text>}
            <MiniPack type={type} />
          </View>
        ))}
      </View>
      {goals.length > 0 ? (
        <View style={styles.goals}>
          <Text style={styles.nextLabel}>{t('rewards.next')}</Text>
          {goals.map((g) => (
            <View key={g} style={styles.goal}>
              <View style={[styles.goalDot, { backgroundColor: PACK_STYLE[g === 'good' ? 'good' : g].colors[0] }]} />
              <Text style={styles.goalText}>{t(`rewards.goal_${g}`)}</Text>
            </View>
          ))}
        </View>
      ) : <Text style={styles.goalText}>{t('rewards.maxed')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 20, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, padding: S.lg, gap: S.md },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: S.sm },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  plus: { color: C.muted, fontSize: 28, ...F.display },
  pack: { width: 112, alignItems: 'center', gap: 6 },
  packArt: { width: 84, height: 112, borderRadius: 12, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', gap: 8 },
  pips: { flexDirection: 'row', gap: 3 },
  pip: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.9)' },
  packName: { color: C.text, fontWeight: '900', fontSize: 13, textAlign: 'center' },
  goals: { gap: 6, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
  nextLabel: { color: C.muted, ...F.label },
  goal: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  goalDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: C.ink },
  goalText: { color: C.text, fontWeight: '700', flex: 1 },
});
