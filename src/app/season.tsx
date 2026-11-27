import { HistoryGate } from '../ui/HistoryGate';
import { runNeedsHistory } from '../data/historyReady';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { feel } from '../audio/feel';
import { DEADLINE_GAME, SEASON_GAMES, advance, outSet, type SeasonState } from '../engine/season';
import { seedLabel } from '../ui/seedLabel';
import { SquadBadge } from '../ui/SquadBadge';
import { squadRating } from '../engine/rotation';
import { isRTL } from '../i18n';
import { CARD_ROUNDS } from '../engine/crisis/deck';
import { useGame } from '../store/game';
import { goHome } from '../ui/nav';
import { useSettings } from '../store/settings';
import { BackButton, Button, Card, Header, IconButton, Label, Screen } from '../ui/components';
import { RosterBoard } from '../ui/RosterBoard';
import { C, FONT, R, S } from '../ui/theme';
import { useRunColors } from '../ui/runColors';
import { BoxScore, Expandable, NewsItem } from '../ui/story';
import { Icon } from '../ui/icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CRISIS_ICON } from '../ui/gameIcons';
import { planOf, stopAt } from '../engine/board/state';
import { cardOf } from '../engine/board/cards';
import { BoardPanel, ObjectiveBanner } from '../ui/board/BoardPanel';
import { KIND_ICON } from '../ui/board/text';
import { boardCtx } from '../store/boardCtx';
import { moneyScaleFor } from '../data/modes';

const BASE_TICK_MS = 120;

function SeasonScreen() {
  const { t, i18n } = useTranslation();
  const runColors = useRunColors();
  const g = useGame();
  const speed = useSettings((s) => s.simSpeed);
  const [season, setSeason] = useState<SeasonState | null>(g.season);
  const [playing, setPlaying] = useState(true);
  const live = useRef(season);
  useEffect(() => { live.current = season; }, [season]);

  const atDeadline = !!season && season.round === DEADLINE_GAME && !season.deadlineUsed;
  const crisis = g.crisis;
  const board = crisis?.board;
  // Board runs stop at their plan's rounds (the preseason one is dealt before the first game); older runs at the four card rounds.
  const atCard = !!season && !!crisis && (board
    ? season.round > 0 && stopAt(board)?.round === season.round && board.firedAt === undefined
    : crisis.resolved > 0 && season.round === CARD_ROUNDS[crisis.resolved]);
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

  // Back from the bench switch (or any screen that changed the run): pick up the saved season, so a switch is
  // never overwritten by this screen's copy. The season stays paused until you resume it.
  useFocusEffect(useCallback(() => {
    const saved = useGame.getState().season;
    if (saved && saved !== live.current) setSeason(saved);
  }, []));

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
  // Fired by the board (at a stop or the deadline): straight to the verdict.
  if (g.phase === 'result' && board?.firedAt !== undefined) return <Redirect href="/result" />;

  const rec = season.records[0];
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
        right={!over ? (
          <IconButton onPress={() => setPlaying((p) => !p)} label={playing ? t('season.pause') : t('season.play')}>
            {playing ? <Text style={styles.pause}>❚❚</Text> : <Icon name="play" size={22} />}
          </IconButton>
        ) : undefined}
      />

      <View style={styles.scoreboard}>
        <LinearGradient colors={['#1B1626', '#2A2140']} style={StyleSheet.absoluteFill} />
        <View style={[styles.boardStripe, { backgroundColor: runColors[0] }]} />
        <Text style={styles.boardKicker}>{t('season.game', { n: season.round })}</Text>
        <View style={styles.recordRow}>
          <View style={styles.recordBox}><Text style={styles.recordLabel}>W</Text><Text style={[styles.record, { color: '#3DF2A8' }]} testID="record">{rec.w}</Text></View>
          <Text style={styles.recordDash}>–</Text>
          <View style={styles.recordBox}><Text style={styles.recordLabel}>L</Text><Text style={[styles.record, { color: '#FF7A8A' }]}>{rec.l}</Text></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={styles.seedPill}><Text style={styles.seedText}>{seedLabel(t, season)}</Text></View>
          <SquadBadge value={squadRating(season.teams[0])} size="sm" />
        </View>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${(season.round / SEASON_GAMES) * 100}%` }]} />
          <View style={[styles.deadlineMark, { [isRTL(i18n.language) ? "right" : "left"]: `${(DEADLINE_GAME / SEASON_GAMES) * 100}%` }]} />
        </View>
        {crisis?.objective && board && (
          <View style={styles.crisisRow}>
            <Text style={styles.crisisGoal}>{t(`crisis.obj_${crisis.objective.tier}`)}</Text>
            <View style={styles.crisisIcons}>
              {board.played.map((p, i) => (
                <View key={i} style={styles.crisisSlot}>
                  <Icon name={KIND_ICON[cardOf(p.id).kind]} size={18} />
                </View>
              ))}
              {planOf(board).slice(board.stop).map((_, i) => (
                <View key={`next-${i}`} style={[styles.crisisSlot, { opacity: 0.35 }]}>
                  <Icon name="lock" size={18} />
                </View>
              ))}
            </View>
          </View>
        )}
        {crisis?.objective && !board && (
          <View style={styles.crisisRow}>
            <Text style={styles.crisisGoal}>{t(`crisis.obj_${crisis.objective.tier}`)}</Text>
            <View style={styles.crisisIcons}>
              {CARD_ROUNDS.map((_, i) => (
                <View key={i} style={[styles.crisisSlot, !crisis.drawn[i] && { opacity: 0.35 }]}>
                  <Icon name={crisis.drawn[i] ? CRISIS_ICON[crisis.drawn[i]] ?? 'siren' : 'lock'} size={22} />
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {board && <ObjectiveBanner board={board} ctx={boardCtx(g.poolId, season)} scale={moneyScaleFor(g.poolId)} takeover={!!crisis?.rebuild} />}
      {!over && (
        <Button label={playing ? t('season.pauseSeason') : t('season.resumeSeason')} variant={playing ? 'secondary' : 'gold'}
          icon={playing ? <Text style={styles.pause}>❚❚</Text> : <Icon name="play" size={22} />}
          onPress={() => setPlaying((p) => !p)} testID="season-pause" />
      )}
      {!over && (
        <View style={styles.row}>
          {season.round < DEADLINE_GAME && !season.deadlineUsed && (
            <Button label={t('season.skipDeadline')} variant="secondary" onPress={() => skipTo('deadline')} style={{ flex: 1 }} testID="skip-deadline" />
          )}
          <Button label={t('season.skipPlayoffs')} variant="secondary" onPress={() => skipTo('playoffs')} style={{ flex: 1 }} testID="skip-playoffs" />
        </View>
      )}
      {!over && !season.switchUsed && (
        <Button label={t('switch.button')} icon={<Icon name="swap" size={22} />} variant="blue" onPress={() => { setPlaying(false); if (live.current) useGame.getState().setSeason(live.current); router.push('/switch'); }} testID="bench-switch" />
      )}
      {over && (
        <Button label={t('playoffs.title')} icon={<Icon name="trophy" size={22} />} variant="gold" onPress={() => { g.beginPlayoffs(); router.replace('/playoffs'); }} testID="to-playoffs" />
      )}

      {board && (
        <BoardPanel board={board} ctx={boardCtx(g.poolId, season)} scale={moneyScaleFor(g.poolId)} news={crisis?.news}
          onVeto={(i) => g.boardVeto(i)}
          onOffice={() => { setPlaying(false); if (live.current) useGame.getState().setSeason(live.current); router.push('/office'); }} />
      )}
      {(season.news?.length ?? 0) > 0 && (
        <Card style={{ gap: 8 }} testID="news">
          <Label color={C.hardwood}>{t('news.title')}</Label>
          {season.news!.slice(-3).reverse().map((h, i) => <NewsItem key={`${h.round}-${h.kind}-${i}`} h={h} />)}
        </Card>
      )}
      <Button label={t('league.title')} icon={<Icon name="chart" size={22} />} variant="secondary" onPress={() => router.push('/league')} testID="to-league" />

      <Card style={{ gap: 6 }}>
        {feed.length === 0 && <Text style={styles.sub}>Tip-off…</Text>}
        {feed.some((e) => e.kind === 'game' && e.result.box.length > 0) && <Text style={styles.hint}>{t('box.tap')}</Text>}
        {feed.map((e, i) =>
          e.kind === 'game' ? (
            <Expandable key={`g-${e.round}`} enabled={e.result.box.length > 0} head={<GameLine e={e} name={name} t={t} />}>
              <BoxScore
                result={e.result}
                mine={season.teams[0]}
                theirs={season.teams[e.home === 0 ? e.away : e.home]}
                names={[t('league.you'), name(e.home === 0 ? e.away : e.home)]}
                userHome={e.home === 0}
              />
            </Expandable>
          ) : (
            <Text key={`i-${e.round}-${e.playerId}`} style={styles.injury}>
              + {e.label === 'Season-ending' ? t('season.seasonEnding', { name: e.name }) : t('season.injury', { name: e.name, count: e.games, label: t(`injury.${e.label}`) })}
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


/** Waits for the full history when this run needs it (an era, All-Time, a franchise, Crisis, Career). */
export default function Season() {
  const needs = useGame((s) => runNeedsHistory(s));
  return <HistoryGate when={needs}><SeasonScreen /></HistoryGate>;
}

const styles = StyleSheet.create({
  scoreboard: {
    alignItems: 'center', gap: S.sm, paddingVertical: S.lg, paddingHorizontal: S.lg, borderRadius: R.lg, overflow: 'hidden',
    borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7,
  },
  boardStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },
  boardKicker: { color: '#B9B1C9', fontWeight: '900', letterSpacing: 2, fontSize: 12, textTransform: 'uppercase' },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  recordBox: { alignItems: 'center', backgroundColor: '#0E0B15', borderRadius: 14, paddingHorizontal: 18, paddingTop: 4, borderWidth: 2, borderColor: '#3A3050', minWidth: 104 },
  recordLabel: { color: '#8D84A0', fontWeight: '900', fontSize: 11, letterSpacing: 2 },
  record: { fontSize: 60, fontFamily: FONT.display, lineHeight: 70 },
  recordDash: { color: '#6E6582', fontSize: 40, fontFamily: FONT.display },
  seedPill: { backgroundColor: '#FFFFFF', borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 4 },
  seedText: { fontWeight: '900', color: C.ink },
  sub: { color: C.muted, fontSize: 13, fontWeight: '700' },
  pause: { fontWeight: '900', fontSize: 16, color: C.ink },
  progress: { height: 12, alignSelf: 'stretch', backgroundColor: '#0E0B15', borderRadius: R.pill, overflow: 'hidden', marginTop: S.sm, borderWidth: 2, borderColor: '#3A3050' },
  progressFill: { height: '100%', backgroundColor: C.hardwood },
  deadlineMark: { position: 'absolute', top: 0, width: 3, height: '100%', backgroundColor: '#FFC53D' },
  row: { flexDirection: 'row', gap: S.sm },
  gameLine: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  wl: { width: 18, fontWeight: '900' },
  score: { color: C.text, fontWeight: '800', width: 90 },
  opp: { color: C.muted, flex: 1 },
  gnum: { color: C.line, fontSize: 12 },
  injury: { color: C.gold, fontSize: 13 },
  hint: { color: C.muted, fontSize: 11 },
  crisisRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: S.sm },
  crisisGoal: { color: '#FFFFFF', fontWeight: '900' },
  crisisIcons: { flexDirection: 'row', gap: 4 },
  crisisSlot: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 2 },
});
