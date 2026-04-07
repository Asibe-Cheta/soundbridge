import { createServiceClient } from '@/src/lib/supabase';
import { userHasActivePremiumAccess } from '@/src/lib/subscription-premium-access';

const PERSONA_API_BASE = process.env.PERSONA_API_BASE?.trim() || 'https://withpersona.com/api/v1';
const PERSONA_API_BASE_FALLBACK = 'https://api.withpersona.com/api/v1';

function pickHostedUrlFromAttributes(attrs: Record<string, unknown> | undefined): string | null {
  if (!attrs) return null;
  const keys = [
    'inquiry-url',
    'hosted-url',
    'inquiry_url',
    'hosted_url',
    'inquiryUrl',
    'hostedUrl',
  ] as const;
  for (const k of keys) {
    const v = attrs[k as string];
    if (typeof v === 'string' && v.startsWith('http')) return v;
  }
  return null;
}

function pickOneTimeLinkFromMeta(personaJson: unknown): string | null {
  const j = personaJson as { meta?: Record<string, unknown> };
  const meta = j?.meta;
  if (!meta || typeof meta !== 'object') return null;
  const u =
    meta['one-time-link'] ??
    meta['one_time_link'] ??
    meta.oneTimeLink ??
    meta['one-time-link-short'];
  return typeof u === 'string' && u.startsWith('http') ? u : null;
}

/** Persona: POST generate-one-time-link — preferred when GET inquiry omits hosted URL (e.g. resume). */
async function generatePersonaOneTimeLink(inquiryId: string): Promise<string | null> {
  const personaApiKey = process.env.PERSONA_API_KEY;
  if (!personaApiKey) return null;

  const path = `/inquiries/${encodeURIComponent(inquiryId)}/generate-one-time-link`;
  const headers = {
    Authorization: `Bearer ${personaApiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  let res = await fetch(`${PERSONA_API_BASE}${path}`, { method: 'POST', headers, body: '{}' });
  if (res.status === 404 && !PERSONA_API_BASE.includes('api.withpersona.com')) {
    res = await fetch(`${PERSONA_API_BASE_FALLBACK}${path}`, { method: 'POST', headers, body: '{}' });
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn('[Persona] generate-one-time-link failed', res.status, inquiryId);
    return null;
  }
  return pickOneTimeLinkFromMeta(json) || pickHostedUrlFromAttributes((json as { data?: { attributes?: Record<string, unknown> } })?.data?.attributes);
}

export interface PersonaStartData {
  inquiry_url: string | null;
  inquiry_id: string;
  already_verified?: boolean;
  under_review?: boolean;
  pending_resume?: boolean;
}

function jsonError(message: string, status: number, details?: string) {
  return { ok: false as const, status, error: message, details };
}

async function hasActivePremium(userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  return userHasActivePremiumAccess(supabase, userId);
}

/** GET inquiry — resolve hosted URL for resume (Persona JSON:API). */
export async function fetchPersonaInquiryHostedUrl(inquiryId: string): Promise<string | null> {
  const personaApiKey = process.env.PERSONA_API_KEY;
  if (!personaApiKey) return null;

  const res = await fetch(`${PERSONA_API_BASE}/inquiries/${encodeURIComponent(inquiryId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${personaApiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  const personaJson = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn('[Persona] GET inquiry failed', res.status, inquiryId);
    return null;
  }

  const attrs = personaJson?.data?.attributes as Record<string, unknown> | undefined;
  const fromAttrs = pickHostedUrlFromAttributes(attrs);
  if (fromAttrs) return fromAttrs;
  return pickOneTimeLinkFromMeta(personaJson);
}

type StartResult =
  | { ok: true; data: PersonaStartData }
  | { ok: false; status: number; error: string; details?: string };

/**
 * Premium-gated Persona inquiry start / resume. Persists new rows to provider_verification_sessions.
 */
export async function startPersonaProviderVerification(userId: string): Promise<StartResult> {
  const supabase = createServiceClient();

  if (!(await hasActivePremium(userId))) {
    return jsonError('Premium or Unlimited subscription required', 403);
  }

  const templateId = process.env.PERSONA_TEMPLATE_ID;
  const personaApiKey = process.env.PERSONA_API_KEY;
  if (!templateId || !personaApiKey) {
    return jsonError('Verification is not configured yet', 503, 'Missing Persona environment variables');
  }

  const { data: approvedSession } = await supabase
    .from('provider_verification_sessions')
    .select('session_id,status,completed_at')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (approvedSession?.session_id) {
    return {
      ok: true,
      data: {
        inquiry_id: approvedSession.session_id,
        inquiry_url: null,
        already_verified: true,
      },
    };
  }

  const { data: inFlight } = await supabase
    .from('provider_verification_sessions')
    .select('session_id,status')
    .eq('user_id', userId)
    .in('status', ['pending', 'needs_review'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inFlight?.session_id) {
    const inquiryId = inFlight.session_id;
    if (inFlight.status === 'needs_review') {
      return {
        ok: true,
        data: {
          inquiry_id: inquiryId,
          inquiry_url: null,
          under_review: true,
          pending_resume: false,
        },
      };
    }

    let inquiryUrl = (await fetchPersonaInquiryHostedUrl(inquiryId)) || null;
    if (!inquiryUrl) {
      inquiryUrl = await generatePersonaOneTimeLink(inquiryId);
    }
    return {
      ok: true,
      data: {
        inquiry_id: inquiryId,
        inquiry_url: inquiryUrl,
        pending_resume: true,
      },
    };
  }

  const personaRes = await fetch(`${PERSONA_API_BASE}/inquiries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${personaApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'inquiry',
        attributes: {
          'inquiry-template-id': templateId,
          'reference-id': userId,
          /** Ensures meta.one-time-link (or inquiry URL) is returned when Persona omits inquiry-url on create. */
          'auto-create-one-time-link': true,
          // Optional: set PERSONA_INQUIRY_REDIRECT_URI=https://www.soundbridge.live/... (must be allowlisted in Persona).
          ...(process.env.PERSONA_INQUIRY_REDIRECT_URI?.trim()
            ? { 'redirect-uri': process.env.PERSONA_INQUIRY_REDIRECT_URI.trim() }
            : {}),
        },
      },
    }),
  });

  const personaJson = await personaRes.json().catch(() => ({}));
  if (!personaRes.ok) {
    const detail =
      (personaJson as { errors?: Array<{ detail?: string }> })?.errors?.[0]?.detail || 'Unknown Persona error';
    return jsonError('Failed to start Persona inquiry', 502, detail);
  }

  const inquiryId = (personaJson as { data?: { id?: string } })?.data?.id as string | undefined;
  const attrs = (personaJson as { data?: { attributes?: Record<string, unknown> } })?.data?.attributes;
  let inquiryUrl =
    pickOneTimeLinkFromMeta(personaJson) || pickHostedUrlFromAttributes(attrs) || null;

  if (!inquiryId) {
    return jsonError('Persona response missing inquiry id', 502);
  }

  if (!inquiryUrl) {
    inquiryUrl = await generatePersonaOneTimeLink(inquiryId);
  }

  const now = new Date().toISOString();
  const { error: insertErr } = await supabase.from('provider_verification_sessions').insert({
    user_id: userId,
    provider: 'persona',
    session_id: inquiryId,
    status: 'pending',
    submitted_at: now,
    updated_at: now,
  });

  if (insertErr) {
    return jsonError('Failed to persist verification session', 500, insertErr.message);
  }

  await supabase
    .from('service_provider_profiles')
    .update({
      verification_status: 'pending',
      verification_requested_at: now,
      updated_at: now,
    })
    .eq('user_id', userId);

  return {
    ok: true,
    data: {
      inquiry_id: inquiryId,
      inquiry_url: inquiryUrl,
    },
  };
}
