/**
 * Admin-side state for the outreach workspace. The admin key is kept on this device only (its own
 * storage key, not part of the game's cloud backup). All data lives on the server behind that key.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CONFIG } from '../config';
import type { Counts } from './metrics';
import type { Preset } from './prompt';
import { DEFAULT_SETTINGS, emptyDb, type Db, type DraftKind } from './types';

export interface IntegrationStatus {
  storage: boolean;
  ai: { model: string | null; configured: boolean };
  gmail: { connected: boolean; note: string };
}

export interface Report { byCode: Record<string, Counts>; truncated: boolean; at: string }

export interface GenResult { draft?: { subject: string; text: string; basis: { fact: string; relevance: string; ask: string } }; link?: string; error?: string; detail?: string }

interface AdminState {
  key: string;
  db: Db | null;
  status: IntegrationStatus | null;
  error: string | null;
  busy: boolean;
  report: Report | null;
  urlStatus: Record<string, number>;
  setKey: (k: string) => void;
  signOut: () => void;
  load: () => Promise<void>;
  /** Apply a change and save it. Returns false (with `error` set) if the server refused it. */
  commit: (change: (db: Db) => void) => Promise<boolean>;
  generate: (a: { contactId: string; kind: DraftKind; campaignId: string; preset?: Preset; instruction?: string; current?: { subject: string; text: string } }) => Promise<GenResult>;
  loadReport: () => Promise<void>;
  checkUrl: (url: string) => Promise<number>;
}

const URL_ = Platform.OS === 'web' && typeof document !== 'undefined' ? '/api/admin' : `${CONFIG.webUrl}/api/admin`;

const MESSAGES: Record<string, string> = {
  'admin-not-configured': 'The admin is not set up yet: add an ADMIN_KEY (24+ characters) in the Vercel project settings and redeploy.',
  unauthorized: 'That admin key is not right.',
  'email-needs-source': 'An email address needs the public page where it was listed (email source URL). Unverified emails stay empty.',
  conflict: 'Your data changed somewhere else (another tab?). The latest version is loaded; please redo your last change.',
  'too-big': 'The workspace is too large to save.',
};

async function call(key: string, body: Record<string, unknown>): Promise<{ status: number; data: Record<string, unknown> }> {
  const r = await fetch(URL_, { method: 'POST', headers: { 'content-type': 'application/json', 'x-admin-key': key }, body: JSON.stringify(body) });
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: r.status, data };
}

const normalize = (db: Db | null): Db => {
  const d = db ?? emptyDb();
  return { ...emptyDb(), ...d, settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) } };
};

export const useAdmin = create<AdminState>()(
  persist(
    (set, get) => ({
      key: '', db: null, status: null, error: null, busy: false, report: null, urlStatus: {},
      setKey: (key) => set({ key: key.trim(), error: null }),
      signOut: () => set({ key: '', db: null, status: null, report: null, error: null }),
      load: async () => {
        const { key } = get();
        if (!key) return;
        set({ busy: true, error: null });
        try {
          const r = await call(key, { op: 'load' });
          if (r.status !== 200) set({ error: MESSAGES[String(r.data.error)] ?? `Could not load (${r.status}).`, db: r.status === 401 ? null : get().db });
          else set({ db: normalize(r.data.db as Db | null), status: r.data.status as IntegrationStatus });
        } catch {
          set({ error: 'Could not reach the server.' });
        } finally {
          set({ busy: false });
        }
      },
      commit: async (change) => {
        const { key, db } = get();
        if (!db) return false;
        const next = structuredClone(db);
        change(next);
        set({ busy: true, error: null });
        try {
          const r = await call(key, { op: 'save', db: next, baseRev: db.rev });
          if (r.status === 200) {
            set({ db: { ...next, rev: Number(r.data.rev), updatedAt: String(r.data.updatedAt) } });
            return true;
          }
          if (r.status === 409) set({ db: normalize(r.data.db as Db | null) });
          set({ error: MESSAGES[String(r.data.error)] ?? `Could not save (${r.status}).` });
          return false;
        } catch {
          set({ error: 'Could not reach the server. Nothing was saved.' });
          return false;
        } finally {
          set({ busy: false });
        }
      },
      generate: async (a) => {
        try {
          const r = await call(get().key, { op: 'generate', ...a });
          return r.data as GenResult;
        } catch {
          return { error: 'network', detail: 'Could not reach the server.' };
        }
      },
      loadReport: async () => {
        set({ busy: true });
        try {
          const r = await call(get().key, { op: 'report' });
          if (r.status === 200) set({ report: r.data as unknown as Report });
          else set({ error: `Could not load the report (${r.status}).` });
        } catch {
          set({ error: 'Could not reach the server.' });
        } finally {
          set({ busy: false });
        }
      },
      checkUrl: async (url) => {
        try {
          const r = await call(get().key, { op: 'checkUrl', url });
          const st = r.status === 200 ? Number(r.data.status) : 0;
          set({ urlStatus: { ...get().urlStatus, [url]: st } });
          return st;
        } catch {
          return 0;
        }
      },
    }),
    { name: 'tendeep-admin', storage: createJSONStorage(() => AsyncStorage), partialize: ({ key }) => ({ key }) },
  ),
);
