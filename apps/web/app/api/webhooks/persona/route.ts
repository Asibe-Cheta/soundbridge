import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

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

  if (eventName === 'inquiry.completed' || String(eventName).includes('inquiry.completed')) {
    const approved = inquiryStatus === 'approved' || inquiryStatus === 'passed';
    const declined = inquiryStatus === 'declined' || inquiryStatus === 'failed';

    if (inquiryId) {
      const sessionStatus = approved ? 'approved' : declined ? 'declined' : 'needs_review';
      const now = new Date().toISOString();
      await supabase
        .from('provider_verification_sessions')
        .update({
          status: sessionStatus,
          completed_at: now,
          updated_at: now,
          verification_data: body as Record<string, unknown>,
        })
        .eq('session_id', inquiryId);
    }

    if (approved && inquiryId) {
      const { data: session } = await supabase
        .from('provider_verification_sessions')
        .select('user_id')
        .eq('session_id', inquiryId)
        .maybeSingle();

      if (session?.user_id) {
        await supabase
          .from('service_provider_profiles')
          .update({
            is_verified: true,
            verified_at: new Date().toISOString(),
            verification_provider: 'persona',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', session.user_id);
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
