import { createServiceClient } from '@/src/lib/supabase';

const PERSONA_API_BASE = 'https://withpersona.com/api/v1';

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
  const { data: activeSub } = await supabase
    .from('user_subscriptions')
    .select('tier,status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('tier', ['premium', 'unlimited'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return !!activeSub;
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
  if (!attrs) return null;
  const url =
    (typeof attrs['hosted-url'] === 'string' && attrs['hosted-url']) ||
    (typeof attrs['inquiry-url'] === 'string' && attrs['inquiry-url']) ||
    (typeof attrs.hosted_url === 'string' && attrs.hosted_url) ||
    null;
  return url || null;
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

    const inquiryUrl = (await fetchPersonaInquiryHostedUrl(inquiryId)) || null;
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
  const inquiryUrl =
    ((personaJson as { data?: { attributes?: Record<string, string> } })?.data?.attributes?.[
      'inquiry-url'
    ] as string | undefined) ||
    ((personaJson as { data?: { attributes?: Record<string, string> } })?.data?.attributes?.[
      'hosted-url'
    ] as string | undefined) ||
    null;

  if (!inquiryId) {
    return jsonError('Persona response missing inquiry id', 502);
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
