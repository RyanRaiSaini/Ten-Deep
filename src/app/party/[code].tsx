import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { feel } from '../../audio/feel';
import { CONFIG } from '../../config';
import { affordableSlots, fallbackPick, options } from '../../engine/draft';
import { salaryFor } from '../../engine/cap';
import {
  PARTY_COLORS, PARTY_ROUNDS, PICK_MS, PLAYOFF_REVEAL_MS, SEASON_REVEAL_MS, partySeason, placings, resolve, seatState, seats,
  type PartyMember, type PartySeason, type Resolved,
} from '../../engine/party';
import { champion } from '../../engine/playoffs';
import type { Pool, SlotId } from '../../engine/types';
import { joinRoom, leaveRoom, startRoom, submitPick, useRoom, useRoomPool, useServerNow, type Room } from '../../net/party';
import { useFriends } from '../../store/friends';
import { Avatar } from '../../ui/Avatar';
import { BackButton, Button, Card, Display, Header, Screen } from '../../ui/components';
import { Confetti } from '../../ui/fx';
import { Icon } from '../../ui/icons';
import { goBack } from '../../ui/nav';
import { PlayerCard } from '../../ui/PlayerCard';
import { RosterBoard } from '../../ui/RosterBoard';
import { shareText } from '../../ui/share';
import { teamGradient } from '../../ui/teamColors';
import { Text } from '../../ui/Text';
import { C, FONT, R, S, alpha, money } from '../../ui/theme';

/** One Live Party room: lobby → live draft → the shared season, revealed in sync → final standings. */
export default function PartyRoom() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { t } = useTranslation();
  const myPin = useFriends((s) => s.pin);
  const [stopped, setStopped] = useState(false);
  const [fast, setFast] = useState(true);
  const { room, error, offset, refresh } = useRoom(code, fast, stopped);
  const pool = useRoomPool(room?.meta);
  const now = useServerNow(offset, 4);
  const tick = Math.floor(now / 500);
  const resolved = useMemo(() => (room && pool ? resolve(room.meta, room.members, pool, now) : null),
    // Re-derive twice a second and whenever the room changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room, pool, tick]);
  const members = useMemo(() => (room ? seats(room.members) : []), [room]);
  const mySeat = members.findIndex((m) => m.pin === myPin);

  // Join automatically when opening a lobby link.
  // Retried every few seconds while we're missing from the list (two joins at the same instant can collide).
  const joinedAt = useRef(0);
  useEffect(() => {
    if (!room || !code || room.meta.started || mySeat >= 0 || Date.now() - joinedAt.current < 4000) return;
    joinedAt.current = Date.now();
    void joinRoom(code).then(refresh);
  }, [room, code, mySeat, refresh]);

  // Once the draft is over nothing on the server changes: stop polling.
  useEffect(() => {
    if (resolved?.phase === 'season') { setStopped(true); setFast(false); }
  }, [resolved?.phase]);

  if (!room || !resolved || !pool) {
    return (
      <Screen>
        <Header title={t('party.title')} left={<BackButton onPress={goBack} />} />
        <Text style={styles.center}>{error ? t(`party.err.${error}`, { defaultValue: t('party.err.unavailable') }) : t('party.loading')}</Text>
      </Screen>
    );
  }
  if (resolved.phase === 'lobby') return <Lobby room={room} members={members} myPin={myPin} code={code!} refresh={refresh} />;
  if (resolved.phase === 'draft') return <Draft room={room} members={members} mySeat={mySeat} pool={pool} state={resolved} now={now} code={code!} refresh={refresh} />;
  return <SeasonView room={room} members={members} mySeat={mySeat} pool={pool} state={resolved} now={now} />;
}

// --- Lobby -----------------------------------------------------------------------------------------

function Lobby({ room, members, myPin, code, refresh }: { room: Room; members: PartyMember[]; myPin: string; code: string; refresh: () => void }) {
  const { t } = useTranslation();
  const host = room.meta.host === myPin;
  const [err, setErr] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const start = async () => {
    const r = await startRoom(code);
    if (!r.ok) setErr(t(`party.err.${r.error}`, { defaultValue: t('party.err.unavailable') }));
    else { feel('fanfare'); refresh(); }
  };
  return (
    <Screen tint="#1E9E5A">
      <Header title={t('party.title')} left={<BackButton onPress={goBack} />} />
      <LinearGradient colors={['#2BC07A', '#0B6B3A']} style={styles.codeCard}>
        <Text style={styles.codeLabel}>{t('party.roomCode')}</Text>
        <Display size={54} testID="room-code">{code.split('').join(' ')}</Display>
        <Button label={shared ? t('friends.shared') : t('party.invite')} variant="dark" icon={<Icon name="share" size={20} />}
          onPress={async () => { const r = await shareText(t('party.shareText', { code, link: `${CONFIG.webUrl}/party/${code}` })); if (r !== 'failed') setShared(true); }} testID="room-share" />
      </LinearGradient>
      <Text style={styles.section}>{t('party.players', { n: members.length })}</Text>
      <View style={{ gap: S.sm }}>
        {members.map((m, i) => (
          <View key={m.pin} style={[styles.member, { borderColor: PARTY_COLORS[i][0] }]}>
            <Avatar id={m.avatar} size={44} />
            <Text style={styles.memberName} numberOfLines={1}>{m.name}{m.pin === myPin ? ` · ${t('party.you')}` : ''}</Text>
            {m.pin === room.meta.host && <View style={styles.hostTag}><Icon name="crown" size={18} /><Text style={styles.hostText}>{t('party.host')}</Text></View>}
          </View>
        ))}
      </View>
      {err && <Text style={styles.error}>{err}</Text>}
      {host ? (
        <Button label={t('party.start')} icon={<Icon name="play" size={22} />} onPress={start} disabled={members.length < 2} testID="room-start" />
      ) : (
        <Text style={styles.center}>{t('party.waitingHost')}</Text>
      )}
      {host && members.length < 2 && <Text style={styles.center}>{t('party.err.need-two')}</Text>}
      <Button label={t('party.leave')} variant="ghost" onPress={async () => { await leaveRoom(code); router.back(); }} />
    </Screen>
  );
}

// --- Draft -----------------------------------------------------------------------------------------

function Draft({ room, members, mySeat, pool, state, now, code, refresh }: {
  room: Room; members: PartyMember[]; mySeat: number; pool: Pool; state: Resolved; now: number; code: string; refresh: () => void;
}) {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const spinning = now < state.roundStart;
  const left = Math.max(0, Math.ceil((state.deadline - now) / 1000));
  const frac = Math.max(0, Math.min(1, (state.deadline - now) / PICK_MS));
  const playing = mySeat >= 0;
  const picked = playing && state.picked[mySeat];
  const st = playing ? seatState(pool, mySeat, state.rosters, state.taken, state.spin, room.meta.seed) : null;
  const opts = st && state.spin ? options(st, pool) : [];
  const waitingOn = state.picked.filter((x) => !x).length;
  // Nothing on this spin fits your cap: offer the cheapest fallback signing (the server accepts exactly this one).
  const fallback = st && state.spin && !opts.some((o) => o.affordable) ? (() => {
    try { const player = fallbackPick(st, pool); return { player, slot: affordableSlots(st, player, pool)[0] }; } catch { return null; }
  })() : null;

  useEffect(() => { setChosen(null); setNote(null); }, [state.round]);
  useEffect(() => { if (left > 0 && left <= 5 && !picked) feel('tick'); }, [left, picked]);

  const send = async (pid: string, slot: SlotId) => {
    if (sending) return;
    setSending(true);
    const r = await submitPick(code, state.round, pid, slot);
    setSending(false);
    setChosen(null);
    if (r.ok) { feel('pickChime'); refresh(); return; }
    if (__DEV__ || typeof document !== 'undefined') console.warn('party pick rejected:', r.error, pid);
    setNote(t(`party.err.${r.error === 'claimed' || r.error === 'not-in-spin' ? 'taken' : r.error}`, { defaultValue: t('party.err.unavailable') }));
    feel('buzzer');
    refresh();
  };

  const [c1, c2] = state.spin ? teamGradient(state.spin.colors) : ['#555', '#222'];
  return (
    <Screen>
      <Header title={t('party.round', { n: state.round + 1, total: PARTY_ROUNDS })} left={<BackButton onPress={goBack} />}
        right={<View style={[styles.clock, left <= 10 && { backgroundColor: C.danger }]}><Text style={styles.clockText} testID="pick-clock">{spinning ? '…' : left}</Text></View>} />
      <View style={styles.bar}><View style={[styles.barFill, { width: `${(spinning ? 1 : frac) * 100}%`, backgroundColor: left <= 10 ? C.danger : '#18C08A' }]} /></View>

      <View style={styles.seatRow}>
        {members.map((m, i) => (
          <View key={m.pin} style={[styles.seat, { borderColor: PARTY_COLORS[i][0] }]}>
            <Avatar id={m.avatar} size={36} />
            {state.picked[i] && <View style={styles.check}><Icon name="check" size={16} /></View>}
          </View>
        ))}
      </View>

      <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.spin}>
        <Text style={styles.spinLabel}>{spinning ? t('party.spinning') : state.spin?.season}</Text>
        <Display size={30}>{spinning ? '?' : state.spin?.name ?? ''}</Display>
      </LinearGradient>

      {!playing && <Text style={styles.center}>{t('party.watching')}</Text>}
      {note && <Text style={styles.error}>{note}</Text>}
      {picked ? (
        <Card style={{ alignItems: 'center', gap: 6 }}>
          <Icon name="check" size={40} />
          <Text style={styles.locked}>{waitingOn ? t('party.lockedIn', { n: waitingOn }) : t('party.allPicked')}</Text>
        </Card>
      ) : playing && !spinning ? (
        <View style={{ gap: S.sm }}>
          <Text style={styles.hint}>{t('party.autoNote')}</Text>
          {fallback && (
            <Button label={t('draft.signFallback', { name: fallback.player.name, salary: money(salaryFor(fallback.player.ovr)) })} variant="dark"
              disabled={sending} onPress={() => send(fallback.player.id, fallback.slot)} testID="party-fallback" />
          )}
          {opts.map((o) => {
            const gone = state.taken.has(o.player.id);
            return (
              <PlayerCard key={o.player.id} player={o.player} accent={c1} disabled={!o.affordable || gone || sending}
                selected={chosen === o.player.id} slots={o.slots} onSlot={(slot) => send(o.player.id, slot)}
                note={gone ? t('party.taken') : !o.affordable ? t('draft.overCap') : undefined} testID={o.affordable && !gone ? 'party-option' : undefined}
                onPress={() => (o.slots.length === 1 ? send(o.player.id, o.slots[0]) : setChosen(o.player.id))} />
            );
          })}
        </View>
      ) : null}
      {playing && <RosterBoard roster={state.rosters[mySeat]} color={PARTY_COLORS[mySeat % PARTY_COLORS.length][0]} />}
    </Screen>
  );
}

// --- Season, playoffs, results -----------------------------------------------------------------------

function SeasonView({ room, members, mySeat, pool, state, now }: { room: Room; members: PartyMember[]; mySeat: number; pool: Pool; state: Resolved; now: number }) {
  const { t } = useTranslation();
  const [ps, setPs] = useState<PartySeason | null>(null);
  const [skip, setSkip] = useState(false);
  // The season is simulated once, the same on every device; give the screen a frame to paint first.
  useEffect(() => {
    const id = setTimeout(() => setPs(partySeason(room.meta, room.members, state.rosters, pool)), 60);
    return () => clearTimeout(id);
  }, [room, state.rosters, pool]);

  const elapsed = now - state.roundStart;
  const stage = skip || elapsed >= SEASON_REVEAL_MS + PLAYOFF_REVEAL_MS ? 'results' : elapsed >= SEASON_REVEAL_MS ? 'playoffs' : 'season';
  const final = useMemo(() => (ps ? placings(ps) : []), [ps]);

  // Settle head-to-head records with friends once the results are out.
  const settled = useRef(false);
  useEffect(() => {
    if (stage !== 'results' || !ps || settled.current || mySeat < 0) return;
    settled.current = true;
    const myPlace = final.findIndex((p) => p.team === mySeat);
    final.forEach((p, place) => {
      const m = members[p.team];
      if (!m || p.team === mySeat) return;
      useFriends.getState().settle(room.meta.seed, m.pin, myPlace < place ? 'w' : 'l', `#${myPlace + 1}-#${place + 1}`, 'party');
    });
    feel(final[0]?.team === mySeat ? 'fanfare' : 'crowd');
  }, [stage, ps, final, members, mySeat, room.meta.seed]);

  if (!ps) {
    return <Screen><Header title={t('party.season')} left={<BackButton onPress={goBack} />} /><Text style={styles.center}>{t('party.simulating')}</Text></Screen>;
  }

  const game = Math.max(0, Math.min(82, Math.floor((elapsed / SEASON_REVEAL_MS) * 82)));
  const wins = ps.wins[stage === 'season' ? game : 82];
  const rank = (team: number) => 1 + wins.filter((w, i) => w > wins[team] || (w === wins[team] && i < team)).length;
  const order = members.map((_, i) => i).sort((a, b) => wins[b] - wins[a]);
  const champ = final.find((p) => p.depth === 5);
  const champIdx = champion(ps.playoffs);
  const winner = final[0];

  return (
    <Screen overlay={stage === 'results' && winner?.team === mySeat ? <Confetti /> : undefined} tint="#1E9E5A">
      <Header title={stage === 'season' ? t('party.season') : stage === 'playoffs' ? t('party.playoffs') : t('party.results')} left={<BackButton onPress={goBack} />} />
      {stage === 'season' && (
        <>
          <Text style={styles.gameNo} testID="party-game">{t('party.game', { n: game })}</Text>
          <View style={styles.bar}><View style={[styles.barFill, { width: `${(game / 82) * 100}%`, backgroundColor: '#18C08A' }]} /></View>
        </>
      )}
      {stage !== 'results' ? (
        <View style={{ gap: S.sm }}>
          {order.map((team) => {
            const m = members[team];
            // Playoff rounds revealed so far (1–4); a team that lost in round d−1 shows as out once that round is shown.
            const shown = 1 + Math.floor(((elapsed - SEASON_REVEAL_MS) / PLAYOFF_REVEAL_MS) * 4);
            const d = final.find((p) => p.team === team)?.depth ?? 0;
            const status = stage !== 'playoffs' ? t('party.leagueRank', { n: rank(team) })
              : d === 0 ? t('party.missed') : d < 5 && shown >= d ? t('party.out', { round: t(`playoffs.round${d - 1}`) }) : t('party.alive');
            return (
              <View key={m.pin} style={[styles.raceRow, team === mySeat && styles.mine]}>
                <Avatar id={m.avatar} size={40} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.memberName} numberOfLines={1}>{m.name}</Text>
                  <View style={styles.raceTrack}><View style={[styles.raceFill, { width: `${(wins[team] / 82) * 100}%`, backgroundColor: PARTY_COLORS[team % 8][0] }]} /></View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.raceW}>{wins[team]}-{(stage === 'season' ? game : 82) - wins[team]}</Text>
                  <Text style={styles.raceRank}>{status}</Text>
                </View>
              </View>
            );
          })}
          <Text style={styles.section}>{t('party.table')}</Text>
          <View style={styles.table}>
            {wins.map((w, team) => ({ team, w })).sort((x, y) => y.w - x.w || x.team - y.team).slice(0, 10).map(({ team, w }, i) => {
              const ours = team < ps.seats;
              const g = stage === 'season' ? game : 82;
              return (
                <View key={team} style={[styles.tRow, ours && { backgroundColor: alpha(PARTY_COLORS[team % 8][0], 0.14) }]}>
                  <Text style={styles.tRank}>{i + 1}</Text>
                  <View style={[styles.tDot, { backgroundColor: ours ? PARTY_COLORS[team % 8][0] : ps.season.teams[team].colors[0] }]} />
                  <Text style={[styles.tName, ours && { fontWeight: '900', color: C.ink }]} numberOfLines={1}>{ours ? members[team].name : ps.season.teams[team].name}</Text>
                  <Text style={styles.tW}>{w}-{g - w}</Text>
                </View>
              );
            })}
          </View>
          <Button label={t('party.skip')} variant="ghost" onPress={() => setSkip(true)} testID="party-skip" />
        </View>
      ) : (
        <View style={{ gap: S.sm }} testID="party-results">
          {final.map((p, place) => {
            const m = members[p.team];
            return (
              <View key={m.pin} style={[styles.podium, place === 0 && styles.first, p.team === mySeat && styles.mine]}>
                <Text style={styles.place}>#{place + 1}</Text>
                <Avatar id={m.avatar} size={place === 0 ? 60 : 44} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, place === 0 && { fontSize: 20 }]} numberOfLines={1}>{m.name}</Text>
                  <Text style={styles.raceRank}>{p.w}-{p.l} · {p.depth === 5 ? t('party.champion') : p.depth === 0 ? t('party.missed') : t('party.out', { round: t(`playoffs.round${p.depth - 1}`) })}</Text>
                </View>
                {place === 0 && <Icon name="trophy" size={44} />}
              </View>
            );
          })}
          {!champ && champIdx !== null && <Text style={styles.center}>{t('party.championAI', { team: ps.season.teams[champIdx].name })}</Text>}
          <RosterBoard roster={state.rosters[Math.max(0, mySeat)]} color={PARTY_COLORS[Math.max(0, mySeat) % 8][0]} />
          <Button label={t('party.again')} variant="gold" icon={<Icon name="plus" size={22} />} onPress={() => router.replace('/party')} testID="party-again" />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { color: C.muted, fontWeight: '700', textAlign: 'center', paddingVertical: S.md },
  error: { color: C.danger, fontWeight: '800', textAlign: 'center' },
  section: { fontFamily: FONT.display, fontSize: 22, color: C.ink },
  codeCard: { borderRadius: 24, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, padding: S.lg, alignItems: 'center', gap: S.sm },
  codeLabel: { color: '#E3FFF0', fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', fontSize: 12 },
  member: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.sm, borderRadius: R.lg, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderBottomWidth: 5 },
  memberName: { flex: 1, fontWeight: '900', fontSize: 16, color: C.ink },
  hostTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF1D6', borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 3 },
  hostText: { fontWeight: '900', color: '#9A6200', fontSize: 12 },
  clock: { minWidth: 48, height: 40, borderRadius: 20, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  clockText: { fontFamily: FONT.display, fontSize: 20, color: '#FFFFFF' },
  bar: { height: 10, borderRadius: 5, backgroundColor: C.line, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  seatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  seat: { borderWidth: 3, borderRadius: 24, backgroundColor: C.surface2 },
  check: { position: 'absolute', right: -6, bottom: -6, backgroundColor: '#FFFFFF', borderRadius: 12 },
  spin: { borderRadius: 22, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, paddingVertical: S.lg, alignItems: 'center', gap: 2 },
  spinLabel: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 2, opacity: 0.9 },
  hint: { color: C.muted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  locked: { fontWeight: '900', color: C.ink, fontSize: 16, textAlign: 'center' },
  gameNo: { fontFamily: FONT.display, fontSize: 22, color: C.ink, textAlign: 'center' },
  raceRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, padding: S.sm, borderRadius: R.lg, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: C.line },
  mine: { borderColor: C.ink, borderWidth: 2.5, backgroundColor: '#FFF7E8' },
  raceTrack: { height: 10, borderRadius: 5, backgroundColor: C.surface2, overflow: 'hidden' },
  raceFill: { height: 10, borderRadius: 5 },
  raceW: { fontFamily: FONT.display, fontSize: 20, color: C.ink },
  raceRank: { color: C.muted, fontWeight: '800', fontSize: 12 },
  podium: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: C.line, borderBottomWidth: 5 },
  first: { borderColor: '#E09A00', backgroundColor: '#FFF4D6' },
  table: { backgroundColor: '#FFFFFF', borderRadius: R.lg, borderWidth: 2, borderColor: C.line, padding: 6, gap: 2 },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 10 },
  tRank: { width: 22, fontFamily: FONT.display, fontSize: 15, color: C.muted, textAlign: 'center' },
  tDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: C.ink },
  tName: { flex: 1, color: C.text, fontWeight: '700', fontSize: 14 },
  tW: { fontFamily: FONT.display, fontSize: 15, color: C.ink },
  place: { fontFamily: FONT.display, fontSize: 24, color: C.ink, width: 40 },
});
