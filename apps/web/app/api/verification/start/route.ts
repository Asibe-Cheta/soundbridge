import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonError(message: string, status: number, details?: string) {
  return NextResponse.json({ error: message, details }, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const { user, error } = await getSupabaseRouteClient(request, true);
  if (error || !user) return jsonError('Authentication required', 401);

  let body: { user_id?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON payload', 400);
  }

  const userId = body.user_id || user.id;
  if (userId !== user.id) return jsonError('You can only start verification for your own account', 403);

  const supabase = createServiceClient() as any;

  const { data: activeSub, error: subError } = await supabase
    .from('user_subscriptions')
    .select('tier,status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('tier', ['premium', 'unlimited'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError) return jsonError('Failed to load subscription', 500, subError.message);
  if (!activeSub) return jsonError('Premium or Unlimited subscription required', 403);

  const { data: approvedSession, error: approvedErr } = await supabase
    .from('provider_verification_sessions')
    .select('session_id,status,completed_at')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (approvedErr) return jsonError('Failed to load verification sessions', 500, approvedErr.message);
  if (approvedSession) {
    return NextResponse.json(
      { inquiry_id: approvedSession.session_id, session_url: null, already_verified: true },
      { headers: corsHeaders },
    );
  }

  const { data: pendingSession } = await supabase
    .from('provider_verification_sessions')
    .select('session_id,status')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingSession) {
    return NextResponse.json(
      { inquiry_id: pendingSession.session_id, session_url: null, already_verified: false, pending: true },
      { headers: corsHeaders },
    );
  }

  const templateId = process.env.PERSONA_TEMPLATE_ID;
  const personaApiKey = process.env.PERSONA_API_KEY;
  if (!templateId || !personaApiKey) {
    return jsonError('Verification is not configured yet', 503, 'Missing Persona environment variables');
  }

  const personaRes = await fetch('https://withpersona.com/api/v1/inquiries', {
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
        },
      },
    }),
  });

  const personaJson = await personaRes.json().catch(() => ({}));
  if (!personaRes.ok) {
    return jsonError('Failed to start Persona inquiry', 502, personaJson?.errors?.[0]?.detail || 'Unknown Persona error');
  }

  const inquiryId = personaJson?.data?.id as string | undefined;
  const sessionUrl =
    (personaJson?.data?.attributes?.['inquiry-url'] as string | undefined) ||
    (personaJson?.data?.attributes?.['hosted-url'] as string | undefined) ||
    null;

  if (!inquiryId) return jsonError('Persona response missing inquiry id', 502);

  const now = new Date().toISOString();
  const { error: insertErr } = await supabase.from('provider_verification_sessions').insert({
    user_id: userId,
    provider: 'persona',
    session_id: inquiryId,
    status: 'pending',
    submitted_at: now,
    updated_at: now,
  });

  if (insertErr) return jsonError('Failed to persist verification session', 500, insertErr.message);

  return NextResponse.json(
    { inquiry_id: inquiryId, session_url: sessionUrl, already_verified: false },
    { status: 201, headers: corsHeaders },
  );
}

