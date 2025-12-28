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
 * PATCH /api/interests/:id/reject
 * Reject an interest (poster only)
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

    // Parse request body (rejection_reason is optional)
    const body = await request.json();
    const { rejection_reason } = body || {};

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
        { error: 'Only the poster can reject interests' },
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
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: rejection_reason || null,
      })
      .eq('id', interestId)
      .select(`
        *,
        interested_user:profiles!interested_user_id(*),
        opportunity:opportunities(*)
      `)
      .single();

    if (updateError) {
      console.error('Error rejecting interest:', updateError);
      return NextResponse.json(
        { error: 'Failed to reject interest', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Send notification to interested user
    await opportunityNotifications.interestRejected(
      interest.interested_user_id,
      interest.opportunity.title,
      interestId
    );

    return NextResponse.json({ interest: updatedInterest }, { headers: corsHeaders });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/interests/:id/reject:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

