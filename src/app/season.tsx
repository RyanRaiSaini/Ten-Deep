import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { feel } from '../audio/feel';
import { DEADLINE_GAME, SEASON_GAMES, advance, outSet, standings, type SeasonState } from '../engine/season';
import { isRTL } from '../i18n';
import { CARD_ROUNDS, cardDef } from '../engine/crisis/deck';
import { useGame } from '../store/game';
import { goHome } from '../ui/nav';
import { useSettings } from '../store/settings';
import { BackButton, Button, Card, Header, Label, Screen } from '../ui/components';
import { RosterBoard } from '../ui/RosterBoard';
import { C, F, R, S } from '../ui/theme';
import { useRunColors } from '../ui/runColors';
import { BoxScore, Expandable, NewsItem } from '../ui/story';

const BASE_TICK_MS = 120;

export default function Season() {
  const { t, i18n } = useTranslation();
  const runColors = useRunColors();
  const g = useGame();
  const speed = useSettings((s) => s.simSpeed);
  const [season, setSeason] = useState<SeasonState | null>(g.season);
  const [playing, setPlaying] = useState(true);
  const live = useRef(season);
  live.current = season;

  const atDeadline = !!season && season.round === DEADLINE_GAME && !season.deadlineUsed;
  const crisis = g.crisis;
  const atCard = !!season && !!crisis && crisis.resolved > 0 && season.round === CARD_ROUNDS[crisis.resolved];
  const over = !!season && season.round >= SEASON_GAMES;

  // Tick one game at a time at the chosen sim speed.
  useEffect(() => {
    if (!season || !playing || atDeadline || atCard || over) return;
    const id = setTimeout(() => {
      const next = advance(season, 1);
      setSeason(next);
      if (next.round % 5 === 0) useGame.getState().setSeason(next);
    }, BASE_TICK_MS / speed);
    return () => clearTimeout(id);
  }, [season, playing, atDeadline, atCard, over, speed]);

  // Save progress when leaving the screen; open the deadline when we reach it.
  useEffect(() => () => { if (live.current) useGame.getState().setSeason(live.current); }, []);
  // Store actions via getState(): depending on the store object here re-fires on every save (render loop).
  useEffect(() => {
    if (!atDeadline || !live.current) return;
    useGame.getState().openDeadline(live.current);
    router.replace('/deadline');
  }, [atDeadline]);
  useEffect(() => {
    if (!atCard || !live.current) return;
    useGame.getState().openCrisis(live.current);
    router.replace('/crisis');
  }, [atCard]);
  useEffect(() => {
    if (!over || !live.current) return;
    useGame.getState().setSeason(live.current);
    feel('buzzer');
  }, [over]);

  if (!season) return <Redirect href="/" />;

  const rec = season.records[0];
  const seed = standings(season).findIndex((r) => r.team === 0) + 1;
  const out = outSet(season.injuries, season.teams[0]);
  const feed = season.log.slice(-14).reverse();
  const name = (i: number) => (i === 0 ? 'You' : season.teams[i].name);

  const skipTo = (target: 'deadline' | 'playoffs') => {
    let s = season;
    if (target === 'playoffs' && !s.deadlineUsed) s = { ...s, deadlineUsed: true };
    // One jump: it stops at the deadline (if still open) and at any crisis card on the way.
    s = advance(s, SEASON_GAMES);
    setSeason(s);
    g.setSeason(s);
  };

  return (
    <Screen tint={runColors[0]}>
      <Header
        title={t('season.title')}
        left={<BackButton onPress={() => goHome()} />}
        right={!over ? <Button label={playing ? '❚❚' : '▶'} accessibilityLabel={playing ? t('season.pause') : t('season.play')} variant="ghost" onPress={() => setPlaying((p) => !p)} style={{ paddingVertical: 6 }} /> : undefined}
      />

      <Card style={styles.scoreboard}>
        <Text style={styles.record} testID="record">{rec.w}-{rec.l}</Text>
        <Text style={styles.sub}>{t('season.game', { n: season.round })} · {t('season.standing', { n: seed })}</Text>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${(season.round / SEASON_GAMES) * 100}%` }]} />
          <View style={[styles.deadlineMark, { [isRTL(i18n.language) ? "right" : "left"]: `${(DEADLINE_GAME / SEASON_GAMES) * 100}%` }]} />
        </View>
        {crisis?.objective && (
          <View style={styles.crisisRow}>
            <Text style={styles.crisisGoal}>🎯 {t(`crisis.obj_${crisis.objective.tier}`)}</Text>
            <Text style={styles.crisisCards}>
              {CARD_ROUNDS.map((_, i) => (crisis.drawn[i] ? cardDef(crisis.drawn[i]).icon : '🂠')).join(' ')}
            </Text>
          </View>
        )}
      </Card>

      {!over && (
        <View style={styles.row}>
          {season.round < DEADLINE_GAME && !season.deadlineUsed && (
            <Button label={t('season.skipDeadline')} variant="secondary" onPress={() => skipTo('deadline')} style={{ flex: 1 }} testID="skip-deadline" />
          )}
          <Button label={t('season.skipPlayoffs')} variant="secondary" onPress={() => skipTo('playoffs')} style={{ flex: 1 }} testID="skip-playoffs" />
        </View>
      )}
      {over && (
        <Button label={`🏆  ${t('playoffs.title')}`} variant="gold" onPress={() => { g.beginPlayoffs(); router.replace('/playoffs'); }} testID="to-playoffs" />
      )}

      {(season.news?.length ?? 0) > 0 && (
        <Card style={{ gap: 8 }} testID="news">
          <Label color={C.hardwood}>{t('news.title')}</Label>
          {season.news!.slice(-3).reverse().map((h, i) => <NewsItem key={`${h.round}-${h.kind}-${i}`} h={h} />)}
        </Card>
      )}
      <Button label={`📊  ${t('league.title')}`} variant="secondary" onPress={() => router.push('/league')} testID="to-league" />

      <Card style={{ gap: 6 }}>
        {feed.length === 0 && <Text style={styles.sub}>Tip-off…</Text>}
        {feed.some((e) => e.kind === 'game' && e.result.box.length > 0) && <Text style={styles.hint}>{t('box.tap')}</Text>}
        {feed.map((e, i) =>
          e.kind === 'game' ? (
            <Expandable key={i} enabled={e.result.box.length > 0} head={<GameLine e={e} name={name} t={t} />}>
              <BoxScore
                result={e.result}
                mine={season.teams[0]}
                theirs={season.teams[e.home === 0 ? e.away : e.home]}
                names={[t('league.you'), name(e.home === 0 ? e.away : e.home)]}
              />
            </Expandable>
          ) : (
            <Text key={i} style={styles.injury}>
              🩼 {e.label === 'Season-ending' ? t('season.seasonEnding', { name: e.name }) : t('season.injury', { name: e.name, count: e.games, label: t(`injury.${e.label}`) })}
            </Text>
          ),
        )}
      </Card>

      <RosterBoard roster={season.teams[0].slots} injured={out} />
    </Screen>
  );
}

function GameLine({ e, name, t }: { e: Extract<SeasonState['log'][number], { kind: 'game' }>; name: (i: number) => string; t: (k: string) => string }) {
  const home = e.home === 0;
  const us = home ? e.result.homeScore : e.result.awayScore;
  const them = home ? e.result.awayScore : e.result.homeScore;
  const won = us > them;
  return (
    <View style={styles.gameLine}>
      <Text style={[styles.wl, { color: won ? C.neon : C.danger }]}>{won ? 'W' : 'L'}</Text>
      <Text style={styles.score}>{us}-{them}{e.result.ot ? ` (${e.result.ot}OT)` : ''}</Text>
      <Text style={styles.opp} numberOfLines={1}>{home ? t('season.vs') : t('season.at')} {name(home ? e.away : e.home)}</Text>
      <Text style={styles.gnum}>G{e.round + 1}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreboard: { alignItems: 'center', gap: S.sm, paddingVertical: S.xl },
  record: { color: C.text, fontSize: 64, ...F.display },
  sub: { color: C.muted, fontSize: 13 },
  progress: { height: 6, alignSelf: 'stretch', backgroundColor: C.surface2, borderRadius: R.pill, overflow: 'hidden', marginTop: S.sm },
  progressFill: { height: 6, backgroundColor: C.hardwood },
  deadlineMark: { position: 'absolute', top: 0, width: 2, height: 6, backgroundColor: C.gold },
  row: { flexDirection: 'row', gap: S.sm },
  gameLine: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  wl: { width: 18, fontWeight: '900' },
  score: { color: C.text, fontWeight: '800', width: 90 },
  opp: { color: C.muted, flex: 1 },
  gnum: { color: C.line, fontSize: 12 },
  injury: { color: C.gold, fontSize: 13 },
  hint: { color: C.muted, fontSize: 11 },
  crisisRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: S.sm },
  crisisGoal: { color: C.text, fontWeight: '800' },
  crisisCards: { fontSize: 18, letterSpacing: 2 },
});
