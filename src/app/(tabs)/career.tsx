import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../ui/Text';
import { seasonLabel } from '../../engine/career/offseason';
import { useCareer } from '../../store/career';
import { useGame } from '../../store/game';
import { Button, Card, Display, Label, Screen, TabTitle } from '../../ui/components';
import { C, F, FONT, R, S } from '../../ui/theme';
import { franchiseLeaders, hallOfFame } from '../../engine/career/legacy';
import { MORALE_START, moraleMod } from '../../engine/career/morale';
import { CourtArt, Icon } from '../../ui/icons';

const VERDICT_ICON = { legend: 'crown', extended: 'medal', survived: 'clock', fired: 'flame' } as const;
const ROUTE: Record<string, '/draft' | '/season' | '/deadline' | '/crisis' | '/playoffs' | '/result'> = {
  draft: '/draft', season: '/season', deadline: '/deadline', crisis: '/crisis', playoffs: '/playoffs', result: '/result',
};

/** Career hub: season, job security, history, and the next thing to do. */
export default function Career() {
  const [bannerW, setBannerW] = useState(320);
  const { t } = useTranslation();
  const c = useCareer();
  const [ending, setEnding] = useState(false);
  const g = useGame();
  const morale = c.morale ?? MORALE_START;
  const leaders = franchiseLeaders(c.stats ?? {}, 5);
  const hof = hallOfFame(c.stats ?? {});
  const titles = c.history.filter((h) => h.result === 'champion').length;
  const secColor = c.security >= 60 ? C.neon : c.security >= 30 ? C.gold : C.danger;

  const next = (() => {
    if (!c.active || c.ended) return null;
    if (c.step) return { label: t('career.toOffseason'), go: () => router.push('/offseason') };
    if (g.career && g.phase !== 'idle' && g.phase !== 'result') return { label: t('career.resume'), go: () => router.push(ROUTE[g.phase]) };
    // Another run replaced the live season: bring it back (that run is left behind, like any abandoned run).
    if (g.parked && g.parked.phase !== 'idle') { const ph = g.parked.phase; return { label: t('career.resume'), go: () => { g.resumeCareer(); router.push(ROUTE[ph]); } }; }
    if (c.history.length >= c.season) return { label: t('career.toOffseason'), go: () => { c.beginOffseason(); router.push('/offseason'); } };
    return { label: t('career.resume'), go: () => router.push(g.career && g.phase !== 'idle' ? ROUTE[g.phase] : '/draft') };
  })();

  return (
    <Screen tint={C.pink} tabbed>
      <TabTitle icon={<Icon name="briefcase" size={46} />} title={t('career.title')} />

      {(!c.active || c.ended) && (
        <Card style={{ gap: S.md }}>
          {c.ended ? (
            <>
              <Text style={styles.big} testID="career-over">{t('career.over')}</Text>
              <Text style={styles.body}>{t('career.overDesc', { n: c.history.length, titles })}</Text>
            </>
          ) : (
            <>
              <View style={styles.banner} onLayout={(e) => setBannerW(e.nativeEvent.layout.width)}>
                <View style={StyleSheet.absoluteFill}><CourtArt width={bannerW} height={150} color="#C2185B" /></View>
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
          <Button label={c.ended ? t('career.newCareer') : t('career.start')} variant="dark" onPress={() => { c.start(); router.push('/draft'); }} testID="career-start" />
        </Card>
      )}

      {c.active && !c.ended && (
        <Card style={{ gap: S.sm }}>
          <View style={styles.row}>
            <Text style={styles.season}>{t('career.season', { n: c.season })}</Text>
            <Text style={styles.label}>{seasonLabel(c.season)}</Text>
          </View>
          <Label>{t('career.security')}</Label>
          <View style={styles.bar}><View style={[styles.fill, { width: `${c.security}%`, backgroundColor: secColor }]} /></View>
          <Text style={[styles.secNum, { color: secColor }]} testID="career-security">{c.security}/100</Text>
          <Label>{t('career.morale')}</Label>
          <View style={styles.bar}><View style={[styles.fill, { width: `${morale}%`, backgroundColor: C.neon }]} /></View>
          <Text style={[styles.secNum, { color: C.neon }]} testID="career-morale">
            {morale}/100 · {moraleMod(morale) > 0 ? `+${moraleMod(morale)}` : moraleMod(morale)} {t('career.moraleEffect')}
          </Text>
          {next && <Button label={next.label} variant="gold" onPress={next.go} testID="career-next" />}
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

const styles = StyleSheet.create({
  big: { color: C.danger, fontSize: 26, ...F.display },
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
  featureTile: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#FDE7F0', borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontFamily: FONT.display, fontSize: 20, color: C.ink },
  featureBody: { color: C.muted, fontWeight: '700', fontSize: 13 },
  hofName: { color: C.ink, fontWeight: '900', flex: 1 },
  hofRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  recRank: { color: C.muted, width: 18, fontWeight: '800' },
  recName: { color: C.text, flex: 1, fontWeight: '700' },
  recPts: { color: C.text, fontWeight: '900', width: 64, textAlign: 'right' },
  recPpg: { color: C.muted, width: 40, textAlign: 'right' },
});
