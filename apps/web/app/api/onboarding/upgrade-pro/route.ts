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
    const { supabase, user, error: authError, mode } = await getSupabaseRouteClient(request, true);
    
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

    // Check if user already has ANY subscription (not just Pro)
    // We'll update it rather than creating a new one
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('🔍 Existing subscription check:', {
      exists: !!existingSubscription,
      currentTier: existingSubscription?.tier,
      currentStatus: existingSubscription?.status,
      userId: user.id
    });

    // Allow upgrade even if user has existing subscription (upsert will handle it)
    // The upsert will update the existing record

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
    console.log('🔍 Testing user_subscriptions table access for user:', user.id);
    console.log('🔍 Supabase client mode:', mode);
    
    // Try multiple query approaches to diagnose the issue
    let testData: any = null;
    let testError: any = null;
    
    // Test 1: Simple select with just user_id
    const { data: test1, error: error1 } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('user_id', user.id)
      .limit(1);
    
    if (error1) {
      console.error('❌ Test 1 failed (select user_id only):', {
        error: error1,
        code: error1.code,
        message: error1.message,
        details: error1.details,
        hint: error1.hint
      });
      testError = error1;
    } else {
      console.log('✅ Test 1 passed (select user_id only):', test1);
    }
    
    // Test 2: Select all columns
    const { data: test2, error: error2 } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);
    
    if (error2) {
      console.error('❌ Test 2 failed (select *):', {
        error: error2,
        code: error2.code,
        message: error2.message,
        details: error2.details,
        hint: error2.hint
      });
      if (!testError) testError = error2;
    } else {
      console.log('✅ Test 2 passed (select *):', test2);
      testData = test2;
    }
    
    // Test 3: Try without WHERE clause to see table structure
    const { data: test3, error: error3 } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, tier')
      .limit(1);
    
    if (error3) {
      console.error('❌ Test 3 failed (no WHERE clause):', {
        error: error3,
        code: error3.code,
        message: error3.message,
        details: error3.details,
        hint: error3.hint
      });
      if (!testError) testError = error3;
    } else {
      console.log('✅ Test 3 passed (no WHERE clause):', test3);
    }
    
    if (testError) {
      // If any test failed, return detailed error
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database access error',
          message: testError.message || 'Failed to access user_subscriptions table',
          details: testError.details || testError.hint || '',
          code: testError.code,
          debug: {
            test1Error: error1?.message,
            test2Error: error2?.message,
            test3Error: error3?.message
          }
        },
        { status: 500, headers: corsHeaders }
      );
    }
    
    console.log('✅ All table access tests passed, existing subscription:', testData);

    // Use explicit UPDATE instead of upsert to avoid PostgREST/Supabase client issues
    // Since we know the user has a subscription (testData exists), we'll update it
    const subscriptionData = {
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
    };

    let dbSubscription;
    let dbError;

    if (testData && testData.length > 0) {
      // User has existing subscription - Use RPC function to UPDATE (bypasses PostgREST issues)
      console.log('🔄 Updating existing subscription for user:', user.id);
      
      const { data, error } = await supabase.rpc('update_user_subscription_to_pro', {
        p_user_id: user.id,
        p_billing_cycle: billingCycle,
        p_stripe_customer_id: customerId,
        p_stripe_subscription_id: subscription.id,
        p_subscription_start_date: subscriptionStartDate.toISOString(),
        p_subscription_renewal_date: subscriptionRenewalDate.toISOString(),
        p_subscription_ends_at: subscriptionRenewalDate.toISOString(),
        p_money_back_guarantee_end_date: moneyBackGuaranteeEndDate.toISOString()
      });
      
      // RPC returns array, get first element
      dbSubscription = data && data.length > 0 ? data[0] : null;
      dbError = error;
    } else {
      // User doesn't have subscription - INSERT new one
      console.log('➕ Inserting new subscription for user:', user.id);
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          ...subscriptionData
        })
        .select()
        .single();
      
      dbSubscription = data;
      dbError = error;
    }

    if (dbError) {
      console.error('❌ Error saving subscription in database:', {
        error: dbError,
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        userId: user.id,
        subscriptionId: subscription.id,
        operation: testData && testData.length > 0 ? 'UPDATE' : 'INSERT'
      });
      
      // Try to cancel Stripe subscription if database update fails
      try {
        await stripe.subscriptions.cancel(subscription.id);
        console.log('✅ Stripe subscription cancelled due to database error');
      } catch (cancelError) {
        console.error('❌ Error canceling Stripe subscription:', cancelError);
      }
      
      // Provide more detailed error message
      const errorMessage = dbError.message || 'Failed to save subscription';
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
