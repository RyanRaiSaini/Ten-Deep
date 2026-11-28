import { HistoryGate } from '../../ui/HistoryGate';
import { useState } from 'react';
import { CourtBackdrop } from '../../ui/SparkleBackdrop';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../../ui/Text';
import { seasonLabel } from '../../engine/career/offseason';
import { TERMS, contractUp, useCareer, type Term } from '../../store/career';
import { useGame } from '../../store/game';
import { Button, Card, Display, Label, Screen, Segmented, TabTitle } from '../../ui/components';
import { C, F, FONT, R, S } from '../../ui/theme';
import { franchiseLeaders, hallOfFame } from '../../engine/career/legacy';
import { MORALE_START, moraleMod } from '../../engine/career/morale';
import { CourtArt, Icon } from '../../ui/icons';

const VERDICT_ICON = { legend: 'crown', extended: 'medal', survived: 'clock', fired: 'flame' } as const;
const ROUTE: Record<string, '/draft' | '/season' | '/deadline' | '/crisis' | '/playoffs' | '/result'> = {
  draft: '/draft', season: '/season', deadline: '/deadline', crisis: '/crisis', playoffs: '/playoffs', result: '/result',
};

/** Career hub: season, job security, history, and the next thing to do. */
function CareerScreen() {
  const [bannerW, setBannerW] = useState(320);
  const { t } = useTranslation();
  const c = useCareer();
  const [ending, setEnding] = useState(false);
  const [term, setTerm] = useState<Term>(5);
  const g = useGame();
  const morale = c.morale ?? MORALE_START;
  const leaders = franchiseLeaders(c.stats ?? {}, 5);
  const hof = hallOfFame(c.stats ?? {});
  const titles = c.history.filter((h) => h.result === 'champion').length;
  const up = contractUp(c);
  // Year of the current deal: the deal covers seasons termEnd - term + 1 … termEnd.
  const year = Math.min(c.term, Math.max(1, c.season - (c.termEnd - c.term)));

  const next = (() => {
    if (!c.active || c.ended || up) return null;
    // A Dynasty still in its fantasy draft (or waiting for its slot spin).
    if (c.mode === 'dynasty' && c.history.length === 0 && (c.fantasy || !(g.career && g.season))) return { label: t('career.resume'), go: () => router.push('/dynasty') };
    if (c.step) return { label: t('career.toOffseason'), go: () => router.push('/offseason') };
    if (g.career && g.phase !== 'idle' && g.phase !== 'result') return { label: t('career.resume'), go: () => router.push(ROUTE[g.phase]) };
    // Another run replaced the live season: bring it back (that run is left behind, like any abandoned run).
    if (g.parked && g.parked.phase !== 'idle') { const ph = g.parked.phase; return { label: t('career.resume'), go: () => { g.resumeCareer(); router.push(ROUTE[ph]); } }; }
    if (c.history.length >= c.season) return { label: t('career.toOffseason'), go: () => { c.beginOffseason(); router.push('/offseason'); } };
    return { label: t('career.resume'), go: () => router.push(g.career && g.phase !== 'idle' ? ROUTE[g.phase] : '/draft') };
  })();

  return (
    <Screen tabbed backdrop={<CourtBackdrop split={0.26} />}>
      <TabTitle icon={<Icon name="briefcase" size={46} />} title={t('career.title')} />

      {(!c.active || c.ended) && (
        <Card style={{ gap: S.md }}>
          {c.ended ? (
            <>
              <Text style={[styles.big, c.retired && { color: C.accent }]} testID="career-over">{c.retired ? t('career.retiredTitle') : t('career.over')}</Text>
              <Text style={styles.body}>{c.retired ? t('career.retiredDesc', { n: c.history.length, titles }) : t('career.overDesc', { n: c.history.length, titles })}</Text>
            </>
          ) : (
            <>
              <View style={styles.banner} onLayout={(e) => setBannerW(e.nativeEvent.layout.width)}>
                <View style={StyleSheet.absoluteFill}><CourtArt width={bannerW} height={150} color="#1C2A57" /></View>
                <Display size={30}>{t('career.title')}</Display>
                <Text style={styles.bannerSub}>{t('career.desc')}</Text>
              </View>
              {([['briefcase', 'f1'], ['siren', 'f2'], ['crown', 'f3']] as const).map(([icon, k]) => (
                <View key={k} style={styles.feature}>
                  <View style={styles.featureTile}><Icon name={icon} size={36} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitle}>{t(`career.${k}Title`)}</Text>
                    <Text style={styles.featureBody}>{t(`career.${k}Body`)}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
          <Label>{t('career.term')}</Label>
          <Segmented options={TERMS} value={term} onChange={setTerm} format={(n) => t('career.termYears', { n })} />
          <Button label={c.ended ? t('career.newCareer') : t('career.start')} variant="dark" onPress={() => { c.start(term); router.push('/draft'); }} testID="career-start" />
        </Card>
      )}

      {(!c.active || c.ended) && (
        <Pressable onPress={() => router.push('/dynasty')} testID="dynasty-open" accessibilityRole="button" style={({ pressed }) => [styles.dynasty, pressed && { transform: [{ translateY: 3 }] }]}>
          <LinearGradient colors={['#1A0F2E', '#3B1F6B', '#7A4DFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.dynastyIcon}><Icon name="crown" size={40} /></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Display size={28} align="left">{t('dynasty.title')}</Display>
            <Text style={styles.dynastyDesc}>{t('dynasty.bannerDesc')}</Text>
          </View>
        </Pressable>
      )}

      {c.active && !c.ended && (
        <Card style={{ gap: S.sm }}>
          <View style={styles.row}>
            <Text style={styles.season}>{t('career.season', { n: c.season })}</Text>
            <Text style={styles.label}>{seasonLabel(c.season)}</Text>
          </View>
          <Label>{t('career.contract', { y: year, n: c.term })}</Label>
          <View style={styles.bar}><View style={[styles.fill, { width: `${(year / c.term) * 100}%`, backgroundColor: C.accent }]} /></View>
          <Text style={[styles.secNum, { color: C.accent }]} testID="career-contract">{t('career.yearsLeft', { n: Math.max(0, c.termEnd - c.history.length) })}</Text>
          <Label>{t('career.morale')}</Label>
          <View style={styles.bar}><View style={[styles.fill, { width: `${morale}%`, backgroundColor: C.neon }]} /></View>
          <Text style={[styles.secNum, { color: C.neon }]} testID="career-morale">
            {morale}/100 · {moraleMod(morale) > 0 ? `+${moraleMod(morale)}` : moraleMod(morale)} {t('career.moraleEffect')}
          </Text>
          {next && <Button label={next.label} variant="gold" onPress={next.go} testID="career-next" />}
          {up && (
            <View style={styles.contractUp} testID="contract-up">
              <Text style={styles.upTitle}>{t('career.contractUp')}</Text>
              <Text style={styles.body}>{t('career.contractUpDesc')}</Text>
              <View style={styles.extendRow}>
                {TERMS.map((n) => (
                  <Button key={n} label={t('career.extend', { n })} variant="gold" style={{ flex: 1 }} onPress={() => c.extend(n)} testID={`extend-${n}`} />
                ))}
              </View>
              <Button label={t('career.retire')} variant="ghost" onPress={() => c.retire()} testID="career-retire" />
            </View>
          )}
          <Button label={ending ? t('career.endSure') : t('career.end')} variant="ghost" testID="career-end"
            onPress={() => { if (!ending) return setEnding(true); c.quit(); setEnding(false); }} />
        </Card>
      )}

      {leaders.length > 0 && (
        <Card style={{ gap: 6 }} testID="career-records">
          <Label color={C.gold}>{t('career.hof')}</Label>
          {hof.length === 0 && <Text style={styles.muted}>{t('career.hofEmpty')}</Text>}
          {hof.map((p) => (
            <View key={p.id} style={styles.hofRow}><Icon name="star" size={22} /><Text style={styles.hofName}>{p.name}  <Text style={styles.muted}>{p.seasons} · {(p.pts / p.gp).toFixed(1)} PPG{p.titles ? ` · ${p.titles}×` : ''}</Text></Text>{p.titles ? <Icon name="trophy" size={20} /> : null}</View>
          ))}
          <Label>{t('career.records')}</Label>
          {leaders.map((p, i) => (
            <View key={p.id} style={styles.recRow}>
              <Text style={styles.recRank}>{i + 1}</Text>
              <Text style={styles.recName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.recPts}>{p.pts.toLocaleString()}</Text>
              <Text style={styles.recPpg}>{(p.pts / p.gp).toFixed(1)}</Text>
            </View>
          ))}
        </Card>
      )}

      <Label>{t('career.history')}</Label>
      {c.history.length === 0 && <Text style={styles.muted}>{t('career.noHistory')}</Text>}
      {[...c.history].reverse().map((h) => (
        <Card key={h.label} style={styles.histRow}>
          <Text style={styles.histLabel}>{h.label}</Text>
          <Text style={styles.histRecord}>{h.wins}-{h.losses}</Text>
          <Text style={styles.histResult} numberOfLines={1}>{t(`career.r_${h.result}`)}</Text>
          {h.result === 'champion' && <Icon name="trophy" size={24} />}<Icon name={VERDICT_ICON[h.verdict]} size={26} />
        </Card>
      ))}
    </Screen>
  );
}


/** Every mode here (and every career season) draws on the full history: wait for it. */
export default function Career() {
  return <HistoryGate><CareerScreen /></HistoryGate>;
}

const styles = StyleSheet.create({
  dynasty: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, borderRadius: 24, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7 },
  dynastyIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  dynastyDesc: { color: '#E6DCFF', fontWeight: '700', fontSize: 13, lineHeight: 18 },
  big: { color: C.danger, fontSize: 26, ...F.display },
  contractUp: { gap: S.sm, padding: S.md, borderRadius: R.lg, borderWidth: 2, borderColor: C.accent, backgroundColor: C.surface2 },
  upTitle: { color: C.accent, fontSize: 22, ...F.display },
  extendRow: { flexDirection: 'row', gap: S.sm },
  body: { color: C.text, fontSize: 15, lineHeight: 22 },
  muted: { color: C.muted },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  season: { color: C.text, fontSize: 26, ...F.display },
  label: { color: C.muted, fontWeight: '800' },
  bar: { height: 10, borderRadius: R.pill, backgroundColor: C.surface2, overflow: 'hidden' },
  fill: { height: 10 },
  secNum: { fontWeight: '900', textAlign: 'right' },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  histLabel: { color: C.muted, width: 64, fontWeight: '700' },
  histRecord: { color: C.text, width: 56, fontWeight: '900' },
  histResult: { color: C.text, flex: 1 },
  histVerdict: { fontSize: 20 },
  banner: { height: 150, borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.lg, gap: 4 },
  bannerSub: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center', fontSize: 13, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  feature: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  featureTile: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#E8EDFB', borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontFamily: FONT.display, fontSize: 20, color: C.text },
  featureBody: { color: C.muted, fontWeight: '700', fontSize: 13 },
  hofName: { color: C.text, fontWeight: '900', flex: 1 },
  hofRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  recRank: { color: C.muted, width: 18, fontWeight: '800' },
  recName: { color: C.text, flex: 1, fontWeight: '700' },
  recPts: { color: C.text, fontWeight: '900', width: 64, textAlign: 'right' },
  recPpg: { color: C.muted, width: 40, textAlign: 'right' },
});
