import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tier, billingCycle = 'monthly' } = body;

    // Validate tier
    if (tier !== 'pro') {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Validate billing cycle
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 });
    }

    // Calculate subscription end date
    const now = new Date();
    const subscriptionEndsAt = new Date(now);
    
    if (billingCycle === 'monthly') {
      subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
    } else {
      subscriptionEndsAt.setFullYear(subscriptionEndsAt.getFullYear() + 1);
    }

    // First, cancel any existing active subscription
    await supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Create new subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        tier,
        status: 'active',
        billing_cycle: billingCycle,
        subscription_ends_at: subscriptionEndsAt.toISOString()
      })
      .select()
      .single();

    if (subError) {
      console.error('Error creating subscription:', subError);
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }

    // Log premium feature usage
    await supabase
      .from('premium_feature_usage')
      .insert({
        user_id: user.id,
        feature_name: 'subscription_upgrade',
        usage_count: 1
      });

    // Calculate pricing (GBP - updated per TIER_RESTRUCTURE.md)
    const pricing = {
      pro: {
        monthly: 9.99,
        yearly: 99.99 // £99.99/year
      }
    };

    const price = pricing[tier as keyof typeof pricing][billingCycle as keyof typeof pricing['pro']];

    // Set subscription start date for 7-day money-back guarantee
    const subscriptionStartDate = new Date();
    const subscriptionRenewalDate = new Date(subscriptionEndsAt);
    const moneyBackGuaranteeEndDate = new Date(subscriptionStartDate);
    moneyBackGuaranteeEndDate.setDate(moneyBackGuaranteeEndDate.getDate() + 7);

    // Update subscription with start date, renewal date, and money-back guarantee end date
    await supabase
      .from('user_subscriptions')
      .update({
        subscription_start_date: subscriptionStartDate.toISOString(),
        subscription_renewal_date: subscriptionRenewalDate.toISOString(),
        money_back_guarantee_end_date: moneyBackGuaranteeEndDate.toISOString()
      })
      .eq('id', subscription.id);

    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          ...subscription,
          subscription_start_date: subscriptionStartDate.toISOString(),
          subscription_renewal_date: subscriptionRenewalDate.toISOString(),
          money_back_guarantee_end_date: moneyBackGuaranteeEndDate.toISOString()
        },
        pricing: {
          tier,
          billingCycle,
          price,
          currency: 'GBP',
          nextBillingDate: subscriptionEndsAt.toISOString()
        },
        message: `Successfully upgraded to ${tier} ${billingCycle} plan!`,
        moneyBackGuarantee: {
          eligible: true,
          windowDays: 7,
          endDate: moneyBackGuaranteeEndDate.toISOString(),
          message: '7-day money-back guarantee - full refund if not satisfied'
        }
      }
    });

  } catch (error) {
    console.error('Subscription upgrade error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
