import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { feel } from '../audio/feel';
import { POOLS } from '../data';
import { tradeSwap } from '../engine/season';
import { ALL_SLOTS } from '../engine/types';
import { useGame } from '../store/game';
import { Button, Card, Header, Label, Screen } from '../ui/components';
import { PlayerCard } from '../ui/PlayerCard';
import { Spinner } from '../ui/Spinner';
import { C, S } from '../ui/theme';

export default function Deadline() {
  const { t } = useTranslation();
  const g = useGame();
  const [spinKey, setSpinKey] = useState(0);
  const [landed, setLanded] = useState(true);
  const pool = POOLS[g.poolId];
  const decoys = useMemo(() => pool?.teams.map((x) => x.label) ?? [], [pool]);

  if (!g.season || !g.deadline || !pool) return <Redirect href="/season" />;
  const { season, deadline } = g;
  const user = season.teams[0];
  const taken = new Set(season.teams.flatMap((tm) => ALL_SLOTS.map((k) => tm.slots[k].id)));

  const done = (fn: () => void) => { fn(); router.replace('/season'); };
  const candidates = deadline.spin && landed && deadline.outId
    ? deadline.spin.players.filter((p) => !taken.has(p.id)).map((p) => {
        let ok = true;
        try { tradeSwap(season, deadline.outId!, p); } catch { ok = false; }
        return { p, ok };
      })
    : [];

  return (
    <Screen>
      <Header title={t('deadline.title')} />
      <Text style={styles.desc}>{t('deadline.desc')}</Text>

      {!deadline.spun && (
        <>
          <Label>{t('deadline.chooseOut')}</Label>
          <View style={{ gap: S.sm }}>
            {ALL_SLOTS.map((slot) => (
              <PlayerCard
                key={slot}
                player={user.slots[slot]}
                note={slot}
                selected={deadline.outId === user.slots[slot].id}
                onPress={() => g.chooseDeadlineOut(user.slots[slot].id)}
              />
            ))}
          </View>
          <Button
            label={`🎰  ${t('deadline.spin')}`}
            disabled={!deadline.outId}
            onPress={() => { setLanded(false); g.spinDeadline(); setSpinKey((k) => k + 1); }}
            testID="deadline-spin"
          />
        </>
      )}

      {deadline.spun && (
        <Card style={{ gap: S.md }}>
          <Spinner target={deadline.spin?.label ?? ''} decoys={decoys} spinKey={spinKey} onLanded={() => setLanded(true)} />
          {candidates.map(({ p, ok }) => (
            <PlayerCard key={p.id} player={p} disabled={!ok} note={!ok ? t('draft.overCap') : undefined}
              onPress={() => done(() => { g.signDeadline(p); feel('pickChime'); })} />
          ))}
        </Card>
      )}

      <Button label={t('deadline.skip')} variant="ghost" onPress={() => done(g.skipDeadline)} testID="deadline-skip" />
      <Text style={[styles.desc, { color: C.muted }]}>{season.records[0].w}-{season.records[0].l}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  desc: { color: C.text, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
