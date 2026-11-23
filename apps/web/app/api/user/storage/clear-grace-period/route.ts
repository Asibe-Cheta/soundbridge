import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { checkFreeStorageCompliance } from '@/src/lib/storage-quota-compliance';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * POST /api/user/storage/clear-grace-period
 * Replaces the mobile app's direct client write to
 * profiles.grace_period_ends/downgraded_at/storage_at_downgrade (now
 * blocked -- see the RLS lockdown). Those columns are only cleared after
 * independently re-verifying the user's public tracks actually fit the
 * free-tier storage limit; the client choosing which tracks to keep public
 * is not itself proof of compliance.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const service = createServiceClient();
    const compliance = await checkFreeStorageCompliance(service, user.id);

    if (!compliance.compliant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your public tracks still exceed the free plan storage limit.',
          public_storage_bytes: compliance.publicStorageBytes,
          limit_bytes: compliance.limitBytes,
        },
        { status: 400, headers: corsHeaders },
      );
    }

    const { error: updateError } = await service
      .from('profiles')
      .update({
        grace_period_ends: null,
        downgraded_at: null,
        storage_at_downgrade: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[clear-grace-period] update failed:', updateError);
      return NextResponse.json({ error: 'Failed to clear grace period' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json(
      {
        success: true,
        public_storage_bytes: compliance.publicStorageBytes,
        limit_bytes: compliance.limitBytes,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[clear-grace-period]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
