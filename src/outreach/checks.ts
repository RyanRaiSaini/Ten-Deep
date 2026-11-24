/**
 * Checks run on a draft before it's saved or marked ready. They flag problems for a person to fix;
 * they never rewrite the message.
 */
import { UNSUPPORTED } from './facts';
import { CLOSED, GAME_URL, type Contact, type Draft, type Message } from './types';

export type Level = 'error' | 'warn' | 'ok';
export interface Check { id: string; level: Level; message: string }

export interface CheckInput {
  draft: Pick<Draft, 'kind' | 'subject' | 'text'>;
  contact: Contact;
  /** Names of every other contact (to catch a message addressed to the wrong person). */
  otherNames: string[];
  /** The conversation with this contact, oldest first. */
  thread: Message[];
  /** Link codes that are valid for this contact (campaign + contact codes). */
  validCodes: string[];
  /** YYYY-MM-DD. */
  today: string;
  /** Result of the live URL check, if it ran: the HTTP status per URL. */
  urlStatus?: Record<string, number>;
}

const FAMILIARITY = [
  /\bi(?:'ve| have)? (?:been )?(?:watch(?:ed|ing)?|seen|listen(?:ed|ing)? to|read(?:ing)?|follow(?:ed|ing)?)\b(?! (?:the )?(?:game|ten deep))/i,
  /\b(?:big|huge|longtime|long-time) (?:fan|viewer|listener|reader)\b/i,
  /\bi (?:love|loved|really like|enjoy|enjoyed) (?:your|the) (?:content|videos?|channel|show|pod(?:cast)?|streams?|work|writing|newsletter)\b/i,
  /\bfan of (?:your|the) (?:content|channel|show|pod(?:cast)?|work)\b/i,
];

const CORPORATE = [
  /\bi hope (?:this|my) (?:email|message|note) finds you well\b/i, /\breach(?:ing)? out\b/i, /\bcircle back\b/i, /\btouch base\b/i,
  /\bsynerg/i, /\bleverag/i, /\bgame[- ]changer\b/i, /\brevolutionar/i, /\bcutting[- ]edge\b/i, /\bseamless/i,
  /\bexcited to (?:announce|share)\b/i, /\bwould love to (?:connect|collaborate|partner)\b/i, /\bvalue proposition\b/i,
];

const PLACEHOLDER = /\{\{[^}]*\}\}|\[(?:name|first name|channel|company|link|date|insert[^\]]*)\]|<(?:name|first name|channel)>|\b(?:TODO|TBD|XXX|lorem ipsum)\b/i;

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const EMOJI = /\p{Extended_Pictographic}/u;

export const words = (s: string) => s.replace(/https?:\/\/\S+/g, ' ').match(/[A-Za-z0-9']+/g) ?? [];

/** Sentences that ask the recipient something (questions or polite requests). */
export function asks(text: string): string[] {
  const sentences = text.replace(/https?:\/\/\S+/g, 'LINK').split(/(?<=[.?!])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const req = /\b(?:would you|could you|can you|will you|let me know|happy to hear|give it a (?:try|go|shot)|try it|check (?:it|this|my \w+) out|check out|take a look|have a look|feel free to|if you(?:'re| are)? (?:up for|open to|interested|get a chance|have a (?:minute|few minutes)))\b/i;
  return sentences.filter((s) => s.endsWith('?') || req.test(s));
}

/** Explicit calendar dates in the text that are before `today`. */
export function staleDates(text: string, today: string): string[] {
  const out: string[] = [];
  const now = new Date(`${today}T12:00:00Z`);
  const year = now.getUTCFullYear();
  const md = new RegExp(`\\b(${MONTHS.join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`, 'gi');
  for (const m of text.matchAll(md)) {
    const y = m[3] ? Number(m[3]) : year;
    const d = new Date(Date.UTC(y, MONTHS.indexOf(m[1].toLowerCase()), Number(m[2]), 12));
    if (d < now && (m[3] || now.getTime() - d.getTime() > 3 * 86400000)) out.push(m[0]);
  }
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) if (m[0] < today) out.push(m[0]);
  for (const m of text.matchAll(/\b(20\d{2})\b/g)) if (Number(m[1]) < year && !/20\d{2}-\d{2}/.test(text.slice(m.index!, m.index! + 8))) out.push(m[1]);
  return [...new Set(out)];
}

/** The last incoming message that has no outgoing message after it, if any. */
export function unansweredInbound(thread: Message[]): Message | null {
  const sorted = [...thread].sort((a, b) => a.at.localeCompare(b.at));
  const last = sorted[sorted.length - 1];
  return last && last.direction === 'in' ? last : null;
}

const STOP = new Set('the a an and or but to of in on for with is are was be it this that you your i me my we our do does did can could would will just about what how when where why who which there their they them have has had if so as at by from not no yes up out get got any some more'.split(' '));
const keyWords = (s: string) => words(s.toLowerCase()).filter((w) => w.length > 2 && !STOP.has(w));

/** Questions in `msg` that the draft doesn't seem to address (no shared key words). */
export function openQuestions(msg: string, draft: string): string[] {
  const qs = msg.split(/(?<=[.?!])\s+|\n+/).map((s) => s.trim()).filter((s) => s.endsWith('?'));
  const d = new Set(keyWords(draft));
  return qs.filter((q) => {
    const k = keyWords(q);
    if (!k.length) return false;
    const hit = k.filter((w) => d.has(w) || d.has(w.replace(/s$/, ''))).length;
    return hit / k.length < 0.34;
  });
}

export function linksIn(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s)>\]]+/g)].map((m) => m[0].replace(/[.,;:!?]+$/, ''));
}

export function checkDraft(i: CheckInput): Check[] {
  const out: Check[] = [];
  const { draft, contact } = i;
  const text = draft.text;
  const add = (id: string, level: Level, message: string) => out.push({ id, level, message });

  if (CLOSED.includes(contact.status)) add('closed', 'error', `${contact.name} is marked "${contact.status}". Don't send anything.`);
  if (!text.trim()) { add('empty', 'error', 'The message is empty.'); return out; }

  // Recipient
  const first = contact.name.trim().split(/\s+/)[0] ?? '';
  if (!contact.name.trim()) add('recipient', 'error', 'The contact has no name.');
  else if (first && !new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) add('recipient', 'warn', `The message doesn't use ${first}'s name. Check it's addressed to the right person.`);
  const wrong = i.otherNames.filter((n) => n.trim() && n.trim() !== contact.name.trim() && new RegExp(`\\b${n.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
  if (wrong.length) add('wrong-name', 'error', `It mentions another contact: ${wrong.join(', ')}.`);
  if (draft.kind !== 'reply' && !contact.email) add('no-email', 'warn', 'No verified email for this contact. Send it where they publicly accept messages, or find a published business email first.');

  // Game link
  const links = linksIn(text);
  const game = links.filter((l) => l.startsWith(GAME_URL));
  if (draft.kind === 'first' && !game.length) add('link', 'error', `Include the game link (${GAME_URL}).`);
  const lookalike = links.filter((l) => /ten-?deep/i.test(l) && !l.startsWith(GAME_URL));
  if (lookalike.length) add('link-host', 'error', `This link isn't the game's address: ${lookalike.join(', ')}.`);
  for (const l of game) {
    let code: string | null = null;
    try { code = new URL(l).searchParams.get('c'); } catch { add('link-bad', 'error', `Broken link: ${l}`); continue; }
    if (code && !i.validCodes.includes(code)) add('link-code', 'error', `The link's campaign code "${code}" doesn't belong to this contact's campaigns.`);
    const st = i.urlStatus?.[l];
    if (st === undefined) add('link-live', 'warn', `Link not checked yet: ${l}`);
    else if (st >= 400 || st === 0) add('link-live', 'error', `The link returned ${st || 'no response'}: ${l}`);
  }

  // Claims
  for (const u of UNSUPPORTED) if (u.pattern.test(text)) add(`claim-${u.id}`, 'error', `Unsupported claim: ${u.why}`);

  // Familiarity
  const fam = FAMILIARITY.find((r) => r.test(text));
  if (fam) {
    if (contact.familiarity.trim()) add('familiarity', 'warn', `It claims familiarity. Make sure it matches what's documented: "${contact.familiarity.trim()}".`);
    else add('familiarity', 'error', `It claims a personal connection ("${text.match(fam)![0]}") that isn't documented for ${contact.name || 'this contact'}.`);
  }

  // One clear request
  const a = asks(text);
  if (draft.kind === 'first' && a.length === 0) add('ask', 'warn', 'There is no clear request (for example, try it and say what you think).');
  if (a.length > 2) add('ask', 'warn', `It asks for ${a.length} things. Keep it to one clear request.`);
  if (/\b(you (have|need) to|you must|please (stream|post|share|cover))\b/i.test(text)) add('obligation', 'warn', 'Streaming or sharing should read as optional, not an obligation.');

  // Their unanswered question
  const pending = unansweredInbound(i.thread);
  if (draft.kind !== 'first' && pending) {
    const qs = openQuestions(pending.body, text);
    if (qs.length) add('their-question', 'error', `Their question may be unanswered: "${qs[0]}"`);
    if (/\b(?:over|by|via) email\b|\bemail (?:is|works) (?:better|best|easier)\b|\brather (?:not )?(?:hop on|do) a call\b/i.test(pending.body) && /\b(call|zoom|meet|calendly|hop on)\b/i.test(text)) {
      add('prefers-email', 'error', 'They asked to keep it to email, but the draft suggests a call.');
    }
  }

  // Scheduling and availability
  if (/calendly\.com/i.test(text) && !(pending && /\b(call|chat|meet|time|schedule|availability|zoom)\b/i.test(pending.body))) {
    add('calendly', 'warn', 'A booking link is only for conversations that need scheduling. Remove it unless they asked about a time.');
  }
  if (/\bi(?:'m| am) (?:free|available)\b/i.test(text)) add('availability', 'warn', 'It claims you are free at a time. Check your calendar first.');

  // Placeholders and stale dates
  const ph = text.match(PLACEHOLDER) ?? draft.subject.match(PLACEHOLDER);
  if (ph) add('placeholder', 'error', `Placeholder text left in: "${ph[0]}"`);
  const stale = staleDates(`${draft.subject}\n${text}`, i.today);
  if (stale.length) add('stale-date', 'error', `Date in the past: ${stale.join(', ')}`);

  // Style
  if (EMOJI.test(text)) add('emoji', 'error', 'Remove the emoji.');
  if (/—/.test(text)) add('em-dash', 'error', 'Remove the em dash (use a comma, period or parentheses).');
  const corp = CORPORATE.filter((r) => r.test(text)).map((r) => text.match(r)![0]);
  if (corp.length) add('corporate', 'warn', `Sounds corporate: ${corp.map((c) => `"${c}"`).join(', ')}`);
  const n = words(text).length;
  if (draft.kind === 'first' && (n < 60 || n > 120)) add('length', 'warn', `${n} words. First messages usually work best at 60 to 120.`);
  if (draft.kind !== 'first' && n > 160) add('length', 'warn', `${n} words. Replies can usually be shorter.`);
  if ((text.match(/!/g) ?? []).length > 1) add('exclaim', 'warn', 'Several exclamation marks can read as forced enthusiasm.');
  if (draft.kind !== 'reply' && !draft.subject.trim()) add('subject', 'warn', 'No subject line.');

  if (!out.some((c) => c.level !== 'ok')) add('all', 'ok', 'All checks pass.');
  return out;
}

export const blocking = (cs: Check[]) => cs.some((c) => c.level === 'error');
