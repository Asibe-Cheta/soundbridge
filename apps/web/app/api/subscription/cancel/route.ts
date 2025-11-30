import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const supabaseAdmin = createServiceClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestRefund = false, selectedTrackIds = [] } = body;

    // Get active subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('tier', 'pro')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ error: 'No active Pro subscription found' }, { status: 404 });
    }

    // Check if within 7-day money-back guarantee window
    const { data: withinGuarantee } = await supabaseAdmin
      .rpc('is_within_money_back_guarantee', { p_user_id: user.id });

    const isWithinGuarantee = withinGuarantee === true;
    const canRequestRefund = isWithinGuarantee && subscription.money_back_guarantee_eligible;

    // If refund requested and eligible
    if (requestRefund && canRequestRefund) {
      // Check if user has more than 3 tracks
      const { data: tracks, error: tracksError } = await supabase
        .from('audio_tracks')
        .select('id, title')
        .eq('creator_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (tracksError) {
        console.error('Error fetching tracks:', tracksError);
        return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 });
      }

      const trackCount = tracks?.length || 0;
      const needsTrackSelection = trackCount > 3;

      // If user needs to select tracks but hasn't provided selection
      if (needsTrackSelection && (!selectedTrackIds || selectedTrackIds.length !== 3)) {
        return NextResponse.json({
          success: false,
          requiresTrackSelection: true,
          tracks: tracks,
          message: `You have ${trackCount} tracks. Please select 3 tracks to keep public when downgrading to Free tier.`
        }, { status: 200 });
      }

      // Process refund (this will be handled by Stripe webhook, but we prepare the data)
      // For now, we'll mark subscription as cancelled and handle refund via webhook
      // The actual refund processing should be done via Stripe API in a separate endpoint

      return NextResponse.json({
        success: true,
        refundRequested: true,
        message: 'Refund request received. Processing refund and downgrading account...',
        nextStep: 'process_refund' // Frontend should call refund processing endpoint
      });
    }

    // Standard cancellation (outside 7-day window or no refund requested)
    const now = new Date();
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'cancelled',
        subscription_ends_at: subscription.subscription_ends_at || now.toISOString()
      })
      .eq('id', subscription.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error cancelling subscription:', updateError);
      return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        subscription: updatedSubscription,
        refundEligible: canRequestRefund,
        message: isWithinGuarantee 
          ? 'Subscription cancelled. You can request a refund within 7 days of your subscription start date.'
          : 'Subscription cancelled successfully. You still have access to premium features until the end of your billing period.'
      }
    });

  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
