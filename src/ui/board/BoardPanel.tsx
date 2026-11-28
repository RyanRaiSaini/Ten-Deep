/** Board Confidence meter and the open board demands, shown on the season screen during a Management Crisis. */
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { cardOf } from '../../engine/board/cards';
import { progress, type BoardCtx } from '../../engine/board/rules';
import { MAX_CONFIDENCE, objectiveOf, type BoardEvent, type BoardState } from '../../engine/board/state';
import { SEASON_GAMES } from '../../engine/season';
import { Card, Label } from '../components';
import { Icon } from '../icons';
import { Text } from '../Text';
import { C, FONT, R, S } from '../theme';
import { cardTitle, cardVars } from './text';

export function ConfidenceMeter({ value, dark }: { value: number; dark?: boolean }) {
  const { t } = useTranslation();
  const color = value >= 7 ? C.neon : value >= 4 ? '#E3A008' : C.danger;
  return (
    <View style={styles.meterRow} testID="board-confidence" aria-label={`${t('board.confidence')} ${value}/${MAX_CONFIDENCE}`}>
      <Text style={[styles.meterLabel, dark && { color: '#FFFFFF' }]}>{t('board.confidenceShort')}</Text>
      <View style={styles.pips}>
        {Array.from({ length: MAX_CONFIDENCE }, (_, i) => (
          <View key={i} style={[styles.pip, { backgroundColor: i < value ? color : dark ? '#3A3050' : C.line }]} />
        ))}
      </View>
      <Text style={[styles.meterValue, { color: dark ? '#FFFFFF' : color }]}>{value}</Text>
    </View>
  );
}

/** One line per thing the last move settled: demand met or failed, hot or cold stretch. */
export function BoardNews({ events }: { events: BoardEvent[] }) {
  const { t } = useTranslation();
  if (!events.length) return null;
  return (
    <View style={{ gap: 4 }} testID="board-news">
      {events.map((e, i) => {
        const good = e.kind === 'done' || e.kind === 'hot' || e.kind === 'refund';
        return (
          <Text key={i} style={[styles.news, { color: good ? C.neon : C.danger }]}>
            {t(`board.events.${e.kind}`, { title: e.id ? cardTitle(t, e.id) : '', n: Math.abs(e.delta) })}
          </Text>
        );
      })}
    </View>
  );
}

export function BoardPanel({ board, ctx, scale, news, onOffice, onVeto }: {
  board: BoardState; ctx: BoardCtx; scale: number; news?: BoardEvent[]; onOffice: () => void; onVeto: (index: number) => void;
}) {
  const { t } = useTranslation();
  // The objective has its own big banner; this lists what an event left running (a slump to lift, say).
  const open = board.demands.map((d, i) => ({ d, i })).filter(({ d }) => d.status === 'active' && !d.objective);
  const canVeto = board.perks.includes('veto');
  return (
    <Card style={{ gap: S.sm }} testID="board-panel">
      <ConfidenceMeter value={board.confidence} />
      <BoardNews events={news ?? []} />
      {open.length > 0 && <Label>{t('board.demands')}</Label>}
      {open.map(({ d, i }) => {
        const pr = progress(d, ctx);
        const offer = { name: d.name ?? '', city: d.city ?? '', ...(d.amount ? { amount: d.amount } : {}) };
        return (
          <View key={`${d.id}-${d.from}`} style={styles.demand} testID="board-demand">
            <Icon name="clipboard" size={22} />
            <View style={{ flex: 1 }}>
              <Text style={styles.dTitle}>{cardTitle(t, d.id)}</Text>
              <Text style={styles.dRule} numberOfLines={2}>{t(`board.c.${d.id === 'fans-demand' ? 'statement-signing' : d.id}.rule`, cardVars(d.id, offer, scale))}</Text>
              <Text style={styles.dDue}>
                {d.due >= SEASON_GAMES ? t('board.dueEnd') : t('board.dueRound', { n: d.due })}
                {pr ? `  ·  ${t('board.progress', pr)}` : ''}
                {d.penalty ? `  ·  −${d.penalty}` : ''}
              </Text>
            </View>
            {canVeto && cardOf(d.id)?.kind === 'demand' && (
              <Pressable onPress={() => onVeto(i)} style={styles.veto} testID="board-veto">
                <Text style={styles.vetoText}>{t('board.veto')}</Text>
              </Pressable>
            )}
          </View>
        );
      })}
      {board.perks.length > 0 && (
        <Text style={styles.muted}>{t('board.perksHeld')}: {board.perks.map((p) => cardTitle(t, p)).join(', ')}</Text>
      )}
      <Pressable onPress={onOffice} style={styles.office} testID="board-office">
        <Icon name="briefcase" size={26} />
        <View style={{ flex: 1 }}>
          <Text style={styles.officeTitle}>{t('board.office')}</Text>
          <Text style={styles.officeSub}>{t('board.respins', { n: board.respins })}</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    </Card>
  );
}

/**
 * The run's objective, big: what the board told you to do, the deadline, how far along you are, and whether it's
 * done. Shown on the season, Takeover and front office screens so it's never out of sight.
 */
export function ObjectiveBanner({ board, ctx, scale, takeover }: { board: BoardState; ctx: BoardCtx; scale: number; takeover?: boolean }) {
  const { t } = useTranslation();
  const d = objectiveOf(board);
  if (!d) return null;
  const pr = d.status === 'active' ? progress(d, ctx) : null;
  const offer = { name: d.name ?? '', city: d.city ?? '', ...(d.amount ? { amount: d.amount } : {}) };
  const tone = d.status === 'done' ? C.neon : d.status === 'failed' ? C.danger : C.hardwood;
  const due = takeover && d.due === 0 ? t('board.due.tipoff') : d.due >= SEASON_GAMES ? t('board.dueEnd') : t('board.dueRound', { n: d.due });
  return (
    <View style={[styles.obj, { borderColor: tone }]} testID="objective">
      <View style={styles.objHead}>
        <Icon name="clipboard" size={30} />
        <Text style={[styles.objKicker, { color: tone }]}>{t('board.objective')}</Text>
        <Text style={[styles.objStatus, { backgroundColor: tone }]} testID="objective-status">
          {d.status === 'active' ? (pr ? t('board.progress', pr) : t('board.status.active')) : t(`board.status.${d.status}`)}
        </Text>
      </View>
      <Text style={styles.objTitle}>{cardTitle(t, d.id)}</Text>
      <Text style={styles.objRule}>{t(`board.c.${d.id}.rule`, cardVars(d.id, offer, scale))}</Text>
      {d.status === 'active' && <Text style={styles.objDue}>{due} · {t('board.fail', { n: d.penalty })}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  obj: { gap: 6, padding: S.lg, borderRadius: R.lg, borderWidth: 4, borderBottomWidth: 8, backgroundColor: '#FFFDF7' },
  objHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  objKicker: { flex: 1, fontWeight: '900', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' },
  objStatus: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, paddingHorizontal: 12, paddingVertical: 4, borderRadius: R.pill, overflow: 'hidden' },
  objTitle: { fontFamily: FONT.display, fontSize: 30, color: C.text, lineHeight: 34 },
  objRule: { color: C.text, fontWeight: '800', fontSize: 18, lineHeight: 24 },
  objDue: { color: C.muted, fontWeight: '800', fontSize: 13 },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  meterLabel: { fontWeight: '900', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: C.muted },
  pips: { flex: 1, flexDirection: 'row', gap: 3 },
  pip: { flex: 1, height: 12, borderRadius: 4 },
  meterValue: { fontWeight: '900', fontSize: 18, minWidth: 22, textAlign: 'right' },
  news: { fontWeight: '800', fontSize: 13 },
  muted: { color: C.muted, fontSize: 13, fontWeight: '700' },
  demand: { flexDirection: 'row', alignItems: 'center', gap: S.sm, padding: S.sm, borderRadius: R.md, backgroundColor: C.surface2 },
  dTitle: { fontWeight: '900', color: C.text },
  dRule: { color: C.text, fontSize: 13 },
  dDue: { color: C.muted, fontSize: 12, fontWeight: '800', marginTop: 2 },
  veto: { backgroundColor: C.blue, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 6 },
  vetoText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  office: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.md, backgroundColor: '#FFF1D6', borderWidth: 2, borderColor: '#FFC53D' },
  officeTitle: { fontWeight: '900', color: C.text, fontSize: 16 },
  officeSub: { color: C.muted, fontWeight: '700', fontSize: 12 },
  chev: { fontSize: 28, fontWeight: '900', color: C.text },
});
