/**
 * Outreach reporting. Email outcomes come only from what was logged here (messages you marked sent,
 * replies you pasted in). Website outcomes come only from recorded campaign-link events (unique visitors
 * per event). The two are reported separately; nothing is estimated, and opens are never claimed.
 */
import { CLOSED, EVENT_KINDS, type Db, type EventKind } from './types';

/** "8 completed drafts / 20 campaign visits = 40%". A zero denominator reads "unknown", never 0%. */
export function rate(n: number, d: number, nLabel: string, dLabel: string): string {
  const pct = d > 0 ? `${Math.round((n / d) * 100)}%` : 'unknown';
  return `${n} ${nLabel} / ${d} ${dLabel} = ${pct}`;
}

export type Counts = Partial<Record<EventKind, number>>;

export interface EmailMetrics {
  contacts: number;
  draftsReady: number;
  messaged: number;
  messagesSent: number;
  replied: number;
  interested: number;
  tried: number;
  sharedContent: number;
  declined: number;
}

/** Email/DM outcomes for a campaign (or all contacts), from logged messages and statuses. */
export function emailMetrics(db: Db, campaignId?: string): EmailMetrics {
  const contacts = db.contacts.filter((c) => !campaignId || c.campaignIds.includes(campaignId));
  const ids = new Set(contacts.map((c) => c.id));
  const msgs = db.messages.filter((m) => ids.has(m.contactId));
  const outBy = new Map<string, string>();
  for (const m of msgs) if (m.direction === 'out' && (!outBy.has(m.contactId) || m.at < outBy.get(m.contactId)!)) outBy.set(m.contactId, m.at);
  const replied = new Set(msgs.filter((m) => m.direction === 'in' && outBy.has(m.contactId) && m.at > outBy.get(m.contactId)!).map((m) => m.contactId));
  const st = (s: string[]) => contacts.filter((c) => s.includes(c.status)).length;
  return {
    contacts: contacts.length,
    draftsReady: db.drafts.filter((d) => ids.has(d.contactId) && d.state === 'draft' && (!campaignId || d.campaignId === campaignId)).length,
    messaged: outBy.size,
    messagesSent: msgs.filter((m) => m.direction === 'out').length,
    replied: replied.size,
    interested: st(['Interested', 'Tried the game', 'Shared content']),
    tried: st(['Tried the game', 'Shared content']),
    sharedContent: st(['Shared content']),
    declined: st([...CLOSED]),
  };
}

/** Sum event counts over a set of link codes. */
export function sumCounts(byCode: Record<string, Counts>, codes: string[]): Counts {
  const out: Counts = {};
  for (const c of codes) for (const k of EVENT_KINDS) if (byCode[c]?.[k]) out[k] = (out[k] ?? 0) + byCode[c]![k]!;
  return out;
}

/** The website funnel as readable rates with denominators. */
export function funnel(c: Counts): { label: string; text: string }[] {
  const n = (k: EventKind) => c[k] ?? 0;
  return [
    { label: 'Started a draft', text: rate(n('draft_started'), n('visit'), 'drafts started', 'campaign visitors') },
    { label: 'Finished the draft', text: rate(n('draft_completed'), n('draft_started'), 'completed drafts', 'drafts started') },
    { label: 'Simulated a season', text: rate(n('season_simulated'), n('draft_completed'), 'seasons simulated', 'completed drafts') },
    { label: 'Shared a result', text: rate(n('shared'), n('season_simulated'), 'shared results', 'seasons simulated') },
    { label: 'Came back another day', text: rate(n('return'), n('visit'), 'returning visitors', 'campaign visitors') },
  ];
}

/** All link codes that belong to a campaign: its own code plus each contact's code for it. */
export function campaignCodes(db: Db, campaignId: string): string[] {
  const c = db.campaigns.find((x) => x.id === campaignId);
  if (!c) return [];
  return [c.code, ...db.contacts.map((x) => x.links[campaignId]).filter((x): x is string => !!x)];
}

/** Every valid link code (for the tracking endpoint). */
export function allCodes(db: Db): string[] {
  return [...db.campaigns.map((c) => c.code), ...db.contacts.flatMap((c) => Object.values(c.links))].filter(Boolean);
}
