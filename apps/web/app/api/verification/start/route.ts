import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { startPersonaProviderVerification } from '@/src/lib/persona-provider-verification-start';

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

/** Legacy path — same logic as POST /api/service-providers/:userId/verification/start */
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

  const result = await startPersonaProviderVerification(userId);

  if (!result.ok) {
    return jsonError(result.error, result.status, result.details);
  }

  const d = result.data;
  return NextResponse.json(
    {
      inquiry_id: d.inquiry_id,
      session_url: d.inquiry_url,
      already_verified: d.already_verified ?? false,
      pending: d.pending_resume ?? false,
      under_review: d.under_review ?? false,
    },
    { status: d.inquiry_url || d.already_verified || d.under_review ? 200 : 201, headers: corsHeaders },
  );
}
