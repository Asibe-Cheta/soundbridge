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

    // Validate that we have a price ID, not a product ID
    if (priceId.startsWith('prod_')) {
      console.error('❌ Invalid price ID: Product ID provided instead of Price ID', { priceId });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid Stripe configuration',
          error_code: 'invalid_price_id',
          message: `The ${billingCycle} price ID appears to be a product ID (starts with 'prod_') instead of a price ID (should start with 'price_'). Please check your Vercel environment variable STRIPE_PRO_${billingCycle.toUpperCase()}_PRICE_ID and ensure it contains a price ID from your Stripe dashboard.`,
          details: {
            received: priceId,
            expected_format: 'price_xxxxx',
            billing_cycle: billingCycle
          }
        },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!priceId.startsWith('price_')) {
      console.error('❌ Invalid price ID format:', { priceId });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid Stripe price ID format',
          error_code: 'invalid_price_format',
          message: `The price ID format is invalid. Price IDs must start with 'price_'. Please check your Vercel environment variable STRIPE_PRO_${billingCycle.toUpperCase()}_PRICE_ID.`,
          details: {
            received: priceId,
            expected_format: 'price_xxxxx'
          }
        },
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
    
    // Calculate renewal date based on billing cycle
    // Stripe subscriptions always have current_period_end, but we validate it
    let subscriptionRenewalDate: Date;
    if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
      const periodEndTimestamp = subscription.current_period_end * 1000;
      subscriptionRenewalDate = new Date(periodEndTimestamp);
      
      // Validate the date is valid
      if (isNaN(subscriptionRenewalDate.getTime())) {
        console.warn('⚠️ Invalid current_period_end from Stripe, calculating fallback');
        subscriptionRenewalDate = new Date(subscriptionStartDate);
        if (billingCycle === 'yearly') {
          subscriptionRenewalDate.setFullYear(subscriptionRenewalDate.getFullYear() + 1);
        } else {
          subscriptionRenewalDate.setMonth(subscriptionRenewalDate.getMonth() + 1);
        }
      }
    } else {
      // Fallback: calculate based on billing cycle
      subscriptionRenewalDate = new Date(subscriptionStartDate);
      if (billingCycle === 'yearly') {
        subscriptionRenewalDate.setFullYear(subscriptionRenewalDate.getFullYear() + 1);
      } else {
        subscriptionRenewalDate.setMonth(subscriptionRenewalDate.getMonth() + 1);
      }
    }
    
    // Validate all dates before using them
    if (isNaN(subscriptionRenewalDate.getTime())) {
      console.error('❌ Invalid subscriptionRenewalDate calculated');
      return NextResponse.json(
        { success: false, error: 'Payment processing failed', message: 'Invalid time value' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    const moneyBackGuaranteeEndDate = new Date(subscriptionStartDate);
    moneyBackGuaranteeEndDate.setDate(moneyBackGuaranteeEndDate.getDate() + 7);
    
    if (isNaN(moneyBackGuaranteeEndDate.getTime())) {
      console.error('❌ Invalid moneyBackGuaranteeEndDate calculated');
      return NextResponse.json(
        { success: false, error: 'Payment processing failed', message: 'Invalid time value' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Create or update subscription in database
    // First, verify the table structure by trying a simple select
    const { data: testData, error: testError } = await supabase
      .from('user_subscriptions')
      .select('user_id, tier, status')
      .eq('user_id', user.id)
      .limit(1);
    
    if (testError) {
      console.error('❌ Error testing user_subscriptions table access:', {
        error: testError,
        code: testError.code,
        message: testError.message,
        details: testError.details,
        hint: testError.hint
      });
    } else {
      console.log('✅ Table access test successful, existing subscription:', testData);
    }

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
      console.error('❌ Error creating subscription in database:', {
        error: dbError,
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        userId: user.id,
        subscriptionId: subscription.id
      });
      
      // Try to cancel Stripe subscription if database update fails
      try {
        await stripe.subscriptions.cancel(subscription.id);
        console.log('✅ Stripe subscription cancelled due to database error');
      } catch (cancelError) {
        console.error('❌ Error canceling Stripe subscription:', cancelError);
      }
      
      // Provide more detailed error message
      const errorMessage = dbError.message || 'Failed to create subscription';
      const errorDetails = dbError.details || dbError.hint || '';
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create subscription',
          message: errorMessage,
          details: errorDetails,
          code: dbError.code
        },
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
