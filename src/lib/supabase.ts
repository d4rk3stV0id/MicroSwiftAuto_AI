import { createClient } from '@supabase/supabase-js';

function trimmedEnv(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t === '' ? undefined : t;
}

const rawUrl = trimmedEnv(import.meta.env.VITE_SUPABASE_URL);
const rawKey = trimmedEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

/** Matches common template / placeholder values from .env examples (not only the two legacy sentinel strings). */
const PLACEHOLDER_RE =
  /YOUR_|PLACEHOLDER|CHANGEME|REPLACE_ME|xxxxxxxx|\.example\.|xxx\.supabase|your[_-]?project|^https?:\/\/your/i;

function looksLikePlaceholder(value: string): boolean {
  return PLACEHOLDER_RE.test(value);
}

function parseProjectRef(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (u.pathname !== '/' && u.pathname !== '') return undefined;
    if (!u.hostname.toLowerCase().endsWith('.supabase.co')) return undefined;
    const ref = u.hostname.replace(/\.supabase\.co$/i, '');
    if (!ref || looksLikePlaceholder(ref) || looksLikePlaceholder(url)) return undefined;
    // Project ref is alphanumeric; allow short dev-like refs but block obvious garbage
    if (!/^[a-z0-9]{8,}$/i.test(ref)) return undefined;
    return ref;
  } catch {
    return undefined;
  }
}

function isValidAnonKey(key: string): boolean {
  if (looksLikePlaceholder(key)) return false;
  if (!key.startsWith('eyJ')) return false;
  if (key.length < 80) return false;
  return true;
}

export type ResolvedSupabaseEnv =
  | { status: 'disabled' }
  | { status: 'invalid'; message: string }
  | { status: 'ready'; url: string; anonKey: string; projectRef: string };

export function resolveSupabaseEnv(): ResolvedSupabaseEnv {
  const hasUrl = Boolean(rawUrl);
  const hasKey = Boolean(rawKey);
  if (!hasUrl && !hasKey) return { status: 'disabled' };
  if (!hasUrl || !hasKey) {
    return {
      status: 'invalid',
      message:
        'Add both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file (Supabase → Project Settings → API), then restart the dev server.',
    };
  }

  const url = rawUrl!;
  const anonKey = rawKey!;
  const projectRef = parseProjectRef(url);
  const urlOk = url.startsWith('https://') && typeof projectRef === 'string';

  if (!urlOk || !isValidAnonKey(anonKey)) {
    return {
      status: 'invalid',
      message:
        'Supabase URL or anon key is missing or still a placeholder. Use https://<project-ref>.supabase.co and the anon (public) JWT key only — not the service role key.',
    };
  }

  return { status: 'ready', url, anonKey, projectRef };
}

const resolved = resolveSupabaseEnv();

export const isSupabaseEnabled = resolved.status === 'ready';

/** When set, show this instead of the login screen so misconfiguration is obvious. */
export const supabaseConfigurationMessage: string | null =
  resolved.status === 'invalid' ? resolved.message : null;

if (resolved.status === 'invalid') {
  console.warn('[ClaimSaathi]', resolved.message);
} else if (resolved.status === 'disabled') {
  console.warn(
    'Supabase is not configured: app runs without cloud sign-in. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable login.',
  );
}

const supabaseUrl = resolved.status === 'ready' ? resolved.url : 'https://placeholder.supabase.co';
const supabaseAnonKey = resolved.status === 'ready' ? resolved.anonKey : 'placeholder-key';
const projectRef = resolved.status === 'ready' ? resolved.projectRef : 'placeholder';
const storageKey = `sb-${projectRef}-auth-token`;

declare global {
  interface Window {
    /** Dev HMR can reuse one client; typed loosely to match untyped DB schema. */
    __claimsaathiSupabaseClient?: any;
    /** Bust stale client after .env / project URL changes without a full tab close. */
    __claimsaathiSupabaseFingerprint?: string;
  }
}

export function clearSupabaseLocalSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(storageKey);
  sessionStorage.removeItem(storageKey);
}

const createSupabase = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

const clientFingerprint = `${supabaseUrl}|${projectRef}`;

function getBrowserSupabase() {
  const win = window as Window & {
    __claimsaathiSupabaseClient?: ReturnType<typeof createClient>;
    __claimsaathiSupabaseFingerprint?: string;
  };
  if (
    win.__claimsaathiSupabaseClient &&
    win.__claimsaathiSupabaseFingerprint === clientFingerprint
  ) {
    return win.__claimsaathiSupabaseClient;
  }
  void win.__claimsaathiSupabaseClient?.auth?.signOut?.({ scope: 'local' });
  win.__claimsaathiSupabaseFingerprint = clientFingerprint;
  win.__claimsaathiSupabaseClient = createSupabase();
  return win.__claimsaathiSupabaseClient;
}

export const supabase =
  typeof window !== 'undefined' ? getBrowserSupabase() : createSupabase();
