import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
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
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (profile.role === 'creator') {
      return NextResponse.json(
        {
          success: true,
          message: 'You are already a creator!',
          user: {
            id: profile.id,
            role: profile.role,
            subscription_tier: profile.subscription_tier || 'free',
          },
        },
        { headers: corsHeaders }
      );
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'creator',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, role, subscription_tier')
      .single();

    if (updateError || !updatedProfile) {
      return NextResponse.json(
        { success: false, error: 'Failed to update role' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'You are now a creator!',
        user: {
          id: updatedProfile.id,
          role: updatedProfile.role,
          subscription_tier: updatedProfile.subscription_tier || 'free',
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Become creator API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
