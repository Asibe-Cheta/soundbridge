import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { needsCommunityWelcome } from '@/src/lib/community-entry';

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
      .select('community_entry_creator_id, community_entry_shown_at, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile || !needsCommunityWelcome(profile)) {
      return NextResponse.json(
        { success: true, needsWelcome: false, welcomeUsername: null },
        { headers: corsHeaders },
      );
    }

    const { data: creator } = await createServiceClient()
      .from('profiles')
      .select('username')
      .eq('id', profile.community_entry_creator_id!)
      .maybeSingle();

    const welcomeUsername = creator?.username ?? null;

    return NextResponse.json(
      {
        success: true,
        needsWelcome: !!welcomeUsername,
        welcomeUsername,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[community-welcome-status]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
