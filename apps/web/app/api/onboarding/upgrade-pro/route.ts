import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { stripe, getPriceId } from '@/src/lib/stripe';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('💳 Upgrade Pro API called (onboarding)');

    // Authentication required
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check Stripe is configured
    if (!stripe) {
      console.error('❌ Stripe is not configured');
      return NextResponse.json(
        { success: false, error: 'Payment processing is not available' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { paymentMethodId, period = 'monthly' } = body;

    // Validate required fields - now using payment method ID from Stripe Elements
    if (!paymentMethodId) {
      return NextResponse.json(
        { success: false, error: 'Payment method is required. Please complete the card form.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate period
    if (!['monthly', 'annual'].includes(period)) {
      return NextResponse.json(
        { success: false, error: 'Period must be monthly or annual' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if user already has an active Pro subscription
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('tier', 'pro')
      .eq('status', 'active')
      .maybeSingle();

    if (existingSubscription) {
      return NextResponse.json(
        { success: false, error: 'You already have an active Pro subscription' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    // Retrieve the payment method (already created by Stripe Elements on frontend)
    let paymentMethod;
    try {
      paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (error: any) {
      console.error('❌ Error retrieving payment method:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid payment method. Please try again.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create or retrieve Stripe customer
    let customerId: string;
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .maybeSingle();

    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: paymentMethod.billing_details?.name || profile?.display_name || undefined,
        metadata: {
          userId: user.id,
          source: 'onboarding'
        }
      });
      customerId = customer.id;
    }

    // Attach payment method to customer (if not already attached)
    if (!paymentMethod.customer) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    }

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      }
    });

    // Get price ID for Pro subscription
    const billingCycle = period === 'annual' ? 'yearly' : 'monthly';
    const priceId = getPriceId('pro', billingCycle);

    if (!priceId || priceId.includes('placeholder')) {
      console.error('❌ Stripe price ID not configured');
      return NextResponse.json(
        { success: false, error: 'Subscription pricing is not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Create subscription with immediate payment (NO TRIAL PERIOD)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: user.id,
        source: 'onboarding',
        period: billingCycle
      }
    });

    // Confirm the payment intent to charge immediately
    const invoice = subscription.latest_invoice as Stripe.Invoice;
    if (invoice?.payment_intent) {
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
      
      if (paymentIntent.status === 'requires_confirmation') {
        await stripe.paymentIntents.confirm(paymentIntent.id);
      }
    }

    // Calculate dates
    const subscriptionStartDate = new Date();
    const subscriptionRenewalDate = new Date(subscription.current_period_end * 1000);
    const moneyBackGuaranteeEndDate = new Date(subscriptionStartDate);
    moneyBackGuaranteeEndDate.setDate(moneyBackGuaranteeEndDate.getDate() + 7);

    // Create or update subscription in database
    const { data: dbSubscription, error: dbError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        tier: 'pro',
        status: 'active',
        billing_cycle: billingCycle,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_start_date: subscriptionStartDate.toISOString(),
        subscription_renewal_date: subscriptionRenewalDate.toISOString(),
        subscription_ends_at: subscriptionRenewalDate.toISOString(),
        money_back_guarantee_end_date: moneyBackGuaranteeEndDate.toISOString(),
        money_back_guarantee_eligible: true,
        refund_count: 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Error creating subscription in database:', dbError);
      // Try to cancel Stripe subscription if database update fails
      try {
        await stripe.subscriptions.cancel(subscription.id);
      } catch (cancelError) {
        console.error('❌ Error canceling Stripe subscription:', cancelError);
      }
      return NextResponse.json(
        { success: false, error: 'Failed to create subscription' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Pro subscription created successfully:', {
      userId: user.id,
      subscriptionId: subscription.id,
      customerId: customerId
    });

    // Calculate price in pence (Stripe uses smallest currency unit)
    const price = billingCycle === 'yearly' ? 9900 : 999; // £99.00 or £9.99 in pence

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      customer_id: customerId,
      subscription_start_date: subscriptionStartDate.toISOString(),
      money_back_guarantee_end_date: moneyBackGuaranteeEndDate.toISOString(),
      next_billing_date: subscriptionRenewalDate.toISOString(),
      amount: price,
      currency: 'gbp'
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Error upgrading to Pro:', error);

    // Handle Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json({
        success: false,
        error: 'Card declined',
        error_code: error.code,
        message: error.message || 'Your card was declined. Please try a different payment method.'
      }, { status: 400, headers: corsHeaders });
    }

    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment details',
        error_code: error.code,
        message: error.message || 'Please check your card details and try again.'
      }, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json({
      success: false,
      error: 'Payment processing failed',
      message: error.message || 'An error occurred while processing your payment. Please try again.'
    }, { status: 500, headers: corsHeaders });
  }
}
