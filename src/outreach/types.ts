/**
 * Creator outreach workspace: the data model. Everything here is private (stored server-side behind the
 * admin key, never bundled with the game). Research fields hold what a person verified, with sources;
 * nothing in this module invents or fills in facts.
 */

export const STATUSES = [
  'Researching', 'Ready to draft', 'Draft ready', 'Contacted', 'Replied', 'Interested',
  'Tried the game', 'Shared content', 'Follow up later', 'Declined', 'Do not contact',
] as const;
export type Status = (typeof STATUSES)[number];

/** Statuses that end outreach: no drafts, no follow-up suggestions. */
export const CLOSED: readonly Status[] = ['Declined', 'Do not contact'];

export const CATEGORIES = [
  'Basketball gaming', 'YouTube / streaming', 'Analytics / writing', 'Podcast / analyst / journalist', 'Smaller creator',
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Where a fact came from and when someone checked it. */
export interface Source { url: string; checkedOn: string }

export interface Contact {
  id: string;
  name: string;
  /** Channel, show or publication. */
  channel: string;
  platform: string;
  profileUrl: string;
  /** Public business email. Empty unless it was found published at `emailSource`. Never guessed. */
  email: string;
  emailSource: Source;
  /** Where this contact was found, and when it was last checked. */
  source: Source;
  category: Category | '';
  /** One relevant piece of their content, described plainly, and its URL. */
  contentExample: string;
  contentSource: string;
  /** Why Ten Deep could fit their content. */
  fit: string;
  /** A challenge or conversation angle for them. */
  angle: string;
  /**
   * A real, documented connection ("I've watched his mock-draft streams since 2024"). Empty means none:
   * drafts must not claim familiarity.
   */
  familiarity: string;
  status: Status;
  notes: string;
  lastContact: string;
  nextAction: string;
  /** A private reminder date (YYYY-MM-DD). Reminders never send anything. */
  nextActionOn: string;
  campaignIds: string[];
  /** Per-campaign link codes for this contact (random, no personal data). */
  links: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface DraftVersion { at: string; subject: string; text: string; note: string }

export type DraftKind = 'first' | 'reply' | 'follow-up';

export interface Draft {
  id: string;
  contactId: string;
  campaignId: string;
  kind: DraftKind;
  subject: string;
  text: string;
  /** The research behind the message, shown beside it. */
  basis: { fact: string; relevance: string; ask: string };
  versions: DraftVersion[];
  /** 'sent' only when the owner marks it after sending it personally. Nothing here sends mail. */
  state: 'draft' | 'sent';
  sentAt: string;
  /** For replies: the incoming message this answers. */
  replyTo: string;
  createdAt: string;
  updatedAt: string;
}

export type Intent =
  | 'try' | 'feedback' | 'info' | 'content' | 'schedule' | 'decline' | 'stop' | 'prefers-email' | 'compliment' | 'timing';

export interface Message {
  id: string;
  contactId: string;
  direction: 'in' | 'out';
  /** ISO date-time the message was sent or received. */
  at: string;
  subject: string;
  body: string;
  channel: 'email' | 'dm' | 'other';
}

export interface Campaign {
  id: string;
  name: string;
  purpose: string;
  audience: string;
  /** The specific invitation, in a sentence. */
  invitation: string;
  /** Path on the game site the link opens, e.g. "/" or "/c?s=...". */
  landing: string;
  success: string;
  /** Generic campaign link code. */
  code: string;
  status: 'planning' | 'active' | 'paused' | 'done';
  createdAt: string;
}

export type EvidenceKind = 'feedback' | 'bug' | 'observation' | 'metric';

/** Something that actually happened: a message, a playtest note, a recorded number. */
export interface Evidence {
  id: string;
  kind: EvidenceKind;
  text: string;
  /** Where it came from (a contact, a playtest, a URL). */
  source: string;
  contactId: string;
  at: string;
}

export const IDEA_STATUSES = ['Candidate', 'Next', 'Building', 'Shipped', 'Parked'] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export interface Idea {
  id: string;
  title: string;
  problem: string;
  who: string;
  /** Linked Evidence ids. */
  evidence: string[];
  /** Assumptions, kept apart from evidence. */
  assumptions: string;
  change: string;
  benefit: string;
  effort: 'S' | 'M' | 'L';
  dependencies: string;
  success: string;
  status: IdeaStatus;
  nextAction: string;
  /** 1-5 scores used for ranking (owner-set). */
  value: number;
  shareability: number;
  createdAt: string;
}

export interface Settings {
  /** How you introduce yourself in creator outreach (kept separate from any other campaign). */
  ownerIntro: string;
  /** Days without a reply before a follow-up is suggested. */
  followUpDays: number;
}

export const DEFAULT_SETTINGS: Settings = {
  ownerIntro: "I'm Ryan, a math student at the University of Waterloo, and I built Ten Deep.",
  followUpDays: 7,
};

export interface Db {
  rev: number;
  updatedAt: string;
  settings: Settings;
  contacts: Contact[];
  campaigns: Campaign[];
  drafts: Draft[];
  messages: Message[];
  ideas: Idea[];
  evidence: Evidence[];
}

export const emptyDb = (): Db => ({ rev: 0, updatedAt: '', settings: { ...DEFAULT_SETTINGS }, contacts: [], campaigns: [], drafts: [], messages: [], ideas: [], evidence: [] });

/** Anonymous, per-visitor website events recorded for campaign links. */
export const EVENT_KINDS = ['visit', 'return', 'draft_started', 'draft_completed', 'season_simulated', 'shared'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** Campaign and contact link codes: lowercase letters, digits and dashes. */
export const LINK_CODE = /^[a-z0-9][a-z0-9-]{2,40}$/;

export const GAME_URL = 'https://ten-deep.vercel.app';

export const today = (d = new Date()) => d.toISOString().slice(0, 10);

export function newId(prefix = ''): string {
  const r = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10);
  return prefix + r;
}

/** A random link code (no personal data). */
export function randomCode(len = 6): string {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(len)), (b) => a[b % a.length]).join('');
}

export const blankContact = (over: Partial<Contact> = {}): Contact => {
  const now = new Date().toISOString();
  return {
    id: newId('c_'), name: '', channel: '', platform: '', profileUrl: '', email: '', emailSource: { url: '', checkedOn: '' },
    source: { url: '', checkedOn: '' }, category: '', contentExample: '', contentSource: '', fit: '', angle: '', familiarity: '',
    status: 'Researching', notes: '', lastContact: '', nextAction: '', nextActionOn: '', campaignIds: [], links: {},
    createdAt: now, updatedAt: now, ...over,
  };
};
