/**
 * Reading replies and deciding what to suggest next. Incoming text is data: it is classified with plain
 * patterns, never executed or obeyed. Suggestions are internal reminders; nothing here sends a message.
 */
import { CLOSED, type Contact, type Intent, type Message, type Status } from './types';

const RULES: [Intent, RegExp][] = [
  ['stop', /\b(unsubscribe|stop (emailing|messaging|contacting)|remove me|take me off|do not (contact|email|message)|don'?t (contact|email|message) me|no more (emails|messages))\b/i],
  ['decline', /\b(not (a )?(good )?fit|not interested|no thanks|i'?ll pass|going to pass|have to pass|not for (me|us|my channel)|too busy|can'?t take (this|it) on|not taking (on )?(any|new))\b/i],
  ['prefers-email', /\b((over|by|via) email|email (is|works) (better|best|easier)|rather not (hop on|do|jump on) a call|keep it (to|over) email|no calls?)\b/i],
  ['schedule', /\b(call|chat|zoom|meet(ing)?|calendar|schedule|availability|hop on|jump on|book a time|what time|when are you free)\b/i],
  ['timing', /\b(next (week|month)|after (the )?(season|playoffs|holidays|break|launch)|in a (few|couple of) (days|weeks)|(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|tomorrow|later this (week|month)|end of (the )?(week|month))\b/i],
  ['content', /\b(video|stream(ing)?|episode|segment|feature it|cover it|make (a )?(video|content)|on (the|my) (channel|show|pod(cast)?|stream)|shout ?out|post about)\b/i],
  ['feedback', /\b(bug|broken|crash(ed|es)?|glitch|error|doesn'?t work|didn'?t work|not working|stuck|confus(ed|ing)|feedback|suggest(ion)?|would be (cool|nice|better)|wish (it|there)|should (add|have|let))\b/i],
  ['try', /\b(i'?ll (try|check|play|give)|gonna (try|play|check)|tried it|played (it|a few|some)|checked it out|giving it a (try|go|shot)|will (try|check|play))\b/i],
  ['compliment', /\b(cool|love (it|this|the)|great|nice|awesome|sick|fire|fun|impressive|neat|clever|well done)\b/i],
];

/** Every intent the message shows, in priority order. */
export function intentsOf(text: string): Intent[] {
  const out = RULES.filter(([, r]) => r.test(text)).map(([i]) => i);
  if (/\?/.test(text) && !out.includes('info')) out.splice(out.includes('stop') || out.includes('decline') ? out.length : 0, 0, 'info');
  return out;
}

/** A status change the owner might accept after an incoming message (never applied automatically). */
export function suggestedStatus(intents: Intent[], current: Status): Status | null {
  if (intents.includes('stop')) return current === 'Do not contact' ? null : 'Do not contact';
  if (intents.includes('decline')) return current === 'Declined' ? null : 'Declined';
  if (intents.includes('content')) return current === 'Shared content' ? null : 'Interested';
  if (intents.includes('try') || intents.includes('feedback')) return current === 'Tried the game' ? null : 'Tried the game';
  return current === 'Replied' ? null : 'Replied';
}

export interface Suggestion {
  contactId: string;
  kind: 'reply-needed' | 'follow-up' | 'reminder';
  /** YYYY-MM-DD it becomes due. */
  due: string;
  reason: string;
}

const day = (iso: string) => iso.slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

/**
 * What needs attention, as private reminders:
 *  - reply-needed: they wrote last, so it's on you (no follow-up suggestion while they wait for your answer);
 *  - follow-up: you wrote last, `afterDays` ago, with at most one follow-up so far;
 *  - reminder: a next-action date you set.
 * Contacts who declined or asked not to be contacted get nothing.
 */
export function suggestions(contacts: Contact[], messages: Message[], today: string, afterDays = 7): Suggestion[] {
  const out: Suggestion[] = [];
  for (const c of contacts) {
    if (CLOSED.includes(c.status)) continue;
    const thread = messages.filter((m) => m.contactId === c.id).sort((a, b) => a.at.localeCompare(b.at));
    const last = thread[thread.length - 1];
    const stopped = thread.some((m) => m.direction === 'in' && (intentsOf(m.body).includes('stop') || intentsOf(m.body).includes('decline')));
    if (stopped) continue;
    if (last?.direction === 'in') {
      out.push({ contactId: c.id, kind: 'reply-needed', due: day(last.at), reason: `${c.name} replied on ${day(last.at)} and is waiting for your answer.` });
    } else if (last?.direction === 'out') {
      const lastIn = [...thread].reverse().find((m) => m.direction === 'in');
      const outsSince = thread.filter((m) => m.direction === 'out' && (!lastIn || m.at > lastIn.at)).length;
      const due = addDays(day(last.at), afterDays);
      if (outsSince <= 1 && due <= today) out.push({ contactId: c.id, kind: 'follow-up', due, reason: `No reply since ${day(last.at)}. One short follow-up at most.` });
    }
    if (c.nextActionOn && c.nextActionOn <= today) out.push({ contactId: c.id, kind: 'reminder', due: c.nextActionOn, reason: c.nextAction || 'Next action due.' });
  }
  const rank = { 'reply-needed': 0, reminder: 1, 'follow-up': 2 } as const;
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || a.due.localeCompare(b.due));
}
