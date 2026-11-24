/**
 * Storage for the private outreach workspace (files starting with "_" are not deployed as functions).
 *  - outreach/db.json: contacts, campaigns, drafts, messages, ideas, evidence (private Blob).
 *  - outreach/events/<code>/<kind>/<visitor>: one empty file per visitor per event, so counts are unique
 *    visitors and a repeated event from the same visitor is idempotent. No personal data is stored.
 */
import { get, list, put } from '@vercel/blob';
import type { Db } from '../src/outreach/types';

export interface OutreachStore {
  readDb(): Promise<Db | null>;
  writeDb(db: Db): Promise<void>;
  putEvent(path: string): Promise<void>;
  /** Every event path under the prefix (paginated internally, capped). `truncated` if the cap was hit. */
  listEvents(prefix: string): Promise<{ paths: string[]; truncated: boolean }>;
}

const DB = 'outreach/db.json';
const MAX_PAGES = 20;

export function blobStore(): OutreachStore {
  return {
    async readDb() {
      const r = await get(DB, { access: 'private', useCache: false }).catch(() => null);
      if (!r || r.statusCode !== 200) return null;
      return JSON.parse(await new Response(r.stream).text()) as Db;
    },
    async writeDb(db) {
      await put(DB, JSON.stringify(db), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' });
    },
    async putEvent(path) {
      await put(path, '1', { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'text/plain' });
    },
    async listEvents(prefix) {
      const paths: string[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < MAX_PAGES; page++) {
        const r = await list({ prefix, cursor, limit: 1000 });
        paths.push(...r.blobs.map((b) => b.pathname));
        if (!r.hasMore) return { paths, truncated: false };
        cursor = r.cursor;
      }
      return { paths, truncated: true };
    },
  };
}

export function memoryOutreachStore(): OutreachStore & { events: Set<string> } {
  let db: Db | null = null;
  const events = new Set<string>();
  return {
    events,
    async readDb() { return db ? structuredClone(db) : null; },
    async writeDb(d) { db = structuredClone(d); },
    async putEvent(p) { events.add(p); },
    async listEvents(prefix) { return { paths: [...events].filter((p) => p.startsWith(prefix)), truncated: false }; },
  };
}
