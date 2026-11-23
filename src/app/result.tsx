import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { feel } from '../audio/feel';
import { champion, seriesFor, seriesWinner } from '../engine/playoffs';
import { standings } from '../engine/season';
import { ALL_SLOTS } from '../engine/types';
import { cardDef } from '../engine/crisis/deck';
import { useCareer } from '../store/career';
import { useCollection } from '../store/collection';
import { useGame } from '../store/game';
import { goHome } from '../ui/nav';
import { Button, Card, Display, Screen } from '../ui/components';
import { Confetti, CountUp } from '../ui/fx';
import { useRunColors } from '../ui/runColors';
import { RosterBoard } from '../ui/RosterBoard';
import { C, F, S } from '../ui/theme';
import { AWARDS, awardRace } from '../engine/story/leaders';
import { Icon } from '../ui/icons';
import { shareText } from '../ui/share';
import { useProfile } from '../store/profile';
import { runShareText } from '../engine/share';
import { MODE_BY_ID } from '../data/modes';
import { CONFIG } from '../config';

const VERDICT_ICON = { legend: 'crown', extended: 'medal', survived: 'clock', fired: 'flame' } as const;

export default function Result() {
  const { t } = useTranslation();
  const g = useGame();
  const ps = g.playoffs;
  const won = !!ps && champion(ps) === 0;
  const career = useCareer();
  const pendingPicks = useCollection((s) => s.pending.length);
  const colors = useRunColors();
  const [shared, setShared] = useState<'shared' | 'copied' | null>(null);
  const profileName = useProfile((s) => s.name);
  // Career seasons are recorded once, as soon as the result is shown.
  useEffect(() => { if (g.career) useCareer.getState().recordSeason(); }, [g.career]);
  useEffect(() => { if (won) feel('fanfare'); }, [won]);
  if (!ps) return <Redirect href="/" />;

  const season = ps.season;
  const rec = season.records[0];
  const seed = standings(season).findIndex((r) => r.team === 0) + 1;
  const mine = seriesFor(ps, 0);
  const outcome = won
    ? t('result.champions')
    : mine && seriesWinner(mine.series) !== 0
      ? t('result.lostIn', { round: t(`playoffs.round${mine.round}`) })
      : t('result.missed');

  const user = season.teams[0];
  const top = ALL_SLOTS.map((s) => user.slots[s])
    .map((p) => ({ p, tot: season.totals[p.id] }))
    .filter((x) => x.tot?.gp)
    .sort((a, b) => b.tot.pts / b.tot.gp - a.tot.pts / a.tot.gp)[0];

  return (
    <Screen tint={won ? C.gold : colors[0]} overlay={won ? <Confetti colors={[C.gold, colors[0], colors[1], '#FFFFFF']} /> : null}>
      {g.challenge && (
        <View style={[styles.challenge, { borderColor: rec.w > g.challenge.w ? '#14A86B' : C.danger }]} testID="challenge-result">
          <Icon name={rec.w > g.challenge.w ? 'crown' : 'vs'} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.challengeTitle}>
              {rec.w > g.challenge.w ? t('challenge.won', { name: g.challenge.name }) : rec.w === g.challenge.w ? t('challenge.tied', { name: g.challenge.name }) : t('challenge.lost', { name: g.challenge.name })}
            </Text>
            <Text style={styles.challengeSub}>{rec.w}-{rec.l} vs {g.challenge.w}-{g.challenge.l}</Text>
          </View>
        </View>
      )}
      <View style={styles.hero}>
        <View style={[styles.trophyRing, { backgroundColor: won ? '#FFE9A8' : '#FFFFFF' }]}>
          <Icon name={won ? 'trophy' : mine ? 'ball' : 'chart'} size={96} />
        </View>
        <Display size={won ? 40 : 32} color={won ? '#FFC53D' : '#FFFFFF'}>{outcome}</Display>
        {g.crisis?.verdict && g.crisis.objective && (
          <View style={styles.verdict} testID="crisis-verdict">
            <Icon name={VERDICT_ICON[g.crisis.verdict]} size={44} />
            <Text style={styles.verdictBig}>
              {t(`crisis.v_${g.crisis.verdict}`)}
            </Text>
            <Text style={styles.verdictSub}>{t('crisis.objective')}: {t(`crisis.obj_${g.crisis.objective.tier}`)}</Text>
            <Text style={styles.verdictSub}>{g.crisis.drawn.map((id) => `${cardDef(id).icon} ${t(`crisis.cards.${id}.title`)}`).join('  ·  ')}</Text>
          </View>
        )}
      </View>
      <Card style={styles.stats}>
        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <CountUp to={rec.w} format={(n) => `${n}-${rec.l}`} style={[styles.value, won && { color: C.gold }]} testID="result-record" />
          <Text style={styles.sub}>{t('result.record')}</Text>
        </View>
        <Stat label={t('result.seed')} value={`#${seed}`} />
        {top && <Stat label={t('result.topScorer')} value={`${(top.tot.pts / top.tot.gp).toFixed(1)}`} sub={top.p.name} />}
      </Card>
      <Card style={{ gap: S.sm }} testID="awards">
        <View style={styles.awardsHead}><Icon name="medal" size={26} /><Text style={styles.awardsTitle}>{t('result.awards')}</Text></View>
        {AWARDS.map((a) => {
          const w = awardRace(season, a, 1)[0];
          if (!w) return null;
          return (
            <View key={a} style={styles.awardRow}>
              <Text style={styles.awardName}>{t(`league.${a}`)}</Text>
              <Text style={[styles.awardWinner, w.team === 0 && { color: C.gold }]} numberOfLines={1}>
                {w.player.name}{w.team === 0 ? ' ★' : ''}
              </Text>
            </View>
          );
        })}
      </Card>
      <RosterBoard roster={user.slots} />
      {pendingPicks > 0 && (
        <Button label={t('collect.claim')} icon={<Icon name="gift" size={22} />} variant="gold" onPress={() => router.push('/packs')} testID="claim-pick" />
      )}
      {g.career ? (
        <Button
          label={career.ended ? t('career.over') : t('career.toOffseason')}
          variant="gold"
          onPress={() => { if (!career.ended) career.beginOffseason(); router.replace(career.ended ? '/career' : '/offseason'); }}
          testID="career-continue"
        />
      ) : null}
      {!g.career && (
        <Button label={shared ? t(`challenge.${shared}`) : t('challenge.share')} variant="dark" icon={<Icon name="swap" size={22} />} testID="share"
          onPress={async () => {
            const text = runShareText({
              wins: rec.w, losses: rec.l, result: won ? 'champion' : mine ? `round${mine.round}` : 'missed', resultLabel: outcome,
              mode: MODE_BY_ID[g.poolId]?.title ?? 'Ten Deep', ovrs: ALL_SLOTS.map((k) => user.slots[k].ovr), seed: season.seed,
              poolId: g.poolId, name: profileName || t('home.player'), url: CONFIG.webUrl,
            });
            const r = await shareText(text);
            if (r !== 'failed') setShared(r);
          }} />
      )}
      {!g.career && <Button label={t('result.playAgain')} onPress={() => { if (g.crisis) g.newCrisis(g.poolId); else g.newRun(g.poolId); router.replace('/draft'); }} testID="play-again" />}
      <Button label={t('result.home')} variant="ghost" onPress={() => { g.quit(); goHome(); }} testID="go-home" />
    </Screen>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={styles.value}>{value}</Text>
      {sub && <Text style={styles.sub} numberOfLines={1}>{sub}</Text>}
      <Text style={styles.sub}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: S.xxl, gap: S.sm },
  trophyRing: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7 },
  awardsHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  outcome: { color: C.text, fontSize: 30, textAlign: 'center', ...F.display },
  verdict: { alignItems: 'center', gap: 4, marginTop: S.sm },
  verdictBig: { color: C.hardwood, fontSize: 22, textAlign: 'center', ...F.display },
  verdictSub: { color: C.muted, fontSize: 13, textAlign: 'center' },
  stats: { flexDirection: 'row' },
  value: { color: C.text, fontSize: 26, ...F.display },
  sub: { color: C.muted, fontSize: 12 },
  challenge: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: 20, borderWidth: 3, backgroundColor: '#FFFFFF', marginTop: S.md },
  challengeTitle: { fontWeight: '900', fontSize: 17, color: C.ink },
  challengeSub: { color: C.muted, fontWeight: '800' },
  awardsTitle: { color: C.text, fontWeight: '900', fontSize: 15 },
  awardRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  awardName: { color: C.muted, fontSize: 12, flex: 1 },
  awardWinner: { color: C.text, fontWeight: '800', flex: 1, textAlign: 'right' },
});
