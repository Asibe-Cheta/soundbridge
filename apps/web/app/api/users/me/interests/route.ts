import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * GET /api/users/me/interests
 * Get current user's interest applications
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status'); // 'pending' | 'accepted' | 'rejected'

    const serviceSupabase = createServiceClient();
    let query = serviceSupabase
      .from('opportunity_interests')
      .select(`
        *,
        opportunity:opportunities(
          id,
          title,
          type,
          location
        ),
        poster:profiles!poster_user_id(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('interested_user_id', user.id);

    if (statusFilter && ['pending', 'accepted', 'rejected'].includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    const { data: interests, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user interests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch interests', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ interests: interests || [] }, { headers: corsHeaders });
  } catch (error) {
    console.error('Unexpected error in GET /api/users/me/interests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

