import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, creator_agreement_accepted')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          success: true,
          canUpload: false,
          needsBecomeCreator: true,
          reason: 'profile_missing',
        },
        { headers: corsHeaders },
      );
    }

    const isCreator = profile.role === 'creator';
    const hasAgreement = profile.creator_agreement_accepted === true;
    const canUpload = isCreator && hasAgreement;

    return NextResponse.json(
      {
        success: true,
        canUpload,
        needsBecomeCreator: !canUpload,
        role: profile.role,
        creator_agreement_accepted: hasAgreement,
        reason: !isCreator ? 'not_creator' : !hasAgreement ? 'agreement_required' : null,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[creator-upload-access]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
