import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { feel } from '../audio/feel';
import { DEADLINE_GAME, SEASON_GAMES, advance, outSet, standings, type SeasonState } from '../engine/season';
import { useGame } from '../store/game';
import { goHome } from '../ui/nav';
import { useSettings } from '../store/settings';
import { Button, Card, Header, Label, Screen } from '../ui/components';
import { RosterBoard } from '../ui/RosterBoard';
import { C, F, R, S } from '../ui/theme';

const BASE_TICK_MS = 120;

export default function Season() {
  const { t } = useTranslation();
  const g = useGame();
  const speed = useSettings((s) => s.simSpeed);
  const [season, setSeason] = useState<SeasonState | null>(g.season);
  const [playing, setPlaying] = useState(true);
  const live = useRef(season);
  live.current = season;

  const atDeadline = !!season && season.round === DEADLINE_GAME && !season.deadlineUsed;
  const over = !!season && season.round >= SEASON_GAMES;

  // Tick one game at a time at the chosen sim speed.
  useEffect(() => {
    if (!season || !playing || atDeadline || over) return;
    const id = setTimeout(() => {
      const next = advance(season, 1);
      setSeason(next);
      if (next.round % 5 === 0) useGame.getState().setSeason(next);
    }, BASE_TICK_MS / speed);
    return () => clearTimeout(id);
  }, [season, playing, atDeadline, over, speed]);

  // Save progress when leaving the screen; open the deadline when we reach it.
  useEffect(() => () => { if (live.current) useGame.getState().setSeason(live.current); }, []);
  // Store actions via getState(): depending on the store object here re-fires on every save (render loop).
  useEffect(() => {
    if (!atDeadline || !live.current) return;
    useGame.getState().openDeadline(live.current);
    router.replace('/deadline');
  }, [atDeadline]);
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
    s = advance(s, SEASON_GAMES);
    if (target === 'playoffs') s = advance(s, SEASON_GAMES);
    setSeason(s);
    g.setSeason(s);
  };

  return (
    <Screen>
      <Header
        title={t('season.title')}
        left={<Button label="‹" variant="ghost" onPress={() => goHome()} style={{ paddingVertical: 6 }} />}
        right={!over ? <Button label={playing ? '❚❚' : '▶'} variant="ghost" onPress={() => setPlaying((p) => !p)} style={{ paddingVertical: 6 }} /> : undefined}
      />

      <Card style={styles.scoreboard}>
        <Text style={styles.record} testID="record">{rec.w}-{rec.l}</Text>
        <Text style={styles.sub}>{t('season.game', { n: season.round })} · {t('season.standing', { n: seed })}</Text>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${(season.round / SEASON_GAMES) * 100}%` }]} />
          <View style={[styles.deadlineMark, { left: `${(DEADLINE_GAME / SEASON_GAMES) * 100}%` }]} />
        </View>
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

      <Card style={{ gap: 6 }}>
        {feed.length === 0 && <Text style={styles.sub}>Tip-off…</Text>}
        {feed.map((e, i) =>
          e.kind === 'game' ? (
            <GameLine key={i} e={e} name={name} t={t} />
          ) : (
            <Text key={i} style={styles.injury}>
              🩼 {e.label === 'Season-ending' ? t('season.seasonEnding', { name: e.name }) : t('season.injury', { name: e.name, games: e.games, label: t(`injury.${e.label}`) })}
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
});
