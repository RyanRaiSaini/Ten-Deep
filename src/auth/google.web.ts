/**
 * Google sign-in on the web with Google Identity Services. Off until CONFIG.auth.google.web is set.
 * GIS only hands out a token from its own button, so the web UI renders it (renderGoogleButton).
 */
import { CONFIG } from '../config';

type Gis = {
  accounts: { id: {
    initialize: (o: { client_id: string; callback: (r: { credential?: string }) => void; auto_select?: boolean }) => void;
    renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    disableAutoSelect: () => void;
  } };
};

const webId = CONFIG.auth.google.web;
export const googleConfigured = () => !!webId;
export const googleAvailable = async () => googleConfigured() && typeof document !== 'undefined';

let loading: Promise<Gis | null> | null = null;
function loadGis(): Promise<Gis | null> {
  return (loading ??= new Promise((ok) => {
    const w = window as unknown as { google?: Gis };
    if (w.google?.accounts) return ok(w.google);
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => ok((window as unknown as { google?: Gis }).google ?? null);
    s.onerror = () => { loading = null; ok(null); };
    document.head.appendChild(s);
  }));
}

/** Draw Google's button into `el`; `onToken` gets the ID token when the player signs in. */
export async function renderGoogleButton(el: HTMLElement, onToken: (token: string) => void): Promise<boolean> {
  if (!webId) return false;
  const gis = await loadGis();
  if (!gis) return false;
  gis.accounts.id.initialize({ client_id: webId, callback: (r) => { if (r.credential) onToken(r.credential); } });
  gis.accounts.id.renderButton(el, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 280 });
  return true;
}

/** The web flow is driven by the rendered button, never by a direct call. */
export const googleToken = async (): Promise<string | null> => null;
export async function googleSignOut() {
  if (!webId) return;
  (await loadGis())?.accounts.id.disableAutoSelect();
}
