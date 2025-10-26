import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

interface CancelEventRequest {
  eventId: string;
  cancellationReason: 'force_majeure' | 'organizer_emergency' | 'venue_issues' | 'low_attendance' | 'artist_cancellation';
}

interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
  purchaseId: string;
  amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: CancelEventRequest = await request.json();
    const { eventId, cancellationReason } = body;

    console.log('🎫 Processing event cancellation:', { eventId, cancellationReason });

    const supabase = createServiceClient();

    // 1. Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify user is the event organizer
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('creator_id, title, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('❌ Event not found:', eventError);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.creator_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized - Not event organizer' }, { status: 403 });
    }

    if (event.status === 'cancelled') {
      return NextResponse.json({ error: 'Event already cancelled' }, { status: 400 });
    }

    // 3. Update event status to cancelled
    const { error: updateError } = await supabase
      .from('events')
      .update({
        status: 'cancelled',
        cancellation_reason: cancellationReason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id
      })
      .eq('id', eventId);

    if (updateError) {
      console.error('❌ Error updating event:', updateError);
      throw updateError;
    }

    console.log('✅ Event status updated to cancelled');

    // 4. Get all completed ticket purchases for this event
    const { data: purchases, error: purchasesError } = await supabase
      .from('ticket_purchases')
      .select(`
        id,
        event_id,
        user_id,
        buyer_email,
        buyer_name,
        stripe_payment_intent_id,
        amount_paid,
        quantity,
        status
      `)
      .eq('event_id', eventId)
      .eq('status', 'completed');

    if (purchasesError) {
      console.error('❌ Error fetching purchases:', purchasesError);
      throw purchasesError;
    }

    console.log(`📊 Found ${purchases?.length || 0} ticket purchases to refund`);

    if (!purchases || purchases.length === 0) {
      return NextResponse.json({
        success: true,
        totalRefunds: 0,
        successfulRefunds: 0,
        failedRefunds: 0,
        errors: [],
        message: 'Event cancelled successfully with no tickets to refund'
      });
    }

    // 5. Process refunds via Stripe
    console.log('💳 Processing refunds via Stripe...');
    const refundResults = await Promise.allSettled(
      purchases.map(purchase => processSingleRefund(purchase, cancellationReason, supabase))
    );

    // 6. Analyze results
    const successful: RefundResult[] = [];
    const failed: RefundResult[] = [];

    refundResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successful.push(result.value);
      } else {
        const purchase = purchases[index];
        failed.push({
          success: false,
          error: result.status === 'rejected' ? result.reason.message : result.value.error,
          purchaseId: purchase.id,
          amount: purchase.amount_paid
        });
      }
    });

    console.log(`✅ Refund processing complete: ${successful.length} successful, ${failed.length} failed`);

    // 7. Send email notifications to attendees
    try {
      await sendCancellationNotifications(eventId, event.title, cancellationReason, supabase);
      console.log('📧 Cancellation notifications sent');
    } catch (emailError) {
      console.error('❌ Error sending notifications:', emailError);
      // Don't fail the request if emails fail
    }

    return NextResponse.json({
      success: failed.length === 0,
      totalRefunds: purchases.length,
      successfulRefunds: successful.length,
      failedRefunds: failed.length,
      errors: failed.map(f => f.error),
      refundDetails: {
        successful: successful.map(s => ({ purchaseId: s.purchaseId, refundId: s.refundId, amount: s.amount })),
        failed: failed.map(f => ({ purchaseId: f.purchaseId, error: f.error, amount: f.amount }))
      }
    });

  } catch (error) {
    console.error('❌ Event cancellation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cancel event and process refunds',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

async function processSingleRefund(
  purchase: any, 
  cancellationReason: string,
  supabase: any
): Promise<RefundResult> {
  try {
    console.log(`💳 Processing refund for purchase ${purchase.id}...`);

    // Mark as processing
    await supabase
      .from('ticket_purchases')
      .update({ status: 'refund_processing' })
      .eq('id', purchase.id);

    // Create refund via Stripe
    const refund = await stripe.refunds.create({
      payment_intent: purchase.stripe_payment_intent_id,
      amount: Math.round(purchase.amount_paid * 100), // Convert to cents
      reason: 'requested_by_customer',
      metadata: {
        event_id: purchase.event_id,
        purchase_id: purchase.id,
        buyer_email: purchase.buyer_email,
        cancellation_reason: cancellationReason,
        refund_source: 'event_cancellation'
      }
    });

    console.log(`✅ Stripe refund created: ${refund.id}`);

    // Update database with refund details
    const { error: updateError } = await supabase
      .from('ticket_purchases')
      .update({
        status: 'refunded',
        refund_id: refund.id,
        refunded_at: new Date().toISOString(),
        refund_amount: purchase.amount_paid,
        refund_reason: cancellationReason,
        refund_error: null // Clear any previous errors
      })
      .eq('id', purchase.id);

    if (updateError) {
      console.error(`❌ Error updating purchase ${purchase.id}:`, updateError);
      throw updateError;
    }

    return { 
      success: true, 
      refundId: refund.id,
      purchaseId: purchase.id,
      amount: purchase.amount_paid
    };

  } catch (error) {
    console.error(`❌ Refund failed for purchase ${purchase.id}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Mark as failed in database
    await supabase
      .from('ticket_purchases')
      .update({
        status: 'refund_failed',
        refund_error: errorMessage
      })
      .eq('id', purchase.id);

    return { 
      success: false, 
      error: errorMessage,
      purchaseId: purchase.id,
      amount: purchase.amount_paid
    };
  }
}

async function sendCancellationNotifications(
  eventId: string, 
  eventTitle: string, 
  reason: string,
  supabase: any
) {
  // Get all attendees with their purchase details
  const { data: attendees, error } = await supabase
    .from('ticket_purchases')
    .select(`
      id,
      buyer_email,
      buyer_name,
      amount_paid,
      quantity,
      refund_id,
      status
    `)
    .eq('event_id', eventId)
    .in('status', ['refunded', 'refund_processing']);

  if (error || !attendees) {
    console.error('Error fetching attendees for notifications:', error);
    return;
  }

  console.log(`📧 Sending cancellation emails to ${attendees.length} attendees...`);

  // Import email service
  const { ticketEmailService } = await import('@/src/services/TicketEmailService');

  // Send email to each attendee
  for (const attendee of attendees) {
    try {
      await ticketEmailService.sendEventCancellationEmail({
        to: attendee.buyer_email,
        name: attendee.buyer_name,
        eventTitle,
        refundAmount: attendee.amount_paid,
        ticketQuantity: attendee.quantity,
        reason,
        refundStatus: attendee.status
      });
      
      console.log(`✅ Sent cancellation email to ${attendee.buyer_email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send email to ${attendee.buyer_email}:`, emailError);
      // Continue with other emails even if one fails
    }
  }
}

// GET endpoint to check refund status for an event
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get refund statistics for the event
    const { data, error } = await supabase
      .from('event_refund_statistics')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error) {
      console.error('Error fetching refund statistics:', error);
      return NextResponse.json({ error: 'Failed to fetch refund statistics' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Error in GET /api/events/cancel-and-refund:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

