import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { startPersonaProviderVerification } from '@/src/lib/persona-provider-verification-start';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/service-providers/:userId/verification/start
 * Mobile team contract — Persona KYC hosted flow (Premium / Unlimited).
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { user, error } = await getSupabaseRouteClient(_request, true);

  if (error || !user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403, headers: corsHeaders });
  }

  const result = await startPersonaProviderVerification(userId);

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error, details: result.details },
      { status: result.status, headers: corsHeaders },
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        inquiry_url: result.data.inquiry_url,
        inquiry_id: result.data.inquiry_id,
        ...(result.data.already_verified !== undefined && { already_verified: result.data.already_verified }),
        ...(result.data.under_review !== undefined && { under_review: result.data.under_review }),
        ...(result.data.pending_resume !== undefined && { pending_resume: result.data.pending_resume }),
      },
    },
    { status: 200, headers: corsHeaders },
  );
}
