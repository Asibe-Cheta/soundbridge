import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { opportunityNotifications } from '@/src/lib/notifications-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * PATCH /api/interests/:id/accept
 * Accept an interest (poster only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interestId } = await params;
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { custom_message } = body;

    if (!custom_message || typeof custom_message !== 'string' || custom_message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Custom message is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (custom_message.length > 1000) {
      return NextResponse.json(
        { error: 'Custom message must be 1000 characters or less' },
        { status: 400, headers: corsHeaders }
      );
    }

    const serviceSupabase = createServiceClient();

    // Get interest with related data
    const { data: interest, error: fetchError } = await serviceSupabase
      .from('opportunity_interests')
      .select(`
        *,
        interested_user:profiles!interested_user_id(*),
        opportunity:opportunities(*)
      `)
      .eq('id', interestId)
      .single();

    if (fetchError || !interest) {
      return NextResponse.json(
        { error: 'Interest not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify user is the poster
    if (interest.poster_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the poster can accept interests' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Check if already accepted/rejected
    if (interest.status !== 'pending') {
      return NextResponse.json(
        { error: `This interest has already been ${interest.status}` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Update interest status
    const { data: updatedInterest, error: updateError } = await serviceSupabase
      .from('opportunity_interests')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        custom_message: custom_message.trim(),
      })
      .eq('id', interestId)
      .select(`
        *,
        interested_user:profiles!interested_user_id(*),
        opportunity:opportunities(*)
      `)
      .single();

    if (updateError) {
      console.error('Error accepting interest:', updateError);
      return NextResponse.json(
        { error: 'Failed to accept interest', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get current user's display name for notification
    const { data: currentUserProfile } = await serviceSupabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    const posterName = currentUserProfile?.display_name || 'Someone';

    // Send notification to interested user
    await opportunityNotifications.interestAccepted(
      interest.interested_user_id,
      posterName,
      interest.opportunity.title,
      interestId,
      interest.opportunity_id
    );

    return NextResponse.json({ interest: updatedInterest }, { headers: corsHeaders });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/interests/:id/accept:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

