import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { stripe } from '@/src/lib/stripe';

interface CancelEventRequest {
  cancellationReason?: string;
}

interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
  ticketId: string;
  ticketCode: string;
  amount: number;
  currency: string;
}

/**
 * POST /api/events/[id]/cancel
 * Cancel an event and process refunds for all purchased tickets
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const resolvedParams = await params;
    const eventId = resolvedParams.id;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CancelEventRequest = await request.json();
    const cancellationReason = body.cancellationReason || 'Event cancelled by organizer';

    console.log('🎫 Processing event cancellation:', { eventId, cancellationReason, userId: user.id });

    // Verify user is the event organizer
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, creator_id, title, status, event_date')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('❌ Event not found:', eventError);
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (event.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Not event organizer' },
        { status: 403 }
      );
    }

    if (event.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Event already cancelled' },
        { status: 400 }
      );
    }

    // Use service role client for operations (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update event status to cancelled
    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update({
        status: 'cancelled',
        cancellation_reason: cancellationReason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id
      })
      .eq('id', eventId);

    if (updateError) {
      console.error('❌ Error updating event status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update event status', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Event status updated to cancelled');

    // Get all active/used tickets for this event
    const { data: purchasedTickets, error: ticketsError } = await supabaseAdmin
      .from('purchased_event_tickets')
      .select(`
        id,
        ticket_code,
        payment_intent_id,
        amount_paid,
        currency,
        status,
        user_id,
        user:profiles!purchased_event_tickets_user_id_fkey(
          id,
          email,
          display_name
        )
      `)
      .eq('event_id', eventId)
      .in('status', ['active', 'used']);

    if (ticketsError) {
      console.error('❌ Error fetching purchased tickets:', ticketsError);
      return NextResponse.json(
        { error: 'Failed to fetch purchased tickets', details: ticketsError.message },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${purchasedTickets?.length || 0} tickets to refund`);

    // If no tickets to refund, return success
    if (!purchasedTickets || purchasedTickets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Event cancelled successfully with no tickets to refund',
        eventId: eventId,
        refunds: {
          total: 0,
          successful: 0,
          failed: 0,
          refunded: [],
          failed: []
        }
      });
    }

    // Check if Stripe is configured
    if (!stripe) {
      console.error('❌ Stripe not configured');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    // Process refunds via Stripe
    console.log('💳 Processing refunds via Stripe...');
    const refundResults = await Promise.allSettled(
      purchasedTickets.map((ticket: any) =>
        processSingleRefund(ticket, cancellationReason, supabaseAdmin)
      )
    );

    // Analyze results
    const successful: RefundResult[] = [];
    const failed: RefundResult[] = [];

    refundResults.forEach((result: any, index: number) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successful.push(result.value);
      } else {
        const ticket = purchasedTickets[index];
        failed.push({
          success: false,
          error: result.status === 'rejected' ? result.reason.message : result.value.error,
          ticketId: ticket.id,
          ticketCode: ticket.ticket_code,
          amount: ticket.amount_paid,
          currency: ticket.currency
        });
      }
    });

    console.log(`✅ Refund processing complete: ${successful.length} successful, ${failed.length} failed`);

    // Send cancellation notifications (don't fail if emails fail)
    try {
      await sendCancellationNotifications(
        eventId,
        event.title,
        event.event_date,
        cancellationReason,
        purchasedTickets,
        successful,
        supabaseAdmin
      );
      console.log('📧 Cancellation notifications sent');
    } catch (emailError) {
      console.error('❌ Error sending notifications:', emailError);
      // Don't fail the request if emails fail
    }

    return NextResponse.json({
      success: failed.length === 0,
      message: failed.length === 0
        ? 'Event cancelled and all refunds processed successfully'
        : `Event cancelled with ${successful.length} successful refunds and ${failed.length} failed refunds`,
      eventId: eventId,
      refunds: {
        total: purchasedTickets.length,
        successful: successful.length,
        failed: failed.length,
        refunded: successful.map(s => ({
          ticketId: s.ticketId,
          ticketCode: s.ticketCode,
          refundId: s.refundId,
          amount: s.amount,
          currency: s.currency
        })),
        failures: failed.map(f => ({
          ticketId: f.ticketId,
          ticketCode: f.ticketCode,
          error: f.error,
          amount: f.amount,
          currency: f.currency
        }))
      }
    });

  } catch (error: any) {
    console.error('❌ Event cancellation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel event and process refunds',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Process a single ticket refund via Stripe
 */
async function processSingleRefund(
  ticket: any,
  cancellationReason: string,
  supabase: any
): Promise<RefundResult> {
  try {
    console.log(`💳 Processing refund for ticket ${ticket.ticket_code}...`);

    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    // Retrieve payment intent from Stripe to check status
    const paymentIntent = await stripe.paymentIntents.retrieve(ticket.payment_intent_id);

    // Only refund if payment was successful
    if (paymentIntent.status !== 'succeeded') {
      console.log(`⚠️ Skipping refund for ticket ${ticket.ticket_code} - payment status: ${paymentIntent.status}`);

      // Mark ticket as cancelled (not refunded since payment didn't succeed)
      await supabase
        .from('purchased_event_tickets')
        .update({
          status: 'cancelled',
          refund_reason: 'Payment not successful',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id);

      return {
        success: true,
        ticketId: ticket.id,
        ticketCode: ticket.ticket_code,
        amount: ticket.amount_paid,
        currency: ticket.currency,
        error: `Payment status: ${paymentIntent.status} - no refund needed`
      };
    }

    // Create refund via Stripe
    const refund = await stripe.refunds.create({
      payment_intent: ticket.payment_intent_id,
      amount: ticket.amount_paid, // Amount in smallest currency unit (already stored correctly)
      reason: 'requested_by_customer',
      metadata: {
        event_id: ticket.event_id,
        ticket_id: ticket.id,
        ticket_code: ticket.ticket_code,
        cancellation_reason: cancellationReason,
        cancelled_by: ticket.user_id
      }
    });

    console.log(`✅ Stripe refund created: ${refund.id}`);

    // Update ticket status in database
    const { error: updateError } = await supabase
      .from('purchased_event_tickets')
      .update({
        status: 'refunded',
        refund_id: refund.id,
        refunded_at: new Date().toISOString(),
        refund_amount: ticket.amount_paid,
        refund_reason: cancellationReason,
        metadata: {
          refund_id: refund.id,
          refunded_at: new Date().toISOString(),
          refund_status: refund.status,
          cancellation_reason: cancellationReason
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', ticket.id);

    if (updateError) {
      console.error(`❌ Error updating ticket ${ticket.id}:`, updateError);
      // Continue anyway - refund was created
    }

    return {
      success: true,
      refundId: refund.id,
      ticketId: ticket.id,
      ticketCode: ticket.ticket_code,
      amount: ticket.amount_paid,
      currency: ticket.currency
    };

  } catch (error: any) {
    console.error(`❌ Refund failed for ticket ${ticket.ticket_code}:`, error);

    const errorMessage = error.message || 'Unknown error';

    // Mark ticket refund as failed in database
    await supabase
      .from('purchased_event_tickets')
      .update({
        status: 'cancelled', // Mark as cancelled since refund failed
        refund_reason: `Failed: ${errorMessage}`,
        metadata: {
          refund_error: errorMessage,
          refund_attempted_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', ticket.id);

    return {
      success: false,
      error: errorMessage,
      ticketId: ticket.id,
      ticketCode: ticket.ticket_code,
      amount: ticket.amount_paid,
      currency: ticket.currency
    };
  }
}

/**
 * Send cancellation notification emails to all ticket purchasers
 */
async function sendCancellationNotifications(
  eventId: string,
  eventTitle: string,
  eventDate: string,
  cancellationReason: string,
  tickets: any[],
  successfulRefunds: RefundResult[],
  supabase: any
) {
  // Group tickets by user to send one email per user
  const ticketsByUser = new Map<string, any[]>();

  for (const ticket of tickets) {
    const userId = ticket.user_id;
    if (!ticketsByUser.has(userId)) {
      ticketsByUser.set(userId, []);
    }
    ticketsByUser.get(userId)!.push(ticket);
  }

  console.log(`📧 Sending cancellation emails to ${ticketsByUser.size} users...`);

  // Dynamically import email service to avoid circular dependencies
  try {
    const { SubscriptionEmailService } = await import('@/src/services/SubscriptionEmailService');

    for (const [userId, userTickets] of ticketsByUser.entries()) {
      try {
        const user = userTickets[0].user;
        const userRefunds = successfulRefunds.filter(r =>
          userTickets.some(t => t.id === r.ticketId)
        );

        if (!user?.email) {
          console.warn(`⚠️ No email found for user ${userId}`);
          continue;
        }

        // Calculate total refund amount for this user
        const totalRefundAmount = userRefunds.reduce((sum, r) => sum + r.amount, 0);
        const currency = userTickets[0].currency;

        // Format currency
        const formattedAmount = currency === 'GBP'
          ? `£${(totalRefundAmount / 100).toFixed(2)}`
          : `₦${(totalRefundAmount / 100).toLocaleString()}`;

        // Send email
        await SubscriptionEmailService.sendEventCancellation({
          userEmail: user.email,
          userName: user.display_name || 'Valued Customer',
          eventTitle,
          eventDate,
          ticketCodes: userTickets.map(t => t.ticket_code),
          refundAmount: formattedAmount,
          cancellationReason
        });

        console.log(`✅ Sent cancellation email to ${user.email}`);

      } catch (emailError) {
        console.error(`❌ Failed to send email to user ${userId}:`, emailError);
        // Continue with other emails
      }
    }
  } catch (importError) {
    console.error('❌ Failed to import email service:', importError);
  }
}
