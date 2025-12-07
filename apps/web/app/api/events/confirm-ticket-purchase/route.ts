import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { stripe } from '@/src/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * POST /api/events/confirm-ticket-purchase
 * Confirm ticket purchase after successful Stripe payment and create ticket records
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { paymentIntentId, eventId, quantity = 1 } = body;

    // Validate required fields
    if (!paymentIntentId || !eventId) {
      return NextResponse.json(
        { error: 'Missing required fields: paymentIntentId, eventId' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Stripe
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Verify payment intent with Stripe first to get amount and currency
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Get amount and currency from payment intent (source of truth)
    const amount = paymentIntent.amount; // Amount in smallest currency unit
    const currency = paymentIntent.currency; // 'gbp' or 'ngn'

    // Check if ticket already exists for this payment intent (idempotency)
    const { data: existingTicket, error: checkError } = await supabase
      .from('purchased_event_tickets')
      .select('id, ticket_code, status, amount_paid')
      .eq('payment_intent_id', paymentIntentId)
      .single();

    if (existingTicket && !checkError) {
      // Ticket already created for this payment intent
      const platformFeeAmount = Math.round(existingTicket.amount_paid * 0.05);
      const organizerAmount = existingTicket.amount_paid - platformFeeAmount;

      return NextResponse.json(
        {
          id: existingTicket.id,
          event_id: eventId,
          user_id: user.id,
          ticket_code: existingTicket.ticket_code,
          quantity: quantity,
          amount_paid: existingTicket.amount_paid,
          currency: currency.toLowerCase(),
          payment_intent_id: paymentIntentId,
          purchase_date: new Date().toISOString(),
          status: existingTicket.status,
          platform_fee_amount: platformFeeAmount,
          organizer_amount: organizerAmount,
        },
        { headers: corsHeaders }
      );
    }

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Payment not confirmed. Status: ${paymentIntent.status}` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify payment intent belongs to authenticated user
    if (paymentIntent.metadata.userId !== user.id) {
      return NextResponse.json(
        { error: 'Payment intent does not belong to authenticated user' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Verify payment intent is for correct event
    if (paymentIntent.metadata.eventId !== eventId) {
      return NextResponse.json(
        { error: 'Payment intent does not match event' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, creator_id, max_attendees, current_attendees')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Use service role client for ticket creation (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate unique ticket codes for each ticket
    const ticketCodes: string[] = [];
    for (let i = 0; i < quantity; i++) {
      const { data: codeData, error: codeError } = await supabaseAdmin.rpc('generate_event_ticket_code');
      if (codeError || !codeData) {
        console.error('Error generating ticket code:', codeError);
        return NextResponse.json(
          { error: 'Failed to generate ticket code' },
          { status: 500, headers: corsHeaders }
        );
      }
      ticketCodes.push(codeData);
    }

    // Calculate fees (5% platform fee, 95% to organizer)
    const platformFeeAmount = Math.round(amount * 0.05);
    const organizerAmount = amount - platformFeeAmount;

    // Create ticket records (one per ticket)
    const ticketRecords = ticketCodes.map((ticketCode) => ({
      event_id: eventId,
      user_id: user.id,
      ticket_code: ticketCode,
      quantity: 1, // Each record represents one ticket
      amount_paid: Math.round(amount / quantity), // Split amount across tickets
      currency: currency.toUpperCase(),
      payment_intent_id: paymentIntentId,
      purchase_date: new Date().toISOString(),
      status: 'active',
      platform_fee_amount: Math.round(platformFeeAmount / quantity),
      organizer_amount: Math.round(organizerAmount / quantity),
    }));

    const { data: createdTickets, error: insertError } = await supabaseAdmin
      .from('purchased_event_tickets')
      .insert(ticketRecords)
      .select();

    if (insertError) {
      console.error('Error creating ticket records:', insertError);
      return NextResponse.json(
        { error: 'Failed to create ticket records', details: insertError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Update event attendee count
    if (event.max_attendees) {
      const { error: updateError } = await supabaseAdmin
        .from('events')
        .update({ 
          current_attendees: (event.current_attendees || 0) + quantity 
        })
        .eq('id', eventId);

      if (updateError) {
        console.error('Error updating event attendee count:', updateError);
        // Don't fail the request, just log the error
      }
    }

    // Return first ticket as response (represents the purchase)
    const ticket = createdTickets[0];

    return NextResponse.json(
      {
        id: ticket.id,
        event_id: ticket.event_id,
        user_id: ticket.user_id,
        ticket_code: ticket.ticket_code,
        quantity: quantity,
        amount_paid: amount,
        currency: currency.toLowerCase(),
        payment_intent_id: ticket.payment_intent_id,
        purchase_date: ticket.purchase_date,
        status: ticket.status,
        platform_fee_amount: platformFeeAmount,
        organizer_amount: organizerAmount,
        // Include all ticket codes for multi-ticket purchases
        all_ticket_codes: ticketCodes,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error confirming ticket purchase:', error);
    return NextResponse.json(
      { 
        error: 'Failed to confirm ticket purchase',
        details: error.message 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
