/**
 * GET /api/profile/headline - Get user's professional headline
 * PUT /api/profile/headline - Update user's professional headline
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('👤 Get Profile Headline API called');

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, professional_headline')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile', details: profileError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          headline: profile?.professional_headline || null,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error fetching headline:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('✏️ Update Profile Headline API called');

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { headline } = body;

    // Validation
    if (headline !== null && headline !== undefined) {
      if (typeof headline !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Headline must be a string' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (headline.trim().length > 120) {
        return NextResponse.json(
          { success: false, error: 'Headline must be 120 characters or less' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        professional_headline: headline ? headline.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, professional_headline')
      .single();

    if (updateError) {
      console.error('❌ Error updating headline:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update headline', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Headline updated successfully');

    return NextResponse.json(
      {
        success: true,
        data: {
          headline: updatedProfile?.professional_headline || null,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error updating headline:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

