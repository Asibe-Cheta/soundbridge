import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { resolveProfileRole } from '@/src/lib/onboarding-role';
import {
  applyCommunityEntryAttribution,
  COMMUNITY_ENTRY_CREATOR_ID_COOKIE,
  COMMUNITY_ENTRY_CREATOR_USERNAME_COOKIE,
} from '@/src/lib/community-entry';
import {
  PARTNER_REFERRAL_COOKIE,
  PARTNER_SOURCE_COOKIE,
  processPartnerAttributionForAuthUser,
} from '@/src/lib/partner-referrals';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { userId } = body as { userId?: string };

    if (!userId || userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400, headers: corsHeaders },
      );
    }

    const cookieStore = await cookies();
    const referralCodeCookie = cookieStore.get(PARTNER_REFERRAL_COOKIE)?.value ?? null;
    const signupSourceCookie = cookieStore.get(PARTNER_SOURCE_COOKIE)?.value ?? null;
    const fanCreatorUsername =
      cookieStore.get(COMMUNITY_ENTRY_CREATOR_USERNAME_COOKIE)?.value?.trim().toLowerCase() || null;
    const fanCreatorId = cookieStore.get(COMMUNITY_ENTRY_CREATOR_ID_COOKIE)?.value?.trim() || null;

    await processPartnerAttributionForAuthUser(createServiceClient(), user, {
      referralCode: referralCodeCookie,
      source: signupSourceCookie,
    });

    const service = createServiceClient();
    const { creatorUsername } = await applyCommunityEntryAttribution(service, user.id, {
      creatorId: fanCreatorId,
      creatorUsername: fanCreatorUsername,
      signupSource: signupSourceCookie,
    });

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('onboarding_user_type, role, selected_role')
      .eq('id', user.id)
      .maybeSingle();

    const syncedRole = resolveProfileRole({
      onboardingUserType: existingProfile?.onboarding_user_type,
      selectedRole: existingProfile?.selected_role,
    });

    const updateData: Record<string, string | boolean> = {
      onboarding_completed: true,
      onboarding_step: 'completed',
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (syncedRole) {
      updateData.role = syncedRole;
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select('community_entry_creator_id, community_entry_shown_at')
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to complete onboarding', details: updateError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    let welcomeUsername = creatorUsername;
    if (!welcomeUsername && updatedProfile?.community_entry_creator_id) {
      const { data: creator } = await service
        .from('profiles')
        .select('username')
        .eq('id', updatedProfile.community_entry_creator_id)
        .maybeSingle();
      welcomeUsername = creator?.username ?? null;
    }

    const needsWelcome =
      !!updatedProfile?.community_entry_creator_id && !updatedProfile?.community_entry_shown_at;

    const response = NextResponse.json(
      {
        success: true,
        message: 'Onboarding completed successfully',
        welcomeUsername: needsWelcome ? welcomeUsername : null,
      },
      { headers: corsHeaders },
    );

    for (const name of [
      PARTNER_REFERRAL_COOKIE,
      PARTNER_SOURCE_COOKIE,
      COMMUNITY_ENTRY_CREATOR_USERNAME_COOKIE,
      COMMUNITY_ENTRY_CREATOR_ID_COOKIE,
    ]) {
      response.cookies.set(name, '', { path: '/', maxAge: 0, sameSite: 'lax' });
    }

    return response;
  } catch (error: unknown) {
    console.error('[complete-onboarding]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
