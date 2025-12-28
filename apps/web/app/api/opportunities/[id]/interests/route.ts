import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { isServiceProvider, isSubscriber } from '@/src/lib/opportunities-utils';
import { opportunityNotifications } from '@/src/lib/notifications-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * POST /api/opportunities/:id/interests
 * Express interest in an opportunity (service providers only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: opportunityId } = await params;
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if user is a service provider
    const serviceSupabase = createServiceClient();
    if (!(await isServiceProvider(serviceSupabase, user.id))) {
      return NextResponse.json(
        { error: 'Only service providers can express interest' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Get opportunity details
    const { data: opportunity, error: oppError } = await serviceSupabase
      .from('opportunities')
      .select('*, posted_by:profiles!poster_user_id(*)')
      .eq('id', opportunityId)
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if opportunity is active
    if (opportunity.status !== 'active' || opportunity.deleted_at) {
      return NextResponse.json(
        { error: 'This opportunity is no longer available' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Prevent expressing interest in own opportunity
    if (opportunity.poster_user_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot express interest in your own opportunity' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { reason, message, enable_alerts } = body;

    if (!reason || !['perfect_fit', 'interested', 'learn_more', 'available'].includes(reason)) {
      return NextResponse.json(
        { error: 'Valid reason is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (message && message.length > 500) {
      return NextResponse.json(
        { error: 'Message must be 500 characters or less' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create interest (using service client to handle RLS)
    const { data: interest, error: interestError } = await serviceSupabase
      .from('opportunity_interests')
      .insert({
        opportunity_id: opportunityId,
        interested_user_id: user.id,
        poster_user_id: opportunity.poster_user_id,
        reason,
        message: message || null,
        status: 'pending',
      })
      .select()
      .single();

    if (interestError) {
      // Check if it's a duplicate
      if (interestError.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'You have already expressed interest in this opportunity' },
          { status: 409, headers: corsHeaders }
        );
      }
      console.error('Error creating interest:', interestError);
      return NextResponse.json(
        { error: 'Failed to express interest', details: interestError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get current user's display name for notification
    const { data: currentUserProfile } = await serviceSupabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    const interestedUserName = currentUserProfile?.display_name || 'Someone';

    // Send notification to poster
    await opportunityNotifications.interestReceived(
      opportunity.poster_user_id,
      interestedUserName,
      opportunity.title,
      interest.id,
      opportunityId
    );

    // Create alert if requested (subscribers only)
    let alertCreated = false;
    if (enable_alerts) {
      if (await isSubscriber(serviceSupabase, user.id)) {
        const { error: alertError } = await serviceSupabase
          .from('opportunity_alerts')
          .insert({
            user_id: user.id,
            created_from_opportunity_id: opportunityId,
            keywords: opportunity.keywords || [],
            categories: [opportunity.type],
            location: opportunity.location,
            enabled: true,
          });

        alertCreated = !alertError;
      }
    }

    return NextResponse.json(
      {
        interest,
        alert_created: alertCreated,
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/opportunities/:id/interests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/opportunities/:id/interests
 * Get all interests for an opportunity (poster only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: opportunityId } = await params;
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify user is the poster
    const serviceSupabase = createServiceClient();
    const { data: opportunity, error: oppError } = await serviceSupabase
      .from('opportunities')
      .select('poster_user_id')
      .eq('id', opportunityId)
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (opportunity.poster_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the poster can view interests' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Get interests
    const { data: interests, error: interestsError } = await serviceSupabase
      .from('opportunity_interests')
      .select(`
        *,
        interested_user:profiles!interested_user_id(
          id,
          username,
          display_name,
          avatar_url,
          headline,
          location
        )
      `)
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false });

    if (interestsError) {
      console.error('Error fetching interests:', interestsError);
      return NextResponse.json(
        { error: 'Failed to fetch interests', details: interestsError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ interests: interests || [] }, { headers: corsHeaders });
  } catch (error) {
    console.error('Unexpected error in GET /api/opportunities/:id/interests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

