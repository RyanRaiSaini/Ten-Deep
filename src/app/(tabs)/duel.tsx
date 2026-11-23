import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../ui/Text';
import { feel } from '../../audio/feel';
import { MAX_SUPERSTARS, capRoom, superstarCount } from '../../engine/cap';
import { duelOptions, isDuelComplete } from '../../engine/duel';
import type { SlotId } from '../../engine/types';
import { DUEL_COLORS, DUEL_POOL, useDuel } from '../../store/duel';
import { BackButton, Button, Card, Display, Header, Label, Screen, TabTitle } from '../../ui/components';
import { PlayerCard } from '../../ui/PlayerCard';
import { RosterBoard } from '../../ui/RosterBoard';
import { C, F, R, S, money } from '../../ui/theme';
import { Icon } from '../../ui/icons';
import { AVATARS } from '../../ui/avatars';
import { Avatar } from '../../ui/Avatar';
import { goBack } from '../../ui/nav';

export default function Duel() {
  const { t } = useTranslation();
  const d = useDuel();
  const [p1, setP1] = useState(d.names.a);
  const [p2, setP2] = useState(d.names.b);
  const [chosen, setChosen] = useState<string | null>(null);

  // --- Setup -------------------------------------------------------------------------------
  if (!d.state) {
    return (
      <Screen tint={C.danger} tabbed>
        <View style={styles.banner}>
          <View style={[styles.half, { backgroundColor: '#E5484D' }]} />
          <View style={[styles.half, { backgroundColor: '#3B6CF0', left: '50%' }]} />
          <View style={styles.courtLine} />
          <View style={styles.centerCircle} />
          <View style={styles.faceoff}>
            <View style={styles.faceRing}><Avatar id={AVATARS[11].id} size={78} /></View>
            <View style={styles.vsBadge}><Icon name="vs" size={64} /></View>
            <View style={styles.faceRing}><Avatar id={AVATARS[20].id} size={78} /></View>
          </View>
          <Display size={38}>{t('duel.title')}</Display>
        </View>
        <Text style={styles.lead}>{t('duel.passPlay')}</Text>
        <Card style={{ gap: S.md }}>
          <Label color={DUEL_COLORS.a[0]}>{t('duel.p1')}</Label>
          <TextInput value={p1} onChangeText={setP1} style={[styles.input, { borderColor: DUEL_COLORS.a[0] }]} maxLength={16} testID="p1" />
          <Label color={DUEL_COLORS.b[0]}>{t('duel.p2')}</Label>
          <TextInput value={p2} onChangeText={setP2} style={[styles.input, { borderColor: DUEL_COLORS.b[0] }]} maxLength={16} testID="p2" />
        </Card>
        <Button label={t('duel.start')} icon={<Icon name="shield" size={22} />} onPress={() => d.start(p1, p2)} testID="duel-start" />
        <Text style={styles.note}>{t('duel.online')}</Text>
      </Screen>
    );
  }

  const s = d.state;
  const names = d.names;

  // --- Series --------------------------------------------------------------------------------
  if (isDuelComplete(s)) {
    const series = d.series;
    const shownGames = series ? series.games.slice(0, d.shown) : [];
    const wa = shownGames.filter((g) => g.scoreA > g.scoreB).length;
    const wb = shownGames.length - wa;
    const over = !!series && d.shown >= series.games.length;
    const winner = series && (series.winner === 'a' ? names.a : names.b);
    return (
      <Screen>
        <Header title={t('duel.title')} left={<BackButton onPress={() => goBack()} />} />
        <Card style={styles.board}>
          <Side name={names.a} wins={wa} color={DUEL_COLORS.a[0]} />
          <Text style={styles.vs}>vs</Text>
          <Side name={names.b} wins={wb} color={DUEL_COLORS.b[0]} />
        </Card>
        {shownGames.map((g, i) => (
          <Text key={i} style={[styles.game, { color: g.scoreA > g.scoreB ? DUEL_COLORS.a[0] : DUEL_COLORS.b[0] }]}>
            G{i + 1}   {g.scoreA} – {g.scoreB}
          </Text>
        ))}
        {!series && <Button label={t('duel.playSeries')} variant="gold" onPress={() => { d.playSeries(); feel('crowd'); }} testID="duel-series" />}
        {series && !over && (
          <Button
            label={t('duel.nextGame', { n: d.shown + 1 })}
            onPress={() => { d.reveal(); feel(d.shown + 1 >= series.games.length ? 'fanfare' : 'swish'); }}
            testID="duel-next"
          />
        )}
        {over && (
          <>
            <Text style={styles.winner} testID="duel-winner">
              {t('duel.winsSeries', { name: winner, w: 4, l: Math.min(series!.winsA, series!.winsB) })}
            </Text>
            <Button label={t('duel.rematch')} onPress={() => d.start(names.a, names.b)} testID="duel-rematch" />
            <Button label={t('duel.newDuel')} variant="ghost" onPress={d.reset} />
          </>
        )}
        <Label color={DUEL_COLORS.a[0]}>{names.a}</Label>
        <RosterBoard roster={s.a.roster} />
        <Label color={DUEL_COLORS.b[0]}>{names.b}</Label>
        <RosterBoard roster={s.b.roster} />
      </Screen>
    );
  }

  // --- Draft ---------------------------------------------------------------------------------
  const me = s[s.turn];
  const color = DUEL_COLORS[s.turn][0];
  const opts = duelOptions(s, DUEL_POOL);
  const usable = opts.filter((o) => o.affordable);
  const chosenOpt = opts.find((o) => o.player.id === chosen);
  const place = (id: string, slot: SlotId) => {
    d.pick(id, slot);
    setChosen(null);
    feel('pickChime');
  };

  return (
    <Screen>
      <Header title={t('duel.title')} left={<BackButton onPress={() => goBack()} />} right={<Text style={{ color: C.gold, fontWeight: '800' }}>★ {superstarCount(me.roster)}/{MAX_SUPERSTARS}</Text>} />
      <View style={[styles.turn, { backgroundColor: color }]}>
        <Text style={styles.turnText} testID="duel-turn">{t('duel.turn', { name: names[s.turn] })}</Text>
        <Text style={styles.turnSub}>{t('draft.pick', { n: me.round + 1 })} · {money(capRoom(me.roster))}</Text>
      </View>
      <Card style={{ gap: S.sm }}>
        <Label>{t('draft.landed')}</Label>
        <Text style={styles.spin}>{s.spin?.label}</Text>
        {opts.map((o) => (
          <PlayerCard
            key={o.player.id}
            player={o.player}
            testID={o.affordable ? 'duel-option' : undefined}
            disabled={!o.affordable}
            selected={chosen === o.player.id}
            note={!o.affordable ? t('draft.overCap') : undefined}
            onPress={() => (o.slots.length === 1 ? place(o.player.id, o.slots[0]) : setChosen(o.player.id))}
          />
        ))}
        {usable.length === 0 && (
          <Button label={t('draft.nothingFits')} variant="ghost" onPress={() => { d.fallback(); feel('pickChime'); }} testID="duel-fallback" />
        )}
      </Card>
      {chosenOpt && <Text style={[styles.choose, { color }]}>{t('draft.chooseSlot')}</Text>}
      <RosterBoard
        roster={me.roster}
        highlight={chosenOpt?.slots}
        onSlot={chosenOpt ? (slot) => chosenOpt.slots.includes(slot) && place(chosenOpt.player.id, slot) : undefined}
      />
    </Screen>
  );
}

function Side({ name, wins, color }: { name: string; wins: number; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[styles.wins, { color }]}>{wins}</Text>
      <Text style={styles.side} numberOfLines={1}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { height: 210, borderRadius: 26, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: S.md },
  half: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%' },
  courtLine: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 4, marginLeft: -2, backgroundColor: 'rgba(255,255,255,0.55)' },
  centerCircle: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  faceoff: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  faceRing: { borderRadius: 50, borderWidth: 4, borderColor: '#FFC53D', backgroundColor: '#FFFFFF' },
  vsBadge: { marginHorizontal: -6, zIndex: 2 },
  lead: { color: C.text, fontSize: 15, lineHeight: 22 },
  note: { color: C.muted, fontSize: 12, textAlign: 'center' },
  input: { color: C.text, fontSize: 18, fontWeight: '800', borderWidth: 2, borderRadius: R.md, padding: S.md, backgroundColor: C.bg, fontFamily: 'Nunito_800ExtraBold' },
  turn: { borderRadius: R.lg, padding: S.lg, alignItems: 'center', gap: 2 },
  turnText: { color: C.ink, fontSize: 22, ...F.display },
  turnSub: { color: C.ink, fontWeight: '800' },
  spin: { color: C.text, fontSize: 24, textAlign: 'center', ...F.display },
  choose: { fontWeight: '800', textAlign: 'center' },
  board: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.xl },
  wins: { fontSize: 56, ...F.display },
  side: { color: C.text, fontWeight: '800' },
  vs: { color: C.muted, fontWeight: '800' },
  game: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  winner: { color: C.gold, fontSize: 22, textAlign: 'center', ...F.display },
});
