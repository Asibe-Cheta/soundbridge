import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { stripe } from '@/src/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { Expo } from 'expo-server-sdk';
import { getExpoPushClient } from '@/src/lib/expo-push-client';
import { incrementEventTicketSales } from '@/src/lib/event-analytics';
import { linkEventPromotionTicketPurchase } from '@/src/lib/event-promotion-tracking';
import { SubscriptionEmailService } from '@/src/services/SubscriptionEmailService';
import { PLATFORM_FEE_DECIMAL, PLATFORM_FEE_PERCENT } from '@/src/lib/platform-fees';
import { getPaymentIntentPaymentMethodType } from '@/src/lib/stripe-payment-intent-metadata';

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

    // A falsy-but-not-undefined quantity (0, null) skips the `= 1` default above and would
    // otherwise silently produce zero ticket records below, then crash on createdTickets[0]
    // after the charge has already succeeded — turning that into a clear error instead.
    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: `Invalid quantity: ${quantity}` },
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
    const paymentMethodType = await getPaymentIntentPaymentMethodType(stripe, paymentIntent);

    // Get amount and currency from payment intent (source of truth)
    const amountMinor = paymentIntent.amount; // Stripe: smallest currency unit (pence/cents)
    const amountMajor = amountMinor / 100; // Store and use major units (pounds/dollars) in DB
    const currency = paymentIntent.currency; // 'gbp' or 'ngn'

    // Check if ticket already exists for this payment intent (idempotency)
    const { data: existingTicket, error: checkError } = await supabase
      .from('purchased_event_tickets')
      .select('id, ticket_code, status, amount_paid, currency')
      .eq('payment_intent_id', paymentIntentId)
      .single();

    if (existingTicket && !checkError) {
      // Ticket already created for this payment intent (amount_paid stored in major units,
      // in whatever currency was actually stored on the ticket — GHS for GHS purchases,
      // the real charged currency otherwise — not necessarily the PaymentIntent's currency).
      const platformFeeAmount = Math.round((existingTicket.amount_paid * PLATFORM_FEE_DECIMAL) * 100) / 100;
      const organizerAmount = Math.round((existingTicket.amount_paid - platformFeeAmount) * 100) / 100;

      return NextResponse.json(
        {
          id: existingTicket.id,
          event_id: eventId,
          user_id: user.id,
          ticket_code: existingTicket.ticket_code,
          quantity: quantity,
          amount_paid: existingTicket.amount_paid,
          currency: (existingTicket.currency || currency).toLowerCase(),
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

    // Fetch event details including date, location, and venue for email
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, creator_id, max_attendees, current_attendees, event_date, location, venue')
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

    // 15% platform fee, 85% to organizer (MOBILE_PRICING_MODEL_UPDATE.md) — these are the
    // REAL amounts actually charged/settled in the PaymentIntent's own currency (USD for
    // GHS-display tickets), used for platform_revenue bookkeeping and the GHS wallet credit
    // below. They intentionally do NOT feed the ticket record for GHS purchases — see
    // ticketTotalAmountMajor below.
    const platformFeeAmountMajor = Math.round(amountMajor * PLATFORM_FEE_DECIMAL * 100) / 100;
    const organizerAmountMajor = Math.round((amountMajor - platformFeeAmountMajor) * 100) / 100;

    // Tier this purchase was for, if any — set by create-ticket-payment-intent's
    // metadata, not re-derived here, so the ticket record always reflects exactly what
    // was actually charged.
    const tierId = paymentIntent.metadata.tierId || null;
    const usedDiscount = paymentIntent.metadata.usedDiscount === 'true';

    // Ticket records and the buyer-facing email show what the organizer actually priced the
    // ticket at — GHS for GHS purchases (from the PaymentIntent's own metadata, not
    // anything the client sends, since the client isn't a trusted source of the amount),
    // the real charged currency otherwise. This is purely a receipt-display number; the
    // actual money movement (platform_revenue, wallet credit) always uses the real USD
    // amounts above.
    const isGhsDisplay = paymentIntent.metadata.displayCurrency === 'GHS';
    const parsedDisplayTotal = isGhsDisplay ? Number(paymentIntent.metadata.displayTotalAmount) : NaN;
    const ticketCurrency = isGhsDisplay ? 'GHS' : currency.toUpperCase();
    const ticketTotalAmountMajor =
      isGhsDisplay && Number.isFinite(parsedDisplayTotal) ? parsedDisplayTotal : amountMajor;
    const ticketPlatformFeeTotal = Math.round(ticketTotalAmountMajor * PLATFORM_FEE_DECIMAL * 100) / 100;
    const ticketOrganizerTotal = Math.round((ticketTotalAmountMajor - ticketPlatformFeeTotal) * 100) / 100;
    const ticketAmountPerTicket = ticketTotalAmountMajor / quantity;
    const ticketPlatformFeePerTicket = ticketPlatformFeeTotal / quantity;
    const ticketOrganizerPerTicket = ticketOrganizerTotal / quantity;

    // Create ticket records (one per ticket) — store amounts in major units
    const ticketRecords = ticketCodes.map((ticketCode) => ({
      event_id: eventId,
      user_id: user.id,
      ticket_code: ticketCode,
      quantity: 1, // Each record represents one ticket
      amount_paid: Math.round(ticketAmountPerTicket * 100) / 100,
      currency: ticketCurrency,
      payment_intent_id: paymentIntentId,
      purchase_date: new Date().toISOString(),
      status: 'active',
      platform_fee_amount: Math.round(ticketPlatformFeePerTicket * 100) / 100,
      organizer_amount: Math.round(ticketOrganizerPerTicket * 100) / 100,
      payment_method_type: paymentMethodType,
      tier_id: tierId,
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

    // Bump the tier's sold/discount-used counters now that the ticket record exists —
    // done via an atomic RPC (row-locked) rather than a plain update, so two buyers
    // hitting the last ticket or the last discount slot at the same moment can't both
    // succeed past the real limit.
    if (tierId) {
      const { error: tierIncrementError } = await supabaseAdmin.rpc('increment_ticket_tier_sold', {
        p_tier_id: tierId,
        p_quantity: quantity,
        p_used_discount: usedDiscount,
      });
      if (tierIncrementError) {
        console.error('[confirm-ticket-purchase] increment_ticket_tier_sold:', tierIncrementError);
      }
    }

    const platformFeeMinor = Math.round(amountMinor * PLATFORM_FEE_DECIMAL);
    const organizerMinor = amountMinor - platformFeeMinor;
    try {
      const { error: insertPrErr } = await supabaseAdmin.rpc('insert_platform_revenue', {
        p_charge_type: 'event_ticket',
        p_gross_amount: amountMinor,
        p_platform_fee_amount: platformFeeMinor,
        p_platform_fee_percent: PLATFORM_FEE_PERCENT,
        p_creator_payout_amount: organizerMinor,
        p_stripe_payment_intent_id: paymentIntentId,
        p_reference_id: eventId,
        p_creator_user_id: (event as { creator_id?: string }).creator_id ?? null,
        p_currency: currency.toUpperCase(),
        p_payment_method_type: paymentMethodType,
      });
      if (insertPrErr) {
        console.error('[confirm-ticket-purchase] insert_platform_revenue:', insertPrErr);
      }
    } catch (err) {
      console.error('[confirm-ticket-purchase] insert_platform_revenue:', err);
    }

    // GHS-priced tickets are charged to the buyer in USD (Stripe rejects GHS on this
    // platform account) and never go through a Stripe Connect transfer to the organizer —
    // unlike GBP/NGN tickets, which are already paid out directly by Stripe at charge time.
    // So for GHS specifically, credit the organizer's cut to their internal wallet here,
    // tagged distinctly from a tip, so it's withdrawable via the existing (already
    // currency-generic) Fincra payout path.
    if (isGhsDisplay) {
      try {
        const { error: walletError } = await supabaseAdmin.rpc('add_wallet_transaction', {
          user_uuid: event.creator_id,
          transaction_type: 'ticket_sale',
          amount: organizerAmountMajor,
          description: `Ticket sale: ${event.title}`,
          reference_id: paymentIntentId,
          metadata: {
            event_id: eventId,
            tier_id: tierId,
            ticket_id: createdTickets[0]?.id,
            display_currency: 'GHS',
            display_amount: paymentIntent.metadata.displayTotalAmount ?? null,
          },
          p_currency: 'USD',
          p_stripe_payment_intent_id: paymentIntentId,
        });
        if (walletError) {
          console.error('[confirm-ticket-purchase] GHS wallet credit failed:', walletError);
        }
      } catch (walletErr) {
        console.error('[confirm-ticket-purchase] GHS wallet credit threw:', walletErr);
      }
    }

    try {
      await incrementEventTicketSales(supabaseAdmin, eventId, quantity, amountMajor);
      await linkEventPromotionTicketPurchase(supabaseAdmin, user.id, eventId);
    } catch (analyticsErr) {
      console.error('[confirm-ticket-purchase] event analytics:', analyticsErr);
    }

    // Update event attendee count — was previously gated behind `event.max_attendees`
    // being set, so any event with no attendee cap never had its attendee count updated
    // at all, regardless of real ticket sales. Attendance should be tracked either way.
    {
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

    // Notify the organizer a ticket sold. This has never fired for anyone before —
    // confirm-ticket-purchase never wrote to `notifications` at all, and separately
    // 'ticket_sold' wasn't even an allowed value until the CHECK constraint was widened.
    try {
      const { data: buyerProfile } = await supabaseAdmin
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .maybeSingle();
      const buyerName = buyerProfile?.display_name || buyerProfile?.username || 'Someone';

      const notifTitle = `New ticket sold for ${event.title}`;
      const notifBody = `${buyerName} bought a ticket to ${event.title}`;

      const { error: notifInsertError } = await supabaseAdmin.from('notifications').insert({
        user_id: event.creator_id,
        type: 'ticket_sold',
        title: notifTitle,
        body: notifBody,
        related_id: eventId,
        related_type: 'event',
        action_url: `/events/${eventId}`,
        data: { eventId, ticketId: createdTickets[0]?.id },
        read: false,
      });
      if (notifInsertError) {
        console.error('[confirm-ticket-purchase] notification insert:', notifInsertError);
      }

      // Also push to the organizer's device — same pattern as sendQueuedNotifications.
      const { data: organizerProfileForPush } = await supabaseAdmin
        .from('profiles')
        .select('expo_push_token')
        .eq('id', event.creator_id)
        .maybeSingle();
      let organizerPushToken = organizerProfileForPush?.expo_push_token;
      if (!organizerPushToken) {
        const { data: tokenRow } = await supabaseAdmin
          .from('user_push_tokens')
          .select('push_token')
          .eq('user_id', event.creator_id)
          .order('last_used_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        organizerPushToken = tokenRow?.push_token;
      }
      if (organizerPushToken && Expo.isExpoPushToken(organizerPushToken)) {
        await getExpoPushClient().sendPushNotificationsAsync([{
          to: organizerPushToken,
          sound: 'default',
          title: notifTitle,
          body: notifBody,
          data: { type: 'event', eventId, action: 'VIEW_EVENT' },
          channelId: 'events',
          priority: 'high',
        }]);
      }
    } catch (notifErr) {
      console.error('[confirm-ticket-purchase] notification insert threw:', notifErr);
    }

    // Fetch organizer profile details for email. profiles has no full_name/email columns
    // (confirmed live — both 42703) — display_name is the real column, and email only
    // lives on auth.users, so it needs the admin API via the service-role client.
    const { data: organizerProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('id', event.creator_id)
      .single();
    const { data: organizerAuthUser } = await supabaseAdmin.auth.admin.getUserById(event.creator_id);

    // Send ticket confirmation email to buyer
    try {
      // Format amount for display using the ticket's own display currency/amount (GHS for
      // GHS purchases, the real charged currency otherwise) — was previously referencing
      // an undefined `amount` variable (real var is amountMinor), throwing a
      // ReferenceError on every purchase; caught by this try/catch so it never surfaced as
      // a 500, it just silently skipped sending the confirmation email every single time.
      const amountFormatted = ticketTotalAmountMajor.toFixed(2);
      const currencySymbol = ticketCurrency === 'GBP' ? '£' : ticketCurrency === 'GHS' ? '₵' : '₦';

      await SubscriptionEmailService.sendTicketConfirmation({
        userEmail: user.email || '',
        userName: user.user_metadata?.full_name || user.email || 'Ticket Holder',
        eventTitle: event.title,
        eventDate: event.event_date,
        eventLocation: event.location,
        eventVenue: event.venue,
        ticketCodes: ticketCodes,
        quantity: quantity,
        amountPaid: `${currencySymbol}${amountFormatted}`,
        currency: ticketCurrency,
        purchaseDate: new Date().toISOString(),
        paymentIntentId: paymentIntentId,
        organizerName: organizerProfile?.display_name,
        organizerEmail: organizerAuthUser?.user?.email,
      });
    } catch (emailError) {
      // Log email error but don't fail ticket creation
      console.error('Error sending ticket confirmation email:', emailError);
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
        amount_paid: ticketTotalAmountMajor,
        currency: ticketCurrency.toLowerCase(),
        payment_intent_id: ticket.payment_intent_id,
        purchase_date: ticket.purchase_date,
        status: ticket.status,
        platform_fee_amount: ticketPlatformFeeTotal,
        organizer_amount: ticketOrganizerTotal,
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
