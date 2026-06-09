import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptSecret, encryptSecret } from '@/src/lib/encryption';
import { getSiteUrl } from '@/src/lib/site-url';

export const GOOGLE_CALENDAR_FREEBUSY_SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy';
const MOBILE_CALLBACK_SCHEME = 'soundbridge://calendar/google/callback';

type CalendarIntegrationRow = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  calendar_connected: boolean;
  calendar_connected_at: string | null;
  last_synced_at: string | null;
  needs_reconnect: boolean;
};

function getGoogleCalendarConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() ||
    `${getSiteUrl()}/api/calendar/google/callback`;

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}

function getStateSecret(): string {
  return (
    process.env.GOOGLE_CALENDAR_STATE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    'soundbridge-calendar-state'
  );
}

export function buildGoogleCalendarOAuthState(userId: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${userId}:${nonce}:${Date.now()}`;
  const sig = crypto.createHmac('sha256', getStateSecret()).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function parseGoogleCalendarOAuthState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length < 4) return null;
    const sig = parts.pop()!;
    const payload = parts.join(':');
    const expected = crypto.createHmac('sha256', getStateSecret()).update(payload).digest('hex');
    if (sig !== expected) return null;
    const [userId, , ts] = payload.split(':');
    if (!userId) return null;
    const ageMs = Date.now() - Number(ts);
    if (!Number.isFinite(ageMs) || ageMs > 1000 * 60 * 30) return null;
    return userId;
  } catch {
    return null;
  }
}

export function buildGoogleCalendarConnectUrl(userId: string): string | null {
  const cfg = getGoogleCalendarConfig();
  if (!cfg) return null;

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_FREEBUSY_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: buildGoogleCalendarOAuthState(userId),
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function mobileCalendarCallbackUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return `${MOBILE_CALLBACK_SCHEME}?${qs}`;
}

async function exchangeCodeForTokens(code: string) {
  const cfg = getGoogleCalendarConfig();
  if (!cfg) throw new Error('Google Calendar OAuth is not configured');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Token exchange failed');
  }

  return data;
}

async function refreshAccessToken(refreshTokenPlain: string) {
  const cfg = getGoogleCalendarConfig();
  if (!cfg) throw new Error('Google Calendar OAuth is not configured');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: refreshTokenPlain,
      grant_type: 'refresh_token',
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Token refresh failed');
  }

  return data;
}

export async function revokeGoogleToken(tokenPlain: string): Promise<void> {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenPlain)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch {
    /* best-effort */
  }
}

export async function getCalendarStatus(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from('calendar_integrations')
    .select('calendar_connected, calendar_connected_at, last_synced_at, needs_reconnect')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data?.calendar_connected) {
    return {
      connected: false,
      calendar_connected_at: null as string | null,
      last_synced_at: null as string | null,
      needs_reconnect: false,
    };
  }

  return {
    connected: true,
    calendar_connected_at: data.calendar_connected_at as string | null,
    last_synced_at: data.last_synced_at as string | null,
    needs_reconnect: Boolean(data.needs_reconnect),
  };
}

export async function storeGoogleCalendarTokens(
  supabase: SupabaseClient,
  userId: string,
  tokens: { access_token: string; refresh_token?: string; expires_in?: number },
  existingRefresh?: string,
) {
  const refreshPlain = tokens.refresh_token || existingRefresh;
  if (!refreshPlain) {
    throw new Error('Google did not return a refresh token. Disconnect and reconnect with consent.');
  }

  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();
  const now = new Date().toISOString();

  const { error } = await supabase.from('calendar_integrations').upsert(
    {
      user_id: userId,
      provider: 'google',
      access_token: encryptSecret(tokens.access_token),
      refresh_token: encryptSecret(refreshPlain),
      token_expires_at: expiresAt,
      calendar_connected: true,
      calendar_connected_at: now,
      last_synced_at: now,
      needs_reconnect: false,
      updated_at: now,
    },
    { onConflict: 'user_id' },
  );

  if (error) throw new Error(error.message);
}

export async function completeGoogleCalendarOAuth(
  supabase: SupabaseClient,
  userId: string,
  code: string,
) {
  const { data: existing } = await supabase
    .from('calendar_integrations')
    .select('refresh_token')
    .eq('user_id', userId)
    .maybeSingle();

  let existingRefresh: string | undefined;
  if (existing?.refresh_token) {
    try {
      existingRefresh = decryptSecret(existing.refresh_token);
    } catch {
      existingRefresh = undefined;
    }
  }

  const tokens = await exchangeCodeForTokens(code);
  await storeGoogleCalendarTokens(supabase, userId, tokens, existingRefresh);
}

export async function disconnectGoogleCalendar(supabase: SupabaseClient, userId: string) {
  const { data: row } = await supabase
    .from('calendar_integrations')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .maybeSingle();

  if (row?.refresh_token) {
    try {
      await revokeGoogleToken(decryptSecret(row.refresh_token));
    } catch {
      /* continue */
    }
  } else if (row?.access_token) {
    try {
      await revokeGoogleToken(decryptSecret(row.access_token));
    } catch {
      /* continue */
    }
  }

  await supabase.from('calendar_integrations').delete().eq('user_id', userId);

  await supabase
    .from('user_behaviour_profiles')
    .update({
      calendar_free_days: null,
      calendar_free_times: null,
      calendar_pattern_confidence: null,
      calendar_pattern_updated_at: null,
      last_updated: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

export async function getValidGoogleAccessToken(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: row } = await supabase
    .from('calendar_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('calendar_connected', true)
    .maybeSingle();

  if (!row) return null;

  const integration = row as CalendarIntegrationRow;
  const expiresAt = new Date(integration.token_expires_at).getTime();
  const needsRefresh = expiresAt <= Date.now() + 60_000;

  if (!needsRefresh) {
    return decryptSecret(integration.access_token);
  }

  try {
    const refreshed = await refreshAccessToken(decryptSecret(integration.refresh_token));
    const newExpires = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString();
    await supabase
      .from('calendar_integrations')
      .update({
        access_token: encryptSecret(refreshed.access_token!),
        token_expires_at: newExpires,
        needs_reconnect: false,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return refreshed.access_token!;
  } catch {
    await supabase
      .from('calendar_integrations')
      .update({ needs_reconnect: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    return null;
  }
}

/** FreeBusy check for event notification gating. Stores binary result only. */
export async function checkUserFreeForEventWindow(
  supabase: SupabaseClient,
  userId: string,
  eventStartIso: string,
  eventId?: string,
): Promise<boolean | null> {
  const accessToken = await getValidGoogleAccessToken(supabase, userId);
  if (!accessToken) return null;

  const eventStart = new Date(eventStartIso);
  const windowStart = new Date(eventStart.getTime() - 2 * 60 * 60 * 1000);
  const windowEnd = new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);

  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: windowStart.toISOString(),
      timeMax: windowEnd.toISOString(),
      items: [{ id: 'primary' }],
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
  };

  const busy = data.calendars?.primary?.busy ?? [];
  const isFree = busy.length === 0;

  await supabase.from('calendar_availability_checks').insert({
    user_id: userId,
    event_id: eventId ?? null,
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    is_free: isFree,
  });

  await supabase
    .from('calendar_integrations')
    .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  return isFree;
}

export function isGoogleCalendarConfigured(): boolean {
  return getGoogleCalendarConfig() !== null;
}
