import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { stripe } from '@/src/lib/stripe';
import { addStripePaymentIntentIdToMetadata } from '@/src/lib/stripe-payment-intent-metadata';
import {
  createStripeCustomerEphemeralKey,
  getOrCreateStripeCustomer,
  paymentIntentCustomerOptions,
  type StripePayerProfile,
} from '@/src/lib/stripe-payment-sheet-customer';
import { PLATFORM_FEE_PERCENT } from '@/src/lib/platform-fees';
import { currencyService } from '@/src/lib/currency-service';
import { pickVerifiedFincraCreatorBankAccount } from '@/src/lib/payouts/sync-fincra-withdrawal-method-from-creator-bank';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

/**
 * POST /api/events/create-ticket-payment-intent
 * Create a Stripe Payment Intent for event ticket purchase with 15% platform fee
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
    const { eventId, quantity = 1, currency, tierId } = body;

    // Validate required fields
    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing required field: eventId' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch event details first to get prices
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        event_date,
        creator_id,
        price_gbp,
        price_ngn,
        price_ghs,
        max_attendees,
        current_attendees,
        country
      `)
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // If a tier was selected, price comes from that tier (with any active discount
    // applied) instead of the event's own price_gbp/price_ngn. Events with no tiers at
    // all are unaffected — tierId is optional and this whole block is skipped for them.
    let tier: {
      id: string;
      price_gbp: number | null;
      price_ngn: number | null;
      price_ghs: number | null;
      quantity_available: number | null;
      quantity_sold: number;
      discount_percent: number | null;
      discount_quantity_limit: number | null;
      discount_quantity_used: number;
    } | null = null;
    if (tierId) {
      const { data: tierRow, error: tierError } = await supabase
        .from('event_ticket_tiers')
        .select(
          'id, event_id, price_gbp, price_ngn, price_ghs, quantity_available, quantity_sold, discount_percent, discount_quantity_limit, discount_quantity_used',
        )
        .eq('id', tierId)
        .single();
      if (tierError || !tierRow || tierRow.event_id !== eventId) {
        return NextResponse.json(
          { error: 'Ticket tier not found for this event' },
          { status: 404, headers: corsHeaders },
        );
      }
      if (tierRow.quantity_available != null && tierRow.quantity_sold + quantity > tierRow.quantity_available) {
        return NextResponse.json(
          { error: 'Not enough tickets remaining at this tier' },
          { status: 400, headers: corsHeaders },
        );
      }
      tier = tierRow;
    }

    // Determine currency based on event's country or user preference
    // If currency provided in request, use that; otherwise, use event's primary currency
    let validCurrency: string;
    if (currency) {
      validCurrency = currency.toUpperCase();
      if (!['GBP', 'NGN', 'GHS'].includes(validCurrency)) {
        return NextResponse.json(
          { error: 'Invalid currency. Must be GBP, NGN, or GHS' },
          { status: 400, headers: corsHeaders }
        );
      }
    } else if (tier) {
      validCurrency = tier.price_gbp && tier.price_gbp > 0
        ? 'GBP'
        : tier.price_ngn && tier.price_ngn > 0
        ? 'NGN'
        : 'GHS';
    } else {
      // Default to GBP if event has GBP price, then NGN, then GHS
      validCurrency = event.price_gbp && event.price_gbp > 0
        ? 'GBP'
        : event.price_ngn && event.price_ngn > 0
        ? 'NGN'
        : 'GHS';
    }

    // Get price from the tier (if selected) or the event, based on currency
    const priceField = (source: { price_gbp: number | null; price_ngn: number | null; price_ghs: number | null }) =>
      validCurrency === 'GBP' ? source.price_gbp : validCurrency === 'NGN' ? source.price_ngn : source.price_ghs;
    const standardPrice = (tier ? priceField(tier) : priceField(event)) || 0;

    const discountActive =
      !!tier &&
      tier.discount_percent != null &&
      tier.discount_quantity_limit != null &&
      tier.discount_quantity_used < tier.discount_quantity_limit;

    const ticketPrice = discountActive
      ? Math.round(standardPrice * (1 - tier!.discount_percent! / 100) * 100) / 100
      : standardPrice;

    if (ticketPrice <= 0) {
      return NextResponse.json(
        { error: `Event does not have a valid price for ${validCurrency}` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify event has tickets available (if max_attendees is set)
    if (event.max_attendees && event.current_attendees >= event.max_attendees) {
      return NextResponse.json(
        { error: 'Event is sold out' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if event has capacity for requested quantity
    if (event.max_attendees && (event.current_attendees + quantity) > event.max_attendees) {
      return NextResponse.json(
        { error: `Only ${event.max_attendees - event.current_attendees} tickets remaining` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Must use the service-role client here, not the buyer's own RLS-scoped `supabase` —
    // creator_bank_accounts RLS only allows a row's owner to read it, so a buyer's request
    // querying the ORGANIZER's row got 0 rows back every time, regardless of currency or
    // verification status. Confirmed directly: an anon-key read of a real verified
    // organizer's row returned "0 rows" despite the row genuinely existing and being
    // verified — this was firing the generic "has not set up payment account" error for
    // every ticket purchase attempt, on every event, not just currency-mismatched ones.
    const serviceClient = createServiceClient();

    // GHS tickets don't use a Stripe Connect transfer at all — Stripe's UK-registered
    // platform account rejects GHS outright, so the buyer is charged in USD instead (below)
    // and the organizer's cut is credited to their internal wallet, from which the existing
    // Fincra payout path converts and pays out in GHS. So the payout-account requirement
    // here is a verified GHS Fincra bank account, not a Stripe Connect account.
    let stripeAccountId: string | null = null;
    if (validCurrency === 'GHS') {
      const { data: bankRows } = await serviceClient
        .from('creator_bank_accounts')
        .select('stripe_account_id, is_verified, currency, updated_at')
        .eq('user_id', event.creator_id);
      const ghsBank = pickVerifiedFincraCreatorBankAccount(
        (bankRows ?? []).filter((r) => String(r.currency || '').toUpperCase() === 'GHS'),
      );
      if (!ghsBank) {
        return NextResponse.json(
          {
            error:
              'Event organizer has not connected a verified GHS payout account. Please contact event organizer.',
          },
          { status: 400, headers: corsHeaders }
        );
      }
    } else {
      const { data: bankAccount } = await serviceClient
        .from('creator_bank_accounts')
        .select('stripe_account_id, is_verified, currency')
        .eq('user_id', event.creator_id)
        .single();

      stripeAccountId = bankAccount?.stripe_account_id ?? null;

      if (!stripeAccountId) {
        return NextResponse.json(
          { error: 'Event organizer has not set up payment account. Please contact event organizer.' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Verify Stripe account is verified (if bank account record exists)
      if (bankAccount && !bankAccount.is_verified) {
        return NextResponse.json(
          { error: 'Event organizer payment account is not verified. Please contact event organizer.' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Stripe (GBP/EUR/USD) and Fincra (NGN/GHS/KES) are separate providers — a Stripe
      // Connect account registered for one currency cannot receive a transfer in another.
      // creator_bank_accounts.currency records which one the organizer actually connected;
      // catching a mismatch here up front avoids a confusing generic Stripe error later and
      // tells the ORGANIZER (not the buyer, who can't act on this) what's actually wrong.
      if (bankAccount?.currency && bankAccount.currency.toUpperCase() !== validCurrency) {
        const symbols: Record<string, string> = { GBP: '£', NGN: '₦' };
        const ticketSymbol = symbols[validCurrency] || validCurrency;
        const accountCurrency = bankAccount.currency.toUpperCase();
        const accountSymbol = symbols[accountCurrency] || accountCurrency;
        return NextResponse.json(
          {
            error: `This event's ticket price is in ${ticketSymbol} (${validCurrency}), but the event organizer's connected payment account only supports ${accountSymbol} (${accountCurrency}). The organizer needs to update the event's ticket price currency or connect a ${validCurrency}-compatible payment account before tickets can be sold for this event.`,
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Initialize Stripe
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();

    const payer: StripePayerProfile = {
      soundbridgeUserId: user.id,
      email: user.email,
      displayName: buyerProfile?.display_name ?? (user.user_metadata as { full_name?: string })?.full_name,
    };

    let customerId: string | null = null;
    let ephemeral_key_secret: string | null = null;
    if (payer.email) {
      const customer = await getOrCreateStripeCustomer(stripe, payer);
      if (customer?.id) {
        customerId = customer.id;
        ephemeral_key_secret = await createStripeCustomerEphemeralKey(stripe, customer.id);
      }
    }

    // GHS is display-only for Stripe purposes: the buyer is actually charged in USD
    // (Stripe rejects GHS on this platform account), converted from the organizer's GHS
    // price via the same live-rate currencyService the Fincra payout path already uses.
    const isGhsDisplay = validCurrency === 'GHS';
    const chargeCurrency = isGhsDisplay ? 'USD' : validCurrency;
    const displayTotalAmountMajor = isGhsDisplay ? Math.round(ticketPrice * quantity * 100) / 100 : null;
    const chargeTicketPrice = isGhsDisplay
      ? await currencyService.convertCurrency(ticketPrice, 'GHS', 'USD')
      : ticketPrice;

    // Calculate total amount and fees
    // Amount stored in smallest currency unit (pence for GBP, kobo for NGN, cents for USD)
    const amountPerTicket = Math.round(chargeTicketPrice * 100);
    const totalAmount = amountPerTicket * quantity;

    // Platform fee: 15% of total amount (MOBILE_PRICING_MODEL_UPDATE.md)
    const platformFeeAmount = Math.round(totalAmount * 0.15);

    // Organizer receives: 85% of total amount
    const organizerAmount = totalAmount - platformFeeAmount;

    // GHS tickets skip the Stripe Connect transfer (no Connect destination — organizer is
    // paid via the wallet + existing Fincra payout path instead, wired up in
    // confirm-ticket-purchase once the charge succeeds).
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: chargeCurrency.toLowerCase(),
      ...(isGhsDisplay
        ? {}
        : {
            application_fee_amount: platformFeeAmount,
            transfer_data: { destination: stripeAccountId! },
          }),
      automatic_payment_methods: { enabled: true },
      ...(customerId ? paymentIntentCustomerOptions(customerId) : {}),
      metadata: {
        eventId: eventId,
        userId: user.id,
        quantity: quantity.toString(),
        platformFeePercentage: String(PLATFORM_FEE_PERCENT),
        ticketPrice: chargeTicketPrice.toString(),
        currency: chargeCurrency,
        charge_type: 'event_ticket',
        platform_fee_amount: String(platformFeeAmount),
        platform_fee_percent: String(PLATFORM_FEE_PERCENT),
        creator_payout_amount: String(organizerAmount),
        reference_id: eventId,
        ...(tier ? { tierId: tier.id, usedDiscount: String(discountActive) } : {}),
        creator_user_id: (event as { creator_id?: string }).creator_id ?? '',
        ...(isGhsDisplay
          ? { displayCurrency: 'GHS', displayTicketPrice: ticketPrice.toString(), displayTotalAmount: String(displayTotalAmountMajor) }
          : {}),
      },
      description: `${quantity}x ticket(s) for ${event.title}`,
      receipt_email: user.email || undefined,
    });
    await addStripePaymentIntentIdToMetadata(stripe, paymentIntent.id, (paymentIntent.metadata ?? {}) as Record<string, string>);

    return NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret,
        stripe_client_secret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        currency: chargeCurrency.toLowerCase(),
        ...(isGhsDisplay ? { displayCurrency: 'GHS', displayAmount: displayTotalAmountMajor } : {}),
        ...(customerId && ephemeral_key_secret
          ? { customer_id: customerId, ephemeral_key_secret }
          : {}),
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error creating ticket payment intent:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create payment intent',
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
