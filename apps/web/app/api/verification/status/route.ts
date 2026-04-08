import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

type VerificationStatus = 'not_requested' | 'pending' | 'approved' | 'rejected';

/**
 * GET /api/verification/status?userId=optional
 * Mobile: Bearer token. Returns DB-backed Persona / provider verification state (not live Persona API).
 * @see WEB_TEAM_PERSONA_VERIFICATION_FIXES.md
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const { searchParams } = new URL(request.url);
    const requestedId = searchParams.get('userId');
    const targetUserId = requestedId && requestedId.length > 0 ? requestedId : user.id;

    if (targetUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }

    const service = createServiceClient();

    const [{ data: sp }, { data: profile }] = await Promise.all([
      service
        .from('service_provider_profiles')
        .select('verification_status, is_verified')
        .eq('user_id', targetUserId)
        .maybeSingle(),
      service.from('profiles').select('is_verified').eq('id', targetUserId).maybeSingle(),
    ]);

    let status: VerificationStatus = (sp?.verification_status as VerificationStatus) || 'not_requested';
    if (!sp && profile?.is_verified) {
      status = 'approved';
    }

    const isVerified = Boolean(sp?.is_verified ?? profile?.is_verified);

    return NextResponse.json(
      {
        status,
        is_verified: isVerified,
        verificationStatus: { status },
      },
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error('Unexpected verification status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
