import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { sendExpoPushIfAllowed } from '@/src/lib/notification-push-preferences';
import { createServiceClient } from '@/src/lib/supabase';

/**
 * Persona inquiry webhooks — verify signature and sync session + provider profile.
 * @see https://docs.withpersona.com/docs/webhooks
 * Raw body must be used for HMAC (do not re-stringify JSON).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Persona-Signature, X-Persona-Signature',
};

function verifyPersonaSignature(rawBody: string, personaSignatureHeader: string | null, secret: string): boolean {
  if (!personaSignatureHeader || !secret) return false;
  // Header: "t=1234567890,v1=hexdigest" (may repeat with spaces for rotation)
  const segments = personaSignatureHeader.split(/\s+/);
  for (const seg of segments) {
    const parts = seg.split(',').map((p) => p.trim());
    let t = '';
    let v1 = '';
    for (const p of parts) {
      if (p.startsWith('t=')) t = p.slice(2);
      else if (p.startsWith('v1=')) v1 = p.slice(3);
    }
    if (!t || !v1) continue;
    const payload = `${t}.${rawBody}`;
    const hmac = createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
    try {
      const a = Buffer.from(hmac, 'utf8');
      const b = Buffer.from(v1, 'utf8');
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const secret = process.env.PERSONA_WEBHOOK_SECRET || '';
  const rawBody = await request.text();
  const sig =
    request.headers.get('Persona-Signature') ||
    request.headers.get('persona-signature') ||
    request.headers.get('X-Persona-Signature');

  if (!secret) {
    console.warn('[persona webhook] PERSONA_WEBHOOK_SECRET is not set; skipping signature verification');
  } else if (!verifyPersonaSignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401, headers: corsHeaders });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
  }

  const eventName =
    findDeepString(body, ['data', 'attributes', 'name']) ||
    findDeepString(body, ['type']) ||
    '';

  const inquiryId =
    findDeepString(body, ['data', 'attributes', 'payload', 'data', 'id']) ||
    findInquiryId(body) ||
    null;

  const inquiryStatus =
    findDeepString(body, ['data', 'attributes', 'payload', 'data', 'attributes', 'status']) || '';

  const supabase = createServiceClient();
  /** Persona webhook "Key inflection" Kebab sends e.g. `inquiry-completed`; Camel uses `inquiry.completed`. */
  const ev = String(eventName).toLowerCase().trim().replace(/-/g, '.');
  const now = new Date().toISOString();

  async function sendVerificationPush(userId: string, outcome: 'approved' | 'declined') {
    const payload =
      outcome === 'approved'
        ? {
            title: "You're Verified! ✓",
            body: 'Your Verified Professional badge is now live on your profile. Clients can see it when browsing services.',
            data: { type: 'verification_approved' as const, outcome: 'approved' as const },
          }
        : {
            title: 'Verification Unsuccessful',
            body: "We couldn't verify your identity. Please try again from your Service Provider Dashboard.",
            data: { type: 'verification_declined' as const, outcome: 'declined' as const },
          };

    await sendExpoPushIfAllowed(supabase, userId, 'verification', {
      ...payload,
      channelId: 'tips',
      priority: 'high',
    });
  }

  if (!inquiryId) {
    return NextResponse.json({ received: true, note: 'no inquiry id' }, { status: 200, headers: corsHeaders });
  }

  /** Mobile / ProviderVerificationService: not_requested | pending | approved | rejected */
  async function syncProfileForUser(
    userId: string,
    profile: {
      verification_status: 'not_requested' | 'pending' | 'approved' | 'rejected';
      is_verified: boolean;
      verified_at: string | null;
    },
  ) {
    await supabase
      .from('service_provider_profiles')
      .update({
        verification_status: profile.verification_status,
        is_verified: profile.is_verified,
        verified_at: profile.verified_at,
        verification_provider: 'persona',
        verification_reviewed_at: now,
        updated_at: now,
      })
      .eq('user_id', userId);
  }

  const { data: sessionRow } = await supabase
    .from('provider_verification_sessions')
    .select('user_id,status')
    .eq('session_id', inquiryId)
    .maybeSingle();

  const userId = sessionRow?.user_id as string | undefined;
  const previousSessionStatus = (sessionRow?.status as string | undefined) ?? null;

  // Explicit event types (Persona dashboard)
  if (ev === 'inquiry.approved' || ev.includes('inquiry.approved')) {
    await supabase
      .from('provider_verification_sessions')
      .update({
        status: 'approved',
        completed_at: now,
        updated_at: now,
        verification_data: body as Record<string, unknown>,
      })
      .eq('session_id', inquiryId);
    if (userId) {
      await syncProfileForUser(userId, {
        verification_status: 'approved',
        is_verified: true,
        verified_at: now,
      });
      if (previousSessionStatus !== 'approved') {
        await sendVerificationPush(userId, 'approved');
      }
    }
    return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
  }

  if (ev === 'inquiry.declined' || ev.includes('inquiry.declined')) {
    await supabase
      .from('provider_verification_sessions')
      .update({
        status: 'declined',
        completed_at: now,
        updated_at: now,
        verification_data: body as Record<string, unknown>,
      })
      .eq('session_id', inquiryId);
    if (userId) {
      await syncProfileForUser(userId, {
        verification_status: 'rejected',
        is_verified: false,
        verified_at: null,
      });
      if (previousSessionStatus !== 'declined') {
        await sendVerificationPush(userId, 'declined');
      }
    }
    return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
  }

  if (ev === 'inquiry.expired' || ev.includes('inquiry.expired')) {
    await supabase
      .from('provider_verification_sessions')
      .update({
        status: 'expired',
        updated_at: now,
        verification_data: body as Record<string, unknown>,
      })
      .eq('session_id', inquiryId);
    if (userId) {
      await syncProfileForUser(userId, {
        verification_status: 'not_requested',
        is_verified: false,
        verified_at: null,
      });
    }
    return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
  }

  // inquiry.completed — status may be approved, declined, or pending review inside Persona
  if (ev === 'inquiry.completed' || ev.includes('inquiry.completed')) {
    const approved = inquiryStatus === 'approved' || inquiryStatus === 'passed';
    const declined = inquiryStatus === 'declined' || inquiryStatus === 'failed';

    const sessionStatus = approved ? 'approved' : declined ? 'declined' : 'needs_review';
    await supabase
      .from('provider_verification_sessions')
      .update({
        status: sessionStatus,
        completed_at: now,
        updated_at: now,
        verification_data: body as Record<string, unknown>,
      })
      .eq('session_id', inquiryId);

    if (userId) {
      if (approved) {
        await syncProfileForUser(userId, {
          verification_status: 'approved',
          is_verified: true,
          verified_at: now,
        });
        if (previousSessionStatus !== 'approved') {
          await sendVerificationPush(userId, 'approved');
        }
      } else if (declined) {
        await syncProfileForUser(userId, {
          verification_status: 'rejected',
          is_verified: false,
          verified_at: null,
        });
        if (previousSessionStatus !== 'declined') {
          await sendVerificationPush(userId, 'declined');
        }
      } else {
        await supabase
          .from('service_provider_profiles')
          .update({
            verification_status: 'pending',
            verification_provider: 'persona',
            verification_reviewed_at: null,
            updated_at: now,
          })
          .eq('user_id', userId);
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200, headers: corsHeaders });
}

function findDeepString(obj: unknown, path: string[]): string {
  let cur: unknown = obj;
  for (const key of path) {
    if (!cur || typeof cur !== 'object') return '';
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === 'string' ? cur : '';
}

function findInquiryId(obj: unknown, depth = 0): string | null {
  if (depth > 12 || obj === null || obj === undefined) return null;
  if (typeof obj === 'string' && obj.startsWith('inq_')) return obj;
  if (typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const f = findInquiryId(item, depth + 1);
      if (f) return f;
    }
    return null;
  }
  const o = obj as Record<string, unknown>;
  for (const k of Object.keys(o)) {
    const f = findInquiryId(o[k], depth + 1);
    if (f) return f;
  }
  return null;
}
