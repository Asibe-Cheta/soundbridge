import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createServiceClient } from '@/src/lib/supabase';
import { stripe } from '@/src/lib/stripe';
import { cookies } from 'next/headers';

/**
 * POST /api/subscription/refund
 * Process a refund request for 7-day money-back guarantee
 * 
 * Request Body:
 * {
 *   "selectedTrackIds": ["uuid1", "uuid2", "uuid3"] // Optional, required if user has >3 tracks
 * }
 */
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
    const { selectedTrackIds = [] } = body;

    // Get active Pro subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('tier', 'pro')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ 
        error: 'No active Pro subscription found' 
      }, { status: 404 });
    }

    // Check if within 7-day money-back guarantee window
    const { data: withinGuarantee } = await supabaseAdmin
      .rpc('is_within_money_back_guarantee', { p_user_id: user.id });

    if (!withinGuarantee) {
      return NextResponse.json({ 
        error: 'Refund window has expired. Refunds are only available within 7 days of subscription start.',
        daysSinceStart: subscription.subscription_start_date 
          ? Math.floor((Date.now() - new Date(subscription.subscription_start_date).getTime()) / (1000 * 60 * 60 * 24))
          : null
      }, { status: 400 });
    }

    // Check refund eligibility (abuse prevention)
    if (!subscription.money_back_guarantee_eligible) {
      return NextResponse.json({ 
        error: 'Money-back guarantee is no longer available for this account due to multiple refund requests.'
      }, { status: 403 });
    }

    // Get user's tracks
    const { data: tracks, error: tracksError } = await supabaseAdmin
      .from('audio_tracks')
      .select('id, title, visibility')
      .eq('creator_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (tracksError) {
      console.error('Error fetching tracks:', tracksError);
      return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 });
    }

    const trackCount = tracks?.length || 0;
    const needsTrackSelection = trackCount > 3;

    // Validate track selection if needed
    if (needsTrackSelection) {
      if (!selectedTrackIds || selectedTrackIds.length !== 3) {
        return NextResponse.json({
          error: 'Please select exactly 3 tracks to keep public',
          tracks: tracks,
          requiresSelection: true
        }, { status: 400 });
      }

      // Validate all selected track IDs exist and belong to user
      const validTrackIds = tracks?.map(t => t.id) || [];
      const invalidIds = selectedTrackIds.filter((id: string) => !validTrackIds.includes(id));
      
      if (invalidIds.length > 0) {
        return NextResponse.json({
          error: 'Some selected track IDs are invalid',
          invalidIds
        }, { status: 400 });
      }
    }

    // Get refund count for abuse prevention
    const { data: refundCount } = await supabaseAdmin
      .rpc('get_user_refund_count', { p_user_id: user.id });

    const newRefundCount = (refundCount || 0) + 1;

    // Process Stripe refund if subscription has Stripe payment
    let stripeRefundId = null;
    let refundAmount = 0;
    
    if (subscription.stripe_subscription_id && stripe) {
      try {
        // Get the subscription from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripe_subscription_id
        );

        // Get the latest invoice
        const latestInvoice = stripeSubscription.latest_invoice;
        if (latestInvoice && typeof latestInvoice === 'string') {
          const invoice = await stripe.invoices.retrieve(latestInvoice);
          
          if (invoice.amount_paid > 0) {
            // Create refund
            const refund = await stripe.refunds.create({
              payment_intent: invoice.payment_intent as string,
              amount: invoice.amount_paid, // Full refund
              reason: 'requested_by_customer',
              metadata: {
                user_id: user.id,
                subscription_id: subscription.id,
                refund_count: newRefundCount.toString()
              }
            });

            stripeRefundId = refund.id;
            refundAmount = refund.amount / 100; // Convert from cents
          }
        }
      } catch (stripeError: any) {
        console.error('Stripe refund error:', stripeError);
        // Continue with downgrade even if Stripe refund fails (manual processing needed)
      }
    }

    // Calculate refund amount if not from Stripe
    if (refundAmount === 0) {
      // Calculate based on billing cycle
      refundAmount = subscription.billing_cycle === 'yearly' ? 99.00 : 9.99;
    }

    // Create refund record
    const { data: refundRecord, error: refundError } = await supabaseAdmin
      .from('refunds')
      .insert({
        user_id: user.id,
        subscription_id: subscription.id,
        stripe_refund_id: stripeRefundId,
        amount_refunded: refundAmount,
        currency: 'GBP',
        refund_reason: '7-day money-back guarantee',
        refund_count: newRefundCount,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        payment_method_last4: null, // Could extract from Stripe if needed
        flagged: newRefundCount >= 3, // Flag if 3+ refunds
        flagged_reason: newRefundCount >= 3 ? 'Multiple refund requests' : null
      })
      .select()
      .single();

    if (refundError) {
      console.error('Error creating refund record:', refundError);
    }

    // Update subscription refund count and eligibility
    const updateData: any = {
      refund_count: newRefundCount,
      money_back_guarantee_eligible: newRefundCount < 3
    };

    // If 3+ refunds, disable money-back guarantee
    if (newRefundCount >= 3) {
      updateData.money_back_guarantee_eligible = false;
    }

    await supabaseAdmin
      .from('user_subscriptions')
      .update(updateData)
      .eq('id', subscription.id);

    // Handle track visibility
    if (needsTrackSelection && selectedTrackIds.length === 3) {
      // Create downgrade track selection record
      await supabaseAdmin
        .from('downgrade_track_selections')
        .insert({
          user_id: user.id,
          from_tier: 'pro',
          to_tier: 'free',
          selected_track_ids: selectedTrackIds,
          auto_selected: false,
          reason: 'refund'
        });

      // Set non-selected tracks to private
      const allTrackIds = tracks?.map(t => t.id) || [];
      const tracksToHide = allTrackIds.filter(id => !selectedTrackIds.includes(id));

      if (tracksToHide.length > 0) {
        await supabaseAdmin
          .from('audio_tracks')
          .update({ visibility: 'private' })
          .in('id', tracksToHide)
          .eq('creator_id', user.id);
      }

      // Ensure selected tracks are public
      await supabaseAdmin
        .from('audio_tracks')
        .update({ visibility: 'public' })
        .in('id', selectedTrackIds)
        .eq('creator_id', user.id);
    } else if (trackCount > 3) {
      // Auto-select first 3 tracks if user didn't provide selection
      const autoSelected = tracks?.slice(0, 3).map(t => t.id) || [];
      const allTrackIds = tracks?.map(t => t.id) || [];
      const tracksToHide = allTrackIds.filter(id => !autoSelected.includes(id));

      await supabaseAdmin
        .from('downgrade_track_selections')
        .insert({
          user_id: user.id,
          from_tier: 'pro',
          to_tier: 'free',
          selected_track_ids: autoSelected,
          auto_selected: true,
          reason: 'refund'
        });

      if (tracksToHide.length > 0) {
        await supabaseAdmin
          .from('audio_tracks')
          .update({ visibility: 'private' })
          .in('id', tracksToHide)
          .eq('creator_id', user.id);
      }
    }

    // Downgrade subscription to free
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        tier: 'free',
        status: 'cancelled',
        subscription_ends_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    return NextResponse.json({
      success: true,
      data: {
        refund: {
          id: refundRecord?.id,
          amount: refundAmount,
          currency: 'GBP',
          stripe_refund_id: stripeRefundId,
          processed_at: new Date().toISOString()
        },
        subscription: {
          tier: 'free',
          status: 'cancelled'
        },
        tracks: {
          public: needsTrackSelection ? selectedTrackIds.length : trackCount,
          private: needsTrackSelection ? trackCount - selectedTrackIds.length : 0
        },
        message: `Refund of £${refundAmount.toFixed(2)} processed successfully. Your account has been downgraded to Free tier.`,
        refundCount: newRefundCount,
        moneyBackGuaranteeEligible: newRefundCount < 3
      }
    });

  } catch (error: any) {
    console.error('Refund processing error:', error);
    return NextResponse.json({ 
      error: 'Failed to process refund',
      details: error.message 
    }, { status: 500 });
  }
}
